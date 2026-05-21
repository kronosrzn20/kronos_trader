"""
Motor de análisis Smart Money Concepts (SMC) para XAUUSD (Oro).

Detecta:
  - Sesgo DXY (vía yfinance, ticker DX=F)
  - Swing Highs / Lows
  - CHoCH (Change of Character) y BOS (Break of Structure)
  - Order Blocks (zonas institucionales de oferta/demanda)
  - FVG (Fair Value Gap — ineficiencias de precio)
  - Equal Highs / Lows (zonas de liquidez)
  - Sesión de trading activa (Londres / Nueva York)
  - Divergencia SMT entre XAUUSD y XAGUSD

Estrategia:
  Gold/USD sigue una correlación inversa con el DXY.
  La señal se genera solo si hay confluencia de al menos 4/6 condiciones.
"""

import os
import numpy as np
import pandas as pd
from datetime import datetime, timezone
import MetaTrader5 as mt5
from dotenv import load_dotenv

load_dotenv()

# Nombres de símbolos configurables — varían según el broker
# XM usa "GOLD" y "SILVER"; otros brokers usan "XAUUSD" y "XAGUSD"
GOLD_SYMBOL   = os.getenv("MT5_GOLD_SYMBOL",   "GOLD")
SILVER_SYMBOL = os.getenv("MT5_SILVER_SYMBOL", "SILVER")


# ── Configuración ───────────────────────────────────────────────────────────────

SWING_BARS   = 5      # Barras a cada lado para definir un swing H/L
OB_LOOKBACK  = 60     # Velas hacia atrás para buscar Order Blocks
FVG_LOOKBACK = 60     # Velas hacia atrás para buscar FVG
EQ_TOLERANCE = 0.0015 # Tolerancia 0.15% para Equal Highs/Lows

LONDON_START = 7      # UTC — apertura Londres
LONDON_END   = 16     # UTC — cierre Londres
NY_START     = 12     # UTC — apertura Nueva York
NY_END       = 21     # UTC — cierre Nueva York

MIN_CONFLUENCIAS = 4  # Mínimo de condiciones para generar señal


# ── Obtener velas desde MT5 ────────────────────────────────────────────────────

_TF_MAP = {
    "M1":  mt5.TIMEFRAME_M1,  "M5":  mt5.TIMEFRAME_M5,
    "M15": mt5.TIMEFRAME_M15, "M30": mt5.TIMEFRAME_M30,
    "H1":  mt5.TIMEFRAME_H1,  "H4":  mt5.TIMEFRAME_H4,
    "D1":  mt5.TIMEFRAME_D1,
}

def _get_candles(symbol: str, tf_str: str, n: int) -> pd.DataFrame:
    tf = _TF_MAP.get(tf_str.upper(), mt5.TIMEFRAME_M15)
    mt5.symbol_select(symbol, True)   # activar en Market Watch si no está
    rates = mt5.copy_rates_from_pos(symbol, tf, 0, n)
    if rates is None or len(rates) == 0:
        raise RuntimeError(f"No se pudieron obtener velas de {symbol} ({tf_str})")
    df = pd.DataFrame(rates)
    df["time"] = pd.to_datetime(df["time"], unit="s", utc=True)
    return df.rename(columns={
        "open": "o", "high": "h", "low": "l",
        "close": "c", "tick_volume": "vol",
    })


# ── Sesgo DXY (US Dollar Index) ────────────────────────────────────────────────

def obtener_sesgo_dxy() -> dict:
    """
    Descarga datos del DXY (DX=F) desde Yahoo Finance y calcula el sesgo.
    DXY alcista → Oro bajista, DXY bajista → Oro alcista.
    """
    try:
        import yfinance as yf
        hist = yf.Ticker("DX=F").history(period="2d", interval="1h")
        if hist.empty:
            return {"sesgo": "NEUTRAL", "valor": None, "cambio_pct": 0, "fuente": "sin datos"}

        close  = hist["Close"]
        ultimo = float(close.iloc[-1])
        ref    = float(close.iloc[-9]) if len(close) >= 9 else float(close.iloc[0])
        cambio = (ultimo - ref) / ref * 100

        if cambio > 0.1:
            sesgo = "ALCISTA"
        elif cambio < -0.1:
            sesgo = "BAJISTA"
        else:
            sesgo = "NEUTRAL"

        return {
            "sesgo":      sesgo,
            "valor":      round(ultimo, 2),
            "cambio_pct": round(cambio, 3),
            "fuente":     "yfinance (DX=F)",
        }
    except Exception as e:
        return {"sesgo": "NEUTRAL", "valor": None, "cambio_pct": 0, "fuente": f"error: {e}"}


