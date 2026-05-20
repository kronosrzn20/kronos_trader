"""
API REST + WebSocket para el agente de trading Forex.
Expone los datos de MetaTrader 5 a aplicaciones externas (Electron, web, etc.).

Endpoints REST:
    GET  /account          — Info de cuenta MT5
    GET  /signal/{symbol}  — Señal actual con indicadores
    GET  /history          — Últimas 20 operaciones cerradas
    POST /trade            — Ejecutar orden manual
    GET  /price/{symbol}   — Precio bid/ask en vivo

WebSocket:
    WS   /ws/live          — Stream en vivo cada 5 segundos

Uso:
    python api.py
    uvicorn api:app --reload --port 8000
"""

import asyncio
import json
from contextlib import asynccontextmanager
from datetime import datetime, timezone

import MetaTrader5 as mt5
import pandas as pd
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import mt5_connector as mt5c
import indicators   as ind
import risk_manager as rm
from dotenv import load_dotenv
import os

load_dotenv()

SIMBOLO_DEFAULT  = os.getenv("SIMBOLO", "EURUSD")
TEMPORALIDAD     = os.getenv("TEMPORALIDAD", "M15")
N_VELAS          = int(os.getenv("VELAS_HISTORICAS", 200))
SIMBOLOS_DEFAULT = ["EURUSD", "GBPUSD", "USDJPY"]


# ── Estado de conexión ────────────────────────────────────────────────────────

_mt5_conectado: bool = False


def _verificar_conexion() -> None:
    """Lanza HTTPException 503 si MT5 no está conectado."""
    if not _mt5_conectado:
        raise HTTPException(
            status_code=503,
            detail="MetaTrader 5 no está conectado. Verifica que MT5 esté abierto y reinicia la API.",
        )


# ── Gestor de ciclo de vida ───────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Conecta MT5 al iniciar y lo cierra al apagar la API."""
    global _mt5_conectado
    print("\n[API] Iniciando servidor forex-agent...")
    _mt5_conectado = await asyncio.to_thread(mt5c.conectar)
    if _mt5_conectado:
        print("[API] Conexion con MT5 establecida. API lista.")
    else:
        print("[API] ADVERTENCIA: No se pudo conectar a MT5. Los endpoints retornaran error 503.")
    yield
    print("[API] Cerrando conexion con MT5...")
    await asyncio.to_thread(mt5c.desconectar)


# ── Aplicación FastAPI ────────────────────────────────────────────────────────

