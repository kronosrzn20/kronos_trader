"""
Módulo de conexión con MetaTrader 5.
Gestiona la conexión, obtención de datos de mercado y ejecución de órdenes.
"""

import MetaTrader5 as mt5
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

# Mapa de temporalidades string -> constante MT5
TEMPORALIDADES = {
    "M1":  mt5.TIMEFRAME_M1,
    "M5":  mt5.TIMEFRAME_M5,
    "M15": mt5.TIMEFRAME_M15,
    "M30": mt5.TIMEFRAME_M30,
    "H1":  mt5.TIMEFRAME_H1,
    "H4":  mt5.TIMEFRAME_H4,
    "D1":  mt5.TIMEFRAME_D1,
}


def conectar() -> bool:
    """Inicializa y autentica la conexión con MetaTrader 5."""
    login    = int(os.getenv("MT5_LOGIN", 0))
    password = os.getenv("MT5_PASSWORD", "")
    server   = os.getenv("MT5_SERVER", "")

    print("🔌 Iniciando conexión con MetaTrader 5...")

    if not mt5.initialize():
        print(f"❌ Error al inicializar MT5: {mt5.last_error()}")
        return False

    autorizado = mt5.login(login=login, password=password, server=server)
    if not autorizado:
        print(f"❌ Error de autenticación en MT5: {mt5.last_error()}")
        mt5.shutdown()
        return False

    info = mt5.account_info()
    print(f"✅ Conexión exitosa | Cuenta: {info.login} | Servidor: {info.server}")
    print(f"   Balance: {info.balance:.2f} {info.currency} | "
          f"Equity: {info.equity:.2f} | Apalancamiento: 1:{info.leverage}")
    return True


def desconectar() -> None:
    """Cierra la conexión con MetaTrader 5."""
    mt5.shutdown()
    print("🔌 Conexión con MT5 cerrada.")


def obtener_velas(simbolo: str, temporalidad: str, cantidad: int) -> pd.DataFrame:
    """
    Descarga velas históricas de MT5 y las devuelve como DataFrame.

    Args:
        simbolo:      Par de divisas, ej. 'EURUSD'.
        temporalidad: Cadena de texto, ej. 'M15'.
        cantidad:     Número de velas a obtener.

    Returns:
        DataFrame con columnas OHLCV e índice temporal.
    """
    tf = TEMPORALIDADES.get(temporalidad.upper())
    if tf is None:
        raise ValueError(f"Temporalidad '{temporalidad}' no reconocida. "
                         f"Opciones: {list(TEMPORALIDADES.keys())}")

    print(f"📊 Descargando {cantidad} velas de {simbolo} [{temporalidad}]...")
    rates = mt5.copy_rates_from_pos(simbolo, tf, 0, cantidad)

    if rates is None or len(rates) == 0:
        raise RuntimeError(f"No se pudieron obtener velas para {simbolo}: {mt5.last_error()}")

    df = pd.DataFrame(rates)
    df["time"] = pd.to_datetime(df["time"], unit="s")
    df.set_index("time", inplace=True)
    df.rename(columns={
        "open":        "open",
        "high":        "high",
        "low":         "low",
        "close":       "close",
        "tick_volume": "volume",
    }, inplace=True)
    df = df[["open", "high", "low", "close", "volume"]]

    print(f"   ✅ {len(df)} velas cargadas | "
          f"Desde: {df.index[0]} | Hasta: {df.index[-1]}")
    return df


def obtener_precio_actual(simbolo: str) -> dict:
    """
    Obtiene el precio actual de bid y ask para el símbolo indicado.

    Returns:
        Diccionario con claves 'bid', 'ask' y 'spread'.
    """
    tick = mt5.symbol_info_tick(simbolo)
    if tick is None:
        raise RuntimeError(f"No se pudo obtener el tick de {simbolo}: {mt5.last_error()}")

    info = mt5.symbol_info(simbolo)
    # Spread en puntos: funciona para cualquier símbolo (forex, oro, índices, etc.)
    # Para pares de 5 dígitos (EURUSD): 1 pip = 10 points
    # Para oro (XAUUSD, 2 dígitos): spread se muestra en puntos directamente
    point  = info.point if info else 0.00001
    spread = round((tick.ask - tick.bid) / point, 1)

    return {
        "bid":    tick.bid,
        "ask":    tick.ask,
        "spread": spread,
        "digits": info.digits if info else 5,
        "point":  point,
    }


def ejecutar_orden(
    simbolo: str,
    direccion: str,
    lotes: float,
    stop_loss: float,
    take_profit: float,
    comentario: str = "forex-agent",
) -> dict:
    """
    Envía una orden de mercado a MT5.

    Args:
        simbolo:     Par de divisas.
        direccion:   'BUY' o 'SELL'.
        lotes:       Tamaño de la posición en lotes.
        stop_loss:   Precio absoluto del stop loss.
        take_profit: Precio absoluto del take profit.
        comentario:  Etiqueta de la orden.

    Returns:
        Diccionario con el resultado de la operación.
    """
    direccion = direccion.upper()
    if direccion not in ("BUY", "SELL"):
        raise ValueError("La dirección debe ser 'BUY' o 'SELL'.")

    tipo    = mt5.ORDER_TYPE_BUY  if direccion == "BUY" else mt5.ORDER_TYPE_SELL
    precio  = mt5.symbol_info_tick(simbolo).ask if direccion == "BUY" \
              else mt5.symbol_info_tick(simbolo).bid

    solicitud = {
        "action":       mt5.TRADE_ACTION_DEAL,
        "symbol":       simbolo,
        "volume":       round(lotes, 2),
        "type":         tipo,
        "price":        precio,
        "sl":           round(stop_loss, 5),
        "tp":           round(take_profit, 5),
        "deviation":    10,
        "magic":        202400,
        "comment":      comentario,
        "type_time":    mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    print(f"\n📤 Enviando orden {direccion} {lotes:.2f} lotes de {simbolo}...")
    print(f"   Precio: {precio} | SL: {stop_loss:.5f} | TP: {take_profit:.5f}")

    resultado = mt5.order_send(solicitud)

    if resultado is None or resultado.retcode != mt5.TRADE_RETCODE_DONE:
        codigo = resultado.retcode if resultado else "None"
        print(f"❌ Error al enviar la orden. Código: {codigo}")
        return {"exito": False, "codigo": codigo, "resultado": resultado}

    print(f"✅ Orden ejecutada | Ticket: {resultado.order} | "
          f"Precio real: {resultado.price}")
    return {
        "exito":   True,
        "ticket":  resultado.order,
        "precio":  resultado.price,
        "lotes":   resultado.volume,
        "resultado": resultado,
    }