# ── Swing Highs / Lows ─────────────────────────────────────────────────────────

def detectar_swings(df: pd.DataFrame, n: int = SWING_BARS) -> pd.DataFrame:
    """Marca swing highs y swing lows. Un SH/SL tiene el H/L más extremo en ±n velas."""
    df    = df.copy()
    highs = df["h"].values
    lows  = df["l"].values
    size  = len(df)

    sh = np.zeros(size, dtype=bool)
    sl = np.zeros(size, dtype=bool)

    for i in range(n, size - n):
        window_h = highs[i - n : i + n + 1]
        window_l = lows[i - n : i + n + 1]
        if highs[i] == window_h.max():
            sh[i] = True
        if lows[i] == window_l.min():
            sl[i] = True

    df["swing_high"] = sh
    df["swing_low"]  = sl
    return df


# ── Estructura de Mercado: CHoCH / BOS ────────────────────────────────────────

def detectar_estructura(df: pd.DataFrame) -> dict:
    """
    Detecta la última ruptura de estructura (CHoCH o BOS) en M15.
    - CHoCH: cambio de carácter (contra-tendencia)
    - BOS: continuación de tendencia
    """
    df_s = detectar_swings(df)

    swing_highs = df_s[df_s["swing_high"]].tail(6)
    swing_lows  = df_s[df_s["swing_low"]].tail(6)

    if len(swing_highs) < 2 or len(swing_lows) < 2:
        return {"tipo": None, "direccion": "NEUTRAL", "nivel": None, "descripcion": "Datos insuficientes"}

    last_sh     = swing_highs.iloc[-1]
    last_sl     = swing_lows.iloc[-1]
    last_sh_idx = swing_highs.index[-1]
    last_sl_idx = swing_lows.index[-1]

    precio_actual = float(df["c"].iloc[-1])
    ult_high      = float(df["h"].iloc[-1])
    ult_low       = float(df["l"].iloc[-1])

    # Tendencia alcista: el último swing low vino después del último swing high
    if last_sl_idx > last_sh_idx:
        if ult_low < float(last_sl["l"]):
            return {
                "tipo":        "CHoCH",
                "direccion":   "BAJISTA",
                "nivel":       round(float(last_sl["l"]), 2),
                "descripcion": "CHoCH bajista: el precio rompió el último mínimo significativo, señal de cambio de tendencia",
            }
        prev_sh = swing_highs.iloc[-2]
        if ult_high > float(prev_sh["h"]):
            return {
                "tipo":        "BOS",
                "direccion":   "ALCISTA",
                "nivel":       round(float(prev_sh["h"]), 2),
                "descripcion": "BOS alcista: el precio superó el máximo anterior, tendencia alcista continúa",
            }
    else:
        # Tendencia bajista: el último swing high vino después del último swing low
        if ult_high > float(last_sh["h"]):
            return {
                "tipo":        "CHoCH",
                "direccion":   "ALCISTA",
                "nivel":       round(float(last_sh["h"]), 2),
                "descripcion": "CHoCH alcista: el precio rompió el último máximo significativo, señal de cambio de tendencia",
            }
        prev_sl = swing_lows.iloc[-2]
        if ult_low < float(prev_sl["l"]):
            return {
                "tipo":        "BOS",
                "direccion":   "BAJISTA",
                "nivel":       round(float(prev_sl["l"]), 2),
                "descripcion": "BOS bajista: el precio rompió el mínimo anterior, tendencia bajista continúa",
            }

    return {"tipo": None, "direccion": "NEUTRAL", "nivel": None, "descripcion": "Sin ruptura de estructura reciente"}


# ── Order Blocks ───────────────────────────────────────────────────────────────

def detectar_order_blocks(df: pd.DataFrame, n: int = OB_LOOKBACK) -> list:
    """
    Detecta Order Blocks institucionales.
    Bearish OB: última vela alcista antes de un impulso bajista fuerte.
    Bullish OB: última vela bajista antes de un impulso alcista fuerte.
    """
    df_r = df.tail(n).reset_index(drop=True)
    rango_medio = float(df_r["h"].mean() - df_r["l"].mean())
    umbral      = rango_medio * 1.5  # Impulso mínimo significativo

    obs = []
    for i in range(1, len(df_r) - 4):
        fut_up   = float(df_r["c"].iloc[i + 1 : i + 5].max()) - float(df_r["c"].iloc[i])
        fut_down = float(df_r["c"].iloc[i]) - float(df_r["c"].iloc[i + 1 : i + 5].min())

        # Bearish OB: vela alcista seguida de impulso bajista fuerte
        if df_r["c"].iloc[i] > df_r["o"].iloc[i] and fut_down > umbral:
            obs.append({
                "tipo":     "BEARISH",
                "alto":     round(float(df_r["h"].iloc[i]), 2),
                "bajo":     round(float(df_r["l"].iloc[i]), 2),
                "mitad":    round(float((df_r["h"].iloc[i] + df_r["l"].iloc[i]) / 2), 2),
                "tiempo":   str(df_r["time"].iloc[i]),
                "mitigado": float(df_r["h"].iloc[-1]) >= float(df_r["h"].iloc[i]),
            })

        # Bullish OB: vela bajista seguida de impulso alcista fuerte
        elif df_r["c"].iloc[i] < df_r["o"].iloc[i] and fut_up > umbral:
            obs.append({
                "tipo":     "BULLISH",
                "alto":     round(float(df_r["h"].iloc[i]), 2),
                "bajo":     round(float(df_r["l"].iloc[i]), 2),
                "mitad":    round(float((df_r["h"].iloc[i] + df_r["l"].iloc[i]) / 2), 2),
                "tiempo":   str(df_r["time"].iloc[i]),
                "mitigado": float(df_r["l"].iloc[-1]) <= float(df_r["l"].iloc[i]),
            })

    obs.sort(key=lambda x: x["tiempo"], reverse=True)
    return obs[:4]  # Los 4 más recientes


# ── Fair Value Gap (FVG) ───────────────────────────────────────────────────────

def detectar_fvg(df: pd.DataFrame, n: int = FVG_LOOKBACK) -> list:
    """
    Detecta ineficiencias de precio (gaps de 3 velas).
    Bullish FVG:  high[i-1] < low[i+1]  (espacio vacío al alza)
    Bearish FVG:  low[i-1]  > high[i+1] (espacio vacío a la baja)
    """
    df_r    = df.tail(n).reset_index(drop=True)
    avg_rng = float(df_r["h"].mean() - df_r["l"].mean())
    min_gap = avg_rng * 0.3  # Gap mínimo = 30% del rango promedio

    fvgs = []
    for i in range(1, len(df_r) - 1):
        h_prev = float(df_r["h"].iloc[i - 1])
        l_prev = float(df_r["l"].iloc[i - 1])
        h_next = float(df_r["h"].iloc[i + 1])
        l_next = float(df_r["l"].iloc[i + 1])

        # Bullish FVG
        if l_next > h_prev and (l_next - h_prev) > min_gap:
            fvgs.append({
                "tipo":     "BULLISH",
                "superior": round(l_next, 2),
                "inferior": round(h_prev, 2),
                "mitad":    round((l_next + h_prev) / 2, 2),
                "tiempo":   str(df_r["time"].iloc[i]),
                "mitigado": float(df_r["l"].iloc[-1]) <= l_next,
            })

        # Bearish FVG
        elif h_next < l_prev and (l_prev - h_next) > min_gap:
            fvgs.append({
                "tipo":     "BEARISH",
                "superior": round(l_prev, 2),
                "inferior": round(h_next, 2),
                "mitad":    round((l_prev + h_next) / 2, 2),
                "tiempo":   str(df_r["time"].iloc[i]),
                "mitigado": float(df_r["h"].iloc[-1]) >= l_prev,
            })

    fvgs.sort(key=lambda x: x["tiempo"], reverse=True)
    return fvgs[:4]


# ── Equal Highs / Lows ─────────────────────────────────────────────────────────

def detectar_equal_hl(df: pd.DataFrame, tol: float = EQ_TOLERANCE) -> dict:
    """
    Detecta Equal Highs y Equal Lows (zonas de liquidez acumulada).
    El precio tiende a barrer estos niveles antes de moverse en la dirección real.
    """
    df_r  = df.tail(60)
    highs = df_r["h"].values
    lows  = df_r["l"].values

    eq_highs, eq_lows = [], []

    for i in range(len(highs)):
        for j in range(i + 1, len(highs)):
            if abs(highs[i] - highs[j]) / highs[i] < tol:
                nivel = round(float((highs[i] + highs[j]) / 2), 2)
                if nivel not in [x["nivel"] for x in eq_highs]:
                    eq_highs.append({
                        "nivel":       nivel,
                        "descripcion": "Buy-side liquidity (stops de vendedores en corto)",
                    })
            if abs(lows[i] - lows[j]) / (lows[i] + 0.001) < tol:
                nivel = round(float((lows[i] + lows[j]) / 2), 2)
                if nivel not in [x["nivel"] for x in eq_lows]:
                    eq_lows.append({
                        "nivel":       nivel,
                        "descripcion": "Sell-side liquidity (stops de compradores)",
                    })

    return {
        "equal_highs": sorted(eq_highs, key=lambda x: x["nivel"], reverse=True)[:2],
        "equal_lows":  sorted(eq_lows,  key=lambda x: x["nivel"])[:2],
    }


# ── Sesión de trading ──────────────────────────────────────────────────────────

def obtener_sesion_actual() -> dict:
    """Detecta la sesión de trading activa según la hora UTC actual."""
    hora = datetime.now(timezone.utc).hour

    en_londres = LONDON_START <= hora < LONDON_END
    en_ny      = NY_START     <= hora < NY_END
    en_overlap = en_londres and en_ny

    if en_overlap:
        nombre = "Overlap Londres + Nueva York (máxima volatilidad)"
    elif en_ny:
        nombre = "Nueva York"
    elif en_londres:
        nombre = "Londres"
    else:
        nombre = "Asia / Sin sesión activa (baja liquidez)"

    return {
        "sesion":     nombre,
        "hora_utc":   hora,
        "en_londres": en_londres,
        "en_ny":      en_ny,
        "en_overlap": en_overlap,
        "activa":     en_londres or en_ny,
    }


# ── Divergencia SMT (Oro vs Plata) ────────────────────────────────────────────

def detectar_smt_divergencia(df_xau: pd.DataFrame) -> dict:
    """
    Compara la estructura de máximos entre XAUUSD y XAGUSD.
    Si el oro hace un máximo mayor pero la plata no (o viceversa), es trampa de liquidez.
    """
    try:
        df_xag   = _get_candles(SILVER_SYMBOL, "M15", 60)
        df_xau_s = detectar_swings(df_xau.tail(60).reset_index(drop=True))
        df_xag_s = detectar_swings(df_xag)

        sh_xau = df_xau_s[df_xau_s["swing_high"]]["h"]
        sh_xag = df_xag_s[df_xag_s["swing_high"]]["h"]
        sl_xau = df_xau_s[df_xau_s["swing_low"]]["l"]
        sl_xag = df_xag_s[df_xag_s["swing_low"]]["l"]

        if len(sh_xau) < 2 or len(sh_xag) < 2:
            return {"divergencia": False, "tipo": None, "descripcion": "Datos insuficientes para SMT"}

        xau_sh_sube = sh_xau.iloc[-1] > sh_xau.iloc[-2]
        xag_sh_sube = sh_xag.iloc[-1] > sh_xag.iloc[-2]
        xau_sl_baja = (sl_xau.iloc[-1] < sl_xau.iloc[-2]) if len(sl_xau) >= 2 else False
        xag_sl_baja = (sl_xag.iloc[-1] < sl_xag.iloc[-2]) if len(sl_xag) >= 2 else False

        if xau_sh_sube and not xag_sh_sube:
            return {
                "divergencia": True,
                "tipo":        "BEARISH",
                "descripcion": "Oro hace máximo mayor pero Plata no confirma → posible trampa alcista (SMT Bearish)",
            }
        if not xau_sh_sube and xag_sh_sube:
            return {
                "divergencia": True,
                "tipo":        "BULLISH_WEAK",
                "descripcion": "Plata sube más fuerte que Oro → debilidad en el impulso del oro",
            }
        if xau_sl_baja and not xag_sl_baja:
            return {
                "divergencia": True,
                "tipo":        "BULLISH",
                "descripcion": "Oro hace mínimo menor pero Plata no confirma → posible trampa bajista (SMT Bullish)",
            }

        return {"divergencia": False, "tipo": None, "descripcion": "Sin divergencia SMT — Oro y Plata alineados"}

    except Exception as e:
        return {"divergencia": False, "tipo": None, "descripcion": f"XAGUSD no disponible: {e}"}