app = FastAPI(
    title="Forex Agent API",
    description="API para trading algorítmico en Forex con MetaTrader 5",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "app://.",          # Electron production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Modelos Pydantic ──────────────────────────────────────────────────────────

class TradeRequest(BaseModel):
    symbol: str   = Field(default="EURUSD", description="Par de divisas")
    type:   str   = Field(...,              description="'BUY' o 'SELL'")
    lot:    float = Field(..., gt=0,        description="Tamaño en lotes")
    sl:     float | None = Field(default=None, description="Stop loss absoluto (opcional)")
    tp:     float | None = Field(default=None, description="Take profit absoluto (opcional)")


# ── Helpers internos ──────────────────────────────────────────────────────────

def _analizar_simbolo(simbolo: str) -> dict:
    """Obtiene velas, calcula indicadores y retorna la señal para un símbolo."""
    df  = mt5c.obtener_velas(simbolo, TEMPORALIDAD, N_VELAS)
    df  = ind.calcular_indicadores(df)
    return ind.obtener_senal(df)


def _ts_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ── Endpoints REST ────────────────────────────────────────────────────────────

@app.get("/account", summary="Información de la cuenta MT5")
async def get_account():
    """Retorna balance, equity, margen libre y apalancamiento de la cuenta."""
    _verificar_conexion()
    info = await asyncio.to_thread(mt5.account_info)
    if info is None:
        raise HTTPException(status_code=500, detail="No se pudo obtener la info de cuenta.")
    return {
        "login":        info.login,
        "servidor":     info.server,
        "moneda":       info.currency,
        "balance":      round(info.balance, 2),
        "equity":       round(info.equity, 2),
        "margen":       round(info.margin, 2),
        "margen_libre": round(info.margin_free, 2),
        "apalancamiento": info.leverage,
        "timestamp":    _ts_now(),
    }


@app.get("/signal/{symbol}", summary="Señal de trading para un símbolo")
async def get_signal(symbol: str):
    """
    Calcula EMA 20/50/200, RSI 14 y ATR 14 para el símbolo indicado
    y retorna la señal actual (COMPRA / VENTA / NEUTRAL).
    """
    _verificar_conexion()
    symbol = symbol.upper()
    try:
        info = await asyncio.to_thread(_analizar_simbolo, symbol)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    senal  = info["señal"]
    precio = info["precio_cierre"]
    atr    = info["atr_14"]
    mult_sl = float(os.getenv("MULTIPLICADOR_ATR_SL", 1.5))
    mult_tp = float(os.getenv("MULTIPLICADOR_ATR_TP", 3.0))

    if senal == "COMPRA":
        sl_precio = round(precio - atr * mult_sl, 5)
        tp_precio = round(precio + atr * mult_tp, 5)
    elif senal == "VENTA":
        sl_precio = round(precio + atr * mult_sl, 5)
        tp_precio = round(precio - atr * mult_tp, 5)
    else:
        sl_precio = None
        tp_precio = None

    return {
        "symbol":    symbol,
        "señal":     senal,
        "precio":    precio,
        "sl_precio": sl_precio,
        "tp_precio": tp_precio,
        "indicadores": {
            "ema20":  info["ema_20"],
            "ema50":  info["ema_50"],
            "ema200": info["ema_200"],
            "rsi":    info["rsi_14"],
            "atr":    atr,
        },
        "temporalidad": TEMPORALIDAD,
        "timestamp":    _ts_now(),
    }


@app.get("/positions", summary="Posiciones abiertas actualmente en MT5")
async def get_positions():
    """Retorna todas las posiciones abiertas con P&L flotante en tiempo real."""
    _verificar_conexion()

    def _fetch():
        positions = mt5.positions_get()
        tick_cache = {}
        result = []
        for p in (positions or []):
            # Obtener precio actual para calcular P&L flotante
            if p.symbol not in tick_cache:
                tick_cache[p.symbol] = mt5.symbol_info_tick(p.symbol)
            tick = tick_cache[p.symbol]

            precio_actual = tick.bid if p.type == 0 else tick.ask  # BUY cierra en bid, SELL en ask
            tipo = "BUY" if p.type == 0 else "SELL"

            result.append({
                "ticket":        p.ticket,
                "symbol":        p.symbol,
                "tipo":          tipo,
                "lotes":         p.volume,
                "precio_entrada": round(p.price_open, 5),
                "precio_actual":  round(precio_actual, 5),
                "sl":            round(p.sl, 5) if p.sl else None,
                "tp":            round(p.tp, 5) if p.tp else None,
                "profit":        round(p.profit, 2),
                "swap":          round(p.swap, 2),
                "tiempo":        datetime.fromtimestamp(p.time, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "comentario":    p.comment,
                "magic":         p.magic,
            })
        return result

    posiciones = await asyncio.to_thread(_fetch)
    profit_total = round(sum(p["profit"] + p["swap"] for p in posiciones), 2)

    return {
        "total":         len(posiciones),
        "profit_total":  profit_total,
        "posiciones":    posiciones,
        "timestamp":     _ts_now(),
    }


@app.get("/history", summary="Últimas 20 operaciones cerradas")
async def get_history():
    """Retorna las últimas 20 operaciones cerradas desde el historial de MT5."""
    _verificar_conexion()

    def _fetch():
        from datetime import timedelta
        desde = datetime.now() - timedelta(days=90)
        deals = mt5.history_deals_get(desde, datetime.now())
        return deals

    deals = await asyncio.to_thread(_fetch)

    if deals is None:
        raise HTTPException(status_code=500, detail="No se pudo obtener el historial.")

    # TradeDeal no tiene sl/tp — solo TradePosition los tiene
    # entry=1 = entrada al mercado, entry=2 = salida (cierre)
    operaciones = [
        {
            "ticket":    d.ticket,
            "symbol":    d.symbol,
            "tipo":      "BUY" if d.type == 0 else "SELL",
            "lotes":     d.volume,
            "precio":    d.price,
            "profit":    round(d.profit, 2),
            "comision":  round(d.commission, 2),
            "swap":      round(d.swap, 2),
            "tiempo":    datetime.fromtimestamp(d.time, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "comentario": d.comment,
        }
        for d in deals
        if d.symbol != ""   # excluir movimientos de balance/depósito
    ]

    # Más recientes primero, limitar a 20
    operaciones = sorted(operaciones, key=lambda x: x["tiempo"], reverse=True)[:20]

    return {
        "total":       len(operaciones),
        "operaciones": operaciones,
        "timestamp":   _ts_now(),
    }


@app.post("/trade", summary="Ejecutar una orden manual")
async def post_trade(body: TradeRequest):
    """
    Ejecuta una orden de mercado en MT5.

    Si no se proporcionan `sl` y `tp`, se calculan automáticamente
    usando ATR × multiplicadores definidos en `.env`.
    """
    _verificar_conexion()

    symbol    = body.symbol.upper()
    direccion = body.type.upper()

    if direccion not in ("BUY", "SELL"):
        raise HTTPException(status_code=422, detail="El campo 'type' debe ser 'BUY' o 'SELL'.")

    try:
        # Calcular SL/TP automáticamente si no se envían
        sl, tp = body.sl, body.tp
        if sl is None or tp is None:
            info   = await asyncio.to_thread(_analizar_simbolo, symbol)
            precio = await asyncio.to_thread(mt5c.obtener_precio_actual, symbol)
            entrada = precio["ask"] if direccion == "BUY" else precio["bid"]
            niveles = rm.calcular_sl_tp(entrada, info["atr_14"], direccion)
            sl = sl or niveles["stop_loss"]
            tp = tp or niveles["take_profit"]

        resultado = await asyncio.to_thread(
            mt5c.ejecutar_orden,
            symbol, direccion, body.lot, sl, tp,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not resultado["exito"]:
        raise HTTPException(
            status_code=400,
            detail=f"Orden rechazada por MT5. Código: {resultado.get('codigo')}",
        )

    return {
        "exito":     True,
        "ticket":    resultado["ticket"],
        "symbol":    symbol,
        "tipo":      direccion,
        "lotes":     resultado["lotes"],
        "precio":    resultado["precio"],
        "sl":        sl,
        "tp":        tp,
        "timestamp": _ts_now(),
    }


@app.get("/candles/{symbol}", summary="Datos OHLCV + EMA20/EMA50 para el gráfico")
async def get_candles(symbol: str, tf: str = "M15", count: int = 200):
    """
    Retorna velas OHLCV junto con series EMA20 y EMA50 en el formato
    que espera lightweight-charts (time en Unix segundos UTC).
    """
    _verificar_conexion()
    symbol = symbol.upper()

    def _fetch():
        df     = mt5c.obtener_velas(symbol, tf, count)
        df_ind = ind.calcular_indicadores(df)
        return df, df_ind

    try:
        df, df_ind = await asyncio.to_thread(_fetch)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Timestamps: pandas Timestamps son UTC-naive; .value da nanosegundos epoch → segundos
    candles = [
        {
            "time":  int(ts.value // 10**9),
            "open":  float(row["open"]),
            "high":  float(row["high"]),
            "low":   float(row["low"]),
            "close": float(row["close"]),
        }
        for ts, row in df.iterrows()
    ]

    ema20 = [
        {"time": int(ts.value // 10**9), "value": round(float(row["ema_20"]), 5)}
        for ts, row in df_ind.iterrows()
        if not pd.isna(row["ema_20"])
    ]

    ema50 = [
        {"time": int(ts.value // 10**9), "value": round(float(row["ema_50"]), 5)}
        for ts, row in df_ind.iterrows()
        if not pd.isna(row["ema_50"])
    ]

    return {
        "symbol":  symbol,
        "candles": candles,
        "ema20":   ema20,
        "ema50":   ema50,
        "count":   len(candles),
    }


# ── Config store en memoria ───────────────────────────────────────────────────

_config_store: dict = {}

# ── Credenciales MT5 ──────────────────────────────────────────────────────────

CREDENTIALS_FILE = os.path.join(os.path.dirname(__file__), "mt5_credentials.json")


def _load_credentials() -> dict:
    """Lee credenciales desde JSON local; si no existe, usa las del .env."""
    if os.path.exists(CREDENTIALS_FILE):
        with open(CREDENTIALS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "login":    int(os.getenv("MT5_LOGIN", 0)),
        "password": os.getenv("MT5_PASSWORD", ""),
        "server":   os.getenv("MT5_SERVER", ""),
    }


class MT5ConfigRequest(BaseModel):
    login:    int           = Field(...,    description="Número de cuenta MT5")
    password: str | None   = Field(None,   description="Contraseña (opcional si ya está guardada)")
    server:   str           = Field(...,    description="Nombre del servidor del broker")


@app.get("/mt5-config", summary="Obtener credenciales MT5 actuales (contraseña enmascarada)")
async def get_mt5_config():
    creds = _load_credentials()
    return {
        "login":        creds.get("login", ""),
        "server":       creds.get("server", ""),
        "password_set": bool(creds.get("password")),
        "fuente":       "archivo" if os.path.exists(CREDENTIALS_FILE) else ".env",
    }


@app.post("/mt5-config", summary="Guardar credenciales MT5 y reconectar")
async def post_mt5_config(body: MT5ConfigRequest):
    """
    Guarda las credenciales en mt5_credentials.json y reconecta MT5.
    La contraseña se guarda en texto plano en el archivo local — úsalo solo en equipos de confianza.
    """
    global _mt5_conectado

    # Si no se envía password, conservar el que ya estaba guardado
    existing = _load_credentials()
    password = body.password if body.password else existing.get("password", "")

    creds = {"login": body.login, "password": password, "server": body.server}
    with open(CREDENTIALS_FILE, "w", encoding="utf-8") as f:
        json.dump(creds, f, indent=2)

    # Actualizar variables de entorno para que conectar() las lea
    os.environ["MT5_LOGIN"]    = str(body.login)
    os.environ["MT5_PASSWORD"] = password
    os.environ["MT5_SERVER"]   = body.server

    # Reconectar
    await asyncio.to_thread(mt5c.desconectar)
    _mt5_conectado = await asyncio.to_thread(mt5c.conectar)

    if _mt5_conectado:
        print(f"[MT5-Config] Reconectado con cuenta {body.login} en {body.server}")
        return {"ok": True, "mensaje": f"Conectado a cuenta {body.login} en {body.server}"}
    else:
        return {"ok": False, "mensaje": "Credenciales guardadas pero no se pudo conectar. Verifica los datos."}


@app.post("/reconnect", summary="Reconectar MT5 con las credenciales actuales")
async def post_reconnect():
    """Fuerza una reconexión a MT5 usando las credenciales guardadas."""
    global _mt5_conectado
    await asyncio.to_thread(mt5c.desconectar)
    _mt5_conectado = await asyncio.to_thread(mt5c.conectar)
    return {
        "ok":      _mt5_conectado,
        "mensaje": "Reconectado correctamente" if _mt5_conectado else "No se pudo reconectar a MT5",
    }


class ConfigRequest(BaseModel):
    simbolo:      str   = Field(default="EURUSD")
    temporalidad: str   = Field(default="M15")
    riesgo:       float = Field(default=1.0)
    mult_sl:      float = Field(default=1.5)
    mult_tp:      float = Field(default=3.0)
    auto_trade:   bool  = Field(default=False)
    llm_enabled:  bool  = Field(default=False)
    solo_londres: bool  = Field(default=False)


@app.post("/config", summary="Guardar configuración del agente")
async def post_config(body: ConfigRequest):
    """Persiste la configuración en memoria y actualiza las variables de entorno del proceso."""
    global _config_store
    _config_store = body.model_dump()

    # Actualizar variables de entorno del proceso para que el agente las use
    os.environ["SIMBOLO"]              = body.simbolo
    os.environ["TEMPORALIDAD"]         = body.temporalidad
    os.environ["RIESGO_POR_TRADE"]     = str(body.riesgo)
    os.environ["MULTIPLICADOR_ATR_SL"] = str(body.mult_sl)
    os.environ["MULTIPLICADOR_ATR_TP"] = str(body.mult_tp)

    print(f"[Config] Nueva configuración: {_config_store}")
    return {"ok": True, "config": _config_store}


@app.get("/config", summary="Obtener configuración actual")
async def get_config():
    """Retorna la configuración activa del agente."""
    return _config_store if _config_store else {
        "simbolo": os.getenv("SIMBOLO", "EURUSD"),
        "temporalidad": os.getenv("TEMPORALIDAD", "M15"),
        "riesgo": float(os.getenv("RIESGO_POR_TRADE", 1.0)),
        "mult_sl": float(os.getenv("MULTIPLICADOR_ATR_SL", 1.5)),
        "mult_tp": float(os.getenv("MULTIPLICADOR_ATR_TP", 3.0)),
        "auto_trade": False,
        "llm_enabled": False,
        "solo_londres": False,
    }


@app.get("/price/{symbol}", summary="Precio bid/ask en tiempo real")
async def get_price(symbol: str):
    """Retorna el precio actual de bid, ask y spread en pips para el símbolo."""
    _verificar_conexion()
    symbol = symbol.upper()
    try:
        precio = await asyncio.to_thread(mt5c.obtener_precio_actual, symbol)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "symbol":    symbol,
        "bid":       precio["bid"],
        "ask":       precio["ask"],
        "spread":    precio["spread"],
        "timestamp": _ts_now(),
    }


# ── WebSocket — stream en vivo ────────────────────────────────────────────────

class GestorConexiones:
    """Mantiene la lista de clientes WebSocket activos y gestiona el broadcast."""

    def __init__(self):
        self._clientes: list[WebSocket] = []

    async def conectar(self, ws: WebSocket):
        await ws.accept()
        self._clientes.append(ws)
        print(f"[WS] Cliente conectado. Total: {len(self._clientes)}")

    def desconectar(self, ws: WebSocket):
        if ws in self._clientes:
            self._clientes.remove(ws)
        print(f"[WS] Cliente desconectado. Total: {len(self._clientes)}")

    async def broadcast(self, mensaje: dict):
        """Envía el mensaje a todos los clientes conectados, descarta los caídos."""
        caidos = []
        payload = json.dumps(mensaje, ensure_ascii=False)
        for cliente in self._clientes:
            try:
                await cliente.send_text(payload)
            except Exception:
                caidos.append(cliente)
        for c in caidos:
            self.desconectar(c)

    @property
    def hay_clientes(self) -> bool:
        return len(self._clientes) > 0


gestor_ws = GestorConexiones()
_tarea_live: asyncio.Task | None = None


async def _loop_live():
    """
    Tarea de fondo: cada 5 segundos obtiene precio + señal del símbolo
    por defecto y hace broadcast a todos los clientes WebSocket.
    """
    global _mt5_conectado
    simbolo = SIMBOLO_DEFAULT

    while True:
        await asyncio.sleep(5)

        if not gestor_ws.hay_clientes or not _mt5_conectado:
            continue

        try:
            precio = await asyncio.to_thread(mt5c.obtener_precio_actual, simbolo)
            info   = await asyncio.to_thread(_analizar_simbolo, simbolo)

            mensaje = {
                "price": {
                    "bid":    precio["bid"],
                    "ask":    precio["ask"],
                    "spread": precio["spread"],
                },
                "signal": info["señal"],
                "indicators": {
                    "ema20":  info["ema_20"],
                    "ema50":  info["ema_50"],
                    "ema200": info["ema_200"],
                    "rsi":    info["rsi_14"],
                    "atr":    info["atr_14"],
                },
                "symbol":    simbolo,
                "timestamp": _ts_now(),
            }
            await gestor_ws.broadcast(mensaje)

        except Exception as e:
            print(f"[WS] Error en loop live: {e}")
            error_msg = {"error": str(e), "timestamp": _ts_now()}
            await gestor_ws.broadcast(error_msg)


@app.on_event("startup")
async def iniciar_loop_ws():
    global _tarea_live
    _tarea_live = asyncio.create_task(_loop_live())


@app.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    """
    WebSocket en vivo: emite cada 5 segundos el precio y la señal del símbolo
    configurado en .env (por defecto EURUSD).

    Mensaje de bienvenida inmediato al conectar.
    """
    await gestor_ws.conectar(ws)

    # Enviar snapshot inmediato al conectar (sin esperar 5 s)
    if _mt5_conectado:
        try:
            precio = await asyncio.to_thread(mt5c.obtener_precio_actual, SIMBOLO_DEFAULT)
            info   = await asyncio.to_thread(_analizar_simbolo, SIMBOLO_DEFAULT)
            bienvenida = {
                "price": {
                    "bid":    precio["bid"],
                    "ask":    precio["ask"],
                    "spread": precio["spread"],
                },
                "signal": info["señal"],
                "indicators": {
                    "ema20":  info["ema_20"],
                    "ema50":  info["ema_50"],
                    "ema200": info["ema_200"],
                    "rsi":    info["rsi_14"],
                    "atr":    info["atr_14"],
                },
                "symbol":    SIMBOLO_DEFAULT,
                "timestamp": _ts_now(),
            }
            await ws.send_text(json.dumps(bienvenida, ensure_ascii=False))
        except Exception as e:
            await ws.send_text(json.dumps({"error": str(e), "timestamp": _ts_now()}))
    else:
        await ws.send_text(json.dumps({
            "error":     "MT5 no conectado",
            "timestamp": _ts_now(),
        }))

    try:
        # Mantener la conexión abierta y recibir mensajes del cliente (ping/pong)
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        gestor_ws.desconectar(ws)


# ── Punto de entrada ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )
