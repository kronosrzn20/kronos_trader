"""
Módulo de indicadores técnicos.
Calcula EMA 20/50/200, RSI 14 y ATR 14 usando pandas y numpy puro
(sin pandas-ta ni numba, compatible con Python 3.14+).
"""

import pandas as pd
import numpy as np


# ── Funciones de cálculo ──────────────────────────────────────────────────────

def _ema(series: pd.Series, length: int) -> pd.Series:
    """Media móvil exponencial."""
    return series.ewm(span=length, adjust=False).mean()


def _rsi(series: pd.Series, length: int = 14) -> pd.Series:
    """RSI usando el método de Wilder (EMA de pérdidas y ganancias)."""
    delta  = series.diff()
    ganancia = delta.clip(lower=0)
    perdida  = (-delta).clip(lower=0)
    avg_gan  = ganancia.ewm(alpha=1 / length, adjust=False).mean()
    avg_per  = perdida.ewm(alpha=1 / length, adjust=False).mean()
    rs  = avg_gan / avg_per.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi


def _atr(high: pd.Series, low: pd.Series, close: pd.Series, length: int = 14) -> pd.Series:
    """Average True Range."""
    prev_close = close.shift(1)
    tr = pd.concat([
        high - low,
        (high - prev_close).abs(),
        (low  - prev_close).abs(),
    ], axis=1).max(axis=1)
    return tr.ewm(alpha=1 / length, adjust=False).mean()


# ── API pública ───────────────────────────────────────────────────────────────

def calcular_indicadores(df: pd.DataFrame) -> pd.DataFrame:
    """
    Agrega columnas de indicadores técnicos al DataFrame de velas.

    Indicadores calculados:
        - EMA 20, EMA 50, EMA 200
        - RSI 14
        - ATR 14

    Args:
        df: DataFrame con columnas open, high, low, close, volume.

    Returns:
        DataFrame original enriquecido con las columnas de indicadores.
    """
    df = df.copy()

    df["ema_20"]  = _ema(df["close"], 20)
    df["ema_50"]  = _ema(df["close"], 50)
    df["ema_200"] = _ema(df["close"], 200)
    df["rsi_14"]  = _rsi(df["close"], 14)
    df["atr_14"]  = _atr(df["high"], df["low"], df["close"], 14)

    print("📐 Indicadores calculados: EMA 20/50/200 | RSI 14 | ATR 14")
    return df


def obtener_senal(df: pd.DataFrame) -> dict:
    """
    Evalúa la última vela cerrada y determina la señal de trading.

    Lógica de señal:
        COMPRA  → EMA20 > EMA50 > EMA200  y  RSI entre 40 y 70
        VENTA   → EMA20 < EMA50 < EMA200  y  RSI entre 30 y 60
        NEUTRAL → ninguna condición cumplida

    Args:
        df: DataFrame con indicadores calculados.

    Returns:
        Diccionario con 'señal', 'ema_20', 'ema_50', 'ema_200',
        'rsi_14', 'atr_14' y 'precio_cierre'.
    """
    ultima = df.iloc[-1]

    ema_20  = ultima["ema_20"]
    ema_50  = ultima["ema_50"]
    ema_200 = ultima["ema_200"]
    rsi     = ultima["rsi_14"]
    atr     = ultima["atr_14"]
    cierre  = ultima["close"]

    tendencia_alcista = ema_20 > ema_50 > ema_200
    tendencia_bajista = ema_20 < ema_50 < ema_200
    rsi_compra        = 40 < rsi < 70
    rsi_venta         = 30 < rsi < 60

    if tendencia_alcista and rsi_compra:
        senal = "COMPRA"
    elif tendencia_bajista and rsi_venta:
        senal = "VENTA"
    else:
        senal = "NEUTRAL"

    return {
        "señal":         senal,
        "precio_cierre": round(cierre, 5),
        "ema_20":        round(ema_20, 5),
        "ema_50":        round(ema_50, 5),
        "ema_200":       round(ema_200, 5),
        "rsi_14":        round(rsi, 2),
        "atr_14":        round(atr, 5),
    }


def imprimir_indicadores(info: dict) -> None:
    """Muestra en consola el estado actual de los indicadores y la señal."""
    iconos = {"COMPRA": "🟢", "VENTA": "🔴", "NEUTRAL": "⚪"}
    icono  = iconos.get(info["señal"], "⚪")

    print("\n" + "─" * 50)
    print(f"  {icono}  SEÑAL ACTUAL: {info['señal']}")
    print("─" * 50)
    print(f"  Precio cierre : {info['precio_cierre']}")
    print(f"  EMA  20       : {info['ema_20']}")
    print(f"  EMA  50       : {info['ema_50']}")
    print(f"  EMA 200       : {info['ema_200']}")
    print(f"  RSI  14       : {info['rsi_14']}")
    print(f"  ATR  14       : {info['atr_14']}")
    print("─" * 50 + "\n")