# ── ATR (Average True Range) ───────────────────────────────────────────────────

def calcular_atr(df: pd.DataFrame, period: int = 14) -> float:
    tr = pd.concat([
        df["h"] - df["l"],
        (df["h"] - df["c"].shift()).abs(),
        (df["l"] - df["c"].shift()).abs(),
    ], axis=1).max(axis=1)
    return float(tr.rolling(period).mean().iloc[-1])


# ── Calendario Económico (ForexFactory JSON) ──────────────────────────────────

_CAL_CACHE: dict = {"data": None, "ts": 0, "fecha": ""}
_CAL_TTL = 3600  # 1 hora — el calendario cambia poco durante el día

def obtener_calendario_economico() -> list:
    """
    Obtiene los eventos económicos de la semana actual desde el feed JSON de
    ForexFactory (nfs.faireconomy.media).

    Filtra:
      - Moneda: USD + EUR (ambas impactan directamente al oro vía DXY)
      - Impacto: High para EUR, High+Medium para USD
      - Solo eventos de hoy (fecha actual UTC)

    Retorna lista de eventos con: título, hora, pronóstico, anterior y resultado.
    El resultado se cachea 1 hora para evitar rate-limiting.
    """
    import requests
    import time
    from datetime import date

    hoy = date.today().isoformat()
    ahora = time.time()

    # Devolver caché si sigue vigente Y es del mismo día
    if (_CAL_CACHE["data"] is not None
            and (ahora - _CAL_CACHE["ts"]) < _CAL_TTL
            and _CAL_CACHE["fecha"] == hoy):
        return _CAL_CACHE["data"]

    url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"

    try:
        resp = requests.get(
            url, timeout=10,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                ),
                "Accept": "application/json",
            }
        )
        if resp.status_code == 429:
            # Rate limited — devolver caché antigua si existe, si no lista vacía
            return _CAL_CACHE["data"] or [{"moneda": "—", "titulo": "Calendario no disponible (límite de peticiones)", "hora_utc": "—", "pronostico": "—", "anterior": "—", "resultado": "—", "impacto": "—"}]
        resp.raise_for_status()
        eventos = resp.json()

        # Solo USD (Estados Unidos):
        # - High impact: NFP, CPI, PCE, FOMC, PIB, Ventas Minoristas, etc.
        # - Medium impact: también incluido — discursos del presidente de la Fed
        #   (Powell, FOMC Members) suelen clasificarse como medium pero mueven el mercado.
        # Palabras clave para detectar discursos de la Fed aunque sean "medium":
        FED_KEYWORDS = {"fed", "fomc", "powell", "federal reserve", "chair"}

        eventos_hoy = []
        for ev in eventos:
            if ev.get("country", "").upper() != "USD":
                continue

            titulo  = ev.get("title", "").lower()
            impacto = ev.get("impact", "").lower()
            fecha_ev = ev.get("date", "")[:10]

            if fecha_ev != hoy:
                continue

            # Incluir: alto impacto siempre, o medio impacto si es discurso de la Fed
            es_fed = any(kw in titulo for kw in FED_KEYWORDS)
            if impacto == "high" or (impacto == "medium" and es_fed):
                eventos_hoy.append({
                    "moneda":     "USD",
                    "titulo":     ev.get("title", ""),
                    "hora_utc":   ev.get("date", "")[11:16],
                    "pronostico": ev.get("forecast") or "—",
                    "anterior":   ev.get("previous") or "—",
                    "resultado":  ev.get("actual") or "Pendiente",
                    "impacto":    impacto.upper(),
                })

        # Guardar en caché
        _CAL_CACHE["data"]  = eventos_hoy
        _CAL_CACHE["ts"]    = ahora
        _CAL_CACHE["fecha"] = hoy
        return eventos_hoy

    except Exception as e:
        return [{"moneda": "—", "titulo": f"Error al obtener calendario: {e}", "hora_utc": "—", "pronostico": "—", "anterior": "—", "resultado": "—", "impacto": "—"}]


# ── Contexto Macro (VIX + S&P 500) ───────────────────────────────────────────

def obtener_contexto_macro() -> dict:
    """
    Obtiene datos macro complementarios para el análisis fundamental:
    - VIX (miedo del mercado) → alto VIX = refugio → alcista para oro
    - S&P 500 (apetito de riesgo) → SPX sube = menor refugio → bajista para oro
    """
    try:
        import yfinance as yf

        vix_hist = yf.Ticker("^VIX").history(period="2d", interval="1h")
        spx_hist = yf.Ticker("^GSPC").history(period="2d", interval="1h")

        resultado = {}

        if not vix_hist.empty:
            vix_val    = float(vix_hist["Close"].iloc[-1])
            vix_antes  = float(vix_hist["Close"].iloc[-9]) if len(vix_hist) >= 9 else vix_val
            vix_cambio = (vix_val - vix_antes) / vix_antes * 100
            # VIX alto (>20) → miedo → alcista para oro
            vix_sesgo  = "ALCISTA" if vix_val > 20 else "BAJISTA" if vix_val < 15 else "NEUTRAL"
            resultado["vix"] = {
                "valor":      round(vix_val, 2),
                "cambio_pct": round(vix_cambio, 2),
                "sesgo_oro":  vix_sesgo,
                "descripcion": (
                    f"VIX en {vix_val:.1f} — {'Mercado con miedo, oro como refugio' if vix_val > 20 else 'Mercado tranquilo, menos refugio' if vix_val < 15 else 'VIX neutral'}"
                ),
            }

        if not spx_hist.empty:
            spx_val    = float(spx_hist["Close"].iloc[-1])
            spx_antes  = float(spx_hist["Close"].iloc[-9]) if len(spx_hist) >= 9 else spx_val
            spx_cambio = (spx_val - spx_antes) / spx_antes * 100
            # SPX subiendo → riesgo ON → bajista para oro
            spx_sesgo  = "BAJISTA" if spx_cambio > 0.5 else "ALCISTA" if spx_cambio < -0.5 else "NEUTRAL"
            resultado["spx"] = {
                "valor":      round(spx_val, 2),
                "cambio_pct": round(spx_cambio, 3),
                "sesgo_oro":  spx_sesgo,
                "descripcion": (
                    f"S&P 500 {'subiendo' if spx_cambio > 0 else 'bajando'} {abs(spx_cambio):.2f}% → "
                    f"{'apetito de riesgo activo, menos presión sobre el oro' if spx_cambio > 0.5 else 'caída en bolsas, flujo hacia refugio' if spx_cambio < -0.5 else 'bolsas neutrales'}"
                ),
            }

        return resultado

    except Exception as e:
        return {"error": str(e)}


# ── Lotes para XAUUSD ─────────────────────────────────────────────────────────

def calcular_lotes_xauusd(precio: float, sl: float) -> dict:
    """
    Calcula el tamaño de lote para XAUUSD basado en el riesgo definido en .env.

    XAUUSD: 1 lote estándar = 100 oz.
    Cuando el precio se mueve $1, el P&L cambia $100 por lote.
    Fórmula: lotes = (balance × riesgo%) / (distancia_SL_en_$ × 100)
    """
    import os
    riesgo_pct = float(os.getenv("RIESGO_POR_TRADE", 1.0))

    info_cuenta = mt5.account_info()
    if info_cuenta is None:
        return {"lotes": 0.01, "dinero_en_riesgo": 0, "balance": 0, "sl_distancia": 0}

    balance          = info_cuenta.balance
    dinero_en_riesgo = balance * (riesgo_pct / 100)
    sl_distancia     = abs(precio - sl) if sl else 5.0  # $5 por defecto

    # 1 lote XAUUSD → $100 por cada $1 de movimiento
    lotes_raw = dinero_en_riesgo / (sl_distancia * 100)

    sym = mt5.symbol_info(GOLD_SYMBOL)
    if sym:
        paso   = sym.volume_step
        lotes  = max(sym.volume_min, round(lotes_raw / paso) * paso)
        lotes  = min(lotes, sym.volume_max)
    else:
        lotes = max(0.01, round(lotes_raw, 2))

    return {
        "lotes":            round(float(lotes), 2),
        "dinero_en_riesgo": round(dinero_en_riesgo, 2),
        "balance":          round(balance, 2),
        "sl_distancia":     round(sl_distancia, 2),
        "riesgo_pct":       riesgo_pct,
    }


# ── Función Principal ──────────────────────────────────────────────────────────

def calcular_senal_smc() -> dict:
    """
    Análisis SMC completo para XAUUSD.
    Combina DXY, estructura de mercado, Order Blocks, FVG, liquidez y SMT.
    Retorna señal (COMPRA / VENTA / NEUTRAL) con todos los detalles.
    """
    df_m15 = _get_candles(GOLD_SYMBOL, "M15", 250)

    precio = float(df_m15["c"].iloc[-1])
    atr    = calcular_atr(df_m15)

    # ── Contexto macro (VIX + SPX) ──────────────────────────────────────────────
    macro      = obtener_contexto_macro()
    calendario = obtener_calendario_economico()

    # ── 1. Sesgo DXY ────────────────────────────────────────────────────────────
    dxy        = obtener_sesgo_dxy()
    sesgo_xau  = ("BAJISTA" if dxy["sesgo"] == "ALCISTA"
                  else "ALCISTA" if dxy["sesgo"] == "BAJISTA"
                  else "NEUTRAL")

    # ── 2. Estructura ───────────────────────────────────────────────────────────
    estructura = detectar_estructura(df_m15)

    # ── 3. Order Blocks ─────────────────────────────────────────────────────────
    obs         = detectar_order_blocks(df_m15)
    bearish_obs = [ob for ob in obs if ob["tipo"] == "BEARISH"]
    bullish_obs = [ob for ob in obs if ob["tipo"] == "BULLISH"]

    en_bearish_ob = any(ob["bajo"] <= precio <= ob["alto"] for ob in bearish_obs)
    en_bullish_ob = any(ob["bajo"] <= precio <= ob["alto"] for ob in bullish_obs)

    # ── 4. FVG ──────────────────────────────────────────────────────────────────
    fvgs          = detectar_fvg(df_m15)
    bearish_fvgs  = [f for f in fvgs if f["tipo"] == "BEARISH"]
    bullish_fvgs  = [f for f in fvgs if f["tipo"] == "BULLISH"]

    en_bearish_fvg = any(f["inferior"] <= precio <= f["superior"] for f in bearish_fvgs)
    en_bullish_fvg = any(f["inferior"] <= precio <= f["superior"] for f in bullish_fvgs)

    # ── 5. Sesión ────────────────────────────────────────────────────────────────
    sesion = obtener_sesion_actual()

    # ── 6. Liquidez ─────────────────────────────────────────────────────────────
    liquidez = detectar_equal_hl(df_m15)

    # ── 7. SMT Divergencia ───────────────────────────────────────────────────────
    smt = detectar_smt_divergencia(df_m15)

    # ── Puntuación de confluencias ───────────────────────────────────────────────
    p_compra = 0.0
    p_venta  = 0.0

    if sesgo_xau == "ALCISTA": p_compra += 2
    if sesgo_xau == "BAJISTA": p_venta  += 2

    # Bonus/penalización macro
    vix_sesgo = macro.get("vix", {}).get("sesgo_oro", "NEUTRAL")
    spx_sesgo = macro.get("spx", {}).get("sesgo_oro", "NEUTRAL")
    if vix_sesgo == "ALCISTA": p_compra += 0.5
    if vix_sesgo == "BAJISTA": p_venta  += 0.5
    if spx_sesgo == "ALCISTA": p_compra += 0.5
    if spx_sesgo == "BAJISTA": p_venta  += 0.5

    if estructura["tipo"] in ("CHoCH", "BOS"):
        if estructura["direccion"] == "ALCISTA": p_compra += 2
        if estructura["direccion"] == "BAJISTA": p_venta  += 2

    if en_bullish_ob:  p_compra += 2
    if en_bearish_ob:  p_venta  += 2

    if en_bullish_fvg: p_compra += 1
    if en_bearish_fvg: p_venta  += 1

    if sesion["activa"]:
        p_compra += 0.5
        p_venta  += 0.5

    # Penalización SMT
    if smt["divergencia"] and smt["tipo"] == "BEARISH":  p_compra -= 1.5
    if smt["divergencia"] and smt["tipo"] == "BULLISH":  p_venta  -= 1.5

    # ── Señal ────────────────────────────────────────────────────────────────────
    if p_compra >= MIN_CONFLUENCIAS and p_compra > p_venta:
        senal = "COMPRA"
        # SL: debajo del bullish OB más cercano (+ buffer de $0.50)
        ob_ref = bullish_obs[0]["bajo"] if bullish_obs else precio
        sl     = round(min(ob_ref - 0.50, precio - atr * 2.5), 2)
        tp1    = round(precio + atr * 3.0, 2)
        tp2    = round(precio + atr * 5.0, 2)
        tp3    = round(precio + atr * 8.0, 2)

    elif p_venta >= MIN_CONFLUENCIAS and p_venta > p_compra:
        senal = "VENTA"
        # SL: encima del bearish OB más cercano (+ buffer de $0.50)
        ob_ref = bearish_obs[0]["alto"] if bearish_obs else precio
        sl     = round(max(ob_ref + 0.50, precio + atr * 2.5), 2)
        tp1    = round(precio - atr * 3.0, 2)
        tp2    = round(precio - atr * 5.0, 2)
        tp3    = round(precio - atr * 8.0, 2)

    else:
        senal = "NEUTRAL"
        sl = tp1 = tp2 = tp3 = None

    # ── Cálculo de lotes ─────────────────────────────────────────────────────────
    lotes_info = calcular_lotes_xauusd(precio, sl) if sl else {
        "lotes": 0.01, "dinero_en_riesgo": 0, "balance": 0, "sl_distancia": 0, "riesgo_pct": 1.0
    }

    # ── Checklist de confluencias ─────────────────────────────────────────────
    checklist = [
        {
            "nombre":   "Sesgo fundamental (DXY)",
            "cumplida": sesgo_xau != "NEUTRAL",
            "valor":    f"DXY {dxy['sesgo']} ({dxy['valor']}) → Oro esperado: {sesgo_xau}",
        },
        {
            "nombre":   "Estructura de mercado (CHoCH / BOS)",
            "cumplida": estructura["tipo"] is not None,
            "valor":    estructura.get("descripcion", "Sin estructura detectada"),
        },
        {
            "nombre":   "Order Block activo",
            "cumplida": en_bullish_ob or en_bearish_ob,
            "valor":    (f"Precio dentro de OB {'alcista' if en_bullish_ob else 'bajista'}"
                         if (en_bullish_ob or en_bearish_ob)
                         else "Precio fuera de zonas OB"),
        },
        {
            "nombre":   "Fair Value Gap (FVG)",
            "cumplida": en_bullish_fvg or en_bearish_fvg,
            "valor":    (f"FVG {'alcista' if en_bullish_fvg else 'bajista'} en precio actual"
                         if (en_bullish_fvg or en_bearish_fvg)
                         else "Sin FVG en precio actual"),
        },
        {
            "nombre":   "Sesión activa (Londres / NY)",
            "cumplida": sesion["activa"],
            "valor":    sesion["sesion"],
        },
        {
            "nombre":   "Sin divergencia SMT (Oro ≈ Plata)",
            "cumplida": not smt["divergencia"],
            "valor":    smt["descripcion"],
        },
    ]

    confluencias_ok = sum(1 for c in checklist if c["cumplida"])

    return {
        "senal":               senal,
        "mt5_symbol":          GOLD_SYMBOL,   # nombre real en MT5 (GOLD, XAUUSD, etc.)
        "precio":              round(precio, 2),
        "atr":                 round(atr, 2),
        "sl":                  sl,
        "tp1":                 tp1,
        "tp2":                 tp2,
        "tp3":                 tp3,
        "lotes":               lotes_info,
        "confluencias_ok":     confluencias_ok,
        "total_confluencias":  len(checklist),
        "puntos_compra":       round(p_compra, 1),
        "puntos_venta":        round(p_venta, 1),
        "checklist":           checklist,
        "dxy":                 dxy,
        "sesgo_macro":         sesgo_xau,
        "macro":               macro,
        "estructura":          estructura,
        "order_blocks":        obs[:4],
        "fvgs":                fvgs[:4],
        "liquidez":            liquidez,
        "sesion":              sesion,
        "smt":                 smt,
        "calendario":          calendario,
        "timestamp":           datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
