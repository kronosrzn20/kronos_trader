"""
Módulo de gestión de riesgo.
Calcula el tamaño de posición, stop loss y take profit basados en ATR.
"""

import MetaTrader5 as mt5
from dotenv import load_dotenv
import os

load_dotenv()


def obtener_balance() -> float:
    """Retorna el balance actual de la cuenta desde MT5."""
    info = mt5.account_info()
    if info is None:
        raise RuntimeError("No se pudo obtener la información de la cuenta.")
    return info.balance


def calcular_tamano_posicion(
    simbolo: str,
    stop_loss_pips: float,
    porcentaje_riesgo: float | None = None,
) -> float:
    """
    Calcula el tamaño óptimo de la posición en lotes.

    Fórmula:
        dinero_en_riesgo = balance * (porcentaje_riesgo / 100)
        lotes = dinero_en_riesgo / (stop_loss_pips * valor_pip_por_lote)

    Args:
        simbolo:           Par de divisas, ej. 'EURUSD'.
        stop_loss_pips:    Distancia del SL en pips.
        porcentaje_riesgo: % del balance a arriesgar (default: variable de entorno).

    Returns:
        Tamaño en lotes redondeado al mínimo permitido por el broker.
    """
    if porcentaje_riesgo is None:
        porcentaje_riesgo = float(os.getenv("RIESGO_POR_TRADE", 1.0))

    balance = obtener_balance()
    dinero_en_riesgo = balance * (porcentaje_riesgo / 100)

    info_simbolo = mt5.symbol_info(simbolo)
    if info_simbolo is None:
        raise RuntimeError(f"No se encontró información del símbolo '{simbolo}'.")

    # Valor en cuenta del pip por lote estándar
    # Para pares XXX/USD: 1 pip = 0.0001, 1 lote = 100 000 unidades → pip_value = 10 USD
    # Para pares con divisa cotización ≠ USD se necesitaría conversión adicional.
    pip_size         = info_simbolo.point * 10          # 1 pip = 10 puntos para 4 decimales
    valor_pip_lote   = pip_size * info_simbolo.trade_contract_size

    lotes_calculados = dinero_en_riesgo / (stop_loss_pips * valor_pip_lote)

    lote_minimo  = info_simbolo.volume_min
    lote_paso    = info_simbolo.volume_step
    lotes_finales = max(lote_minimo, round(lotes_calculados / lote_paso) * lote_paso)
    lotes_finales = round(lotes_finales, 2)

    print(f"\n💼 Gestión de riesgo:")
    print(f"   Balance          : {balance:.2f} USD")
    print(f"   Riesgo por trade : {porcentaje_riesgo}% → {dinero_en_riesgo:.2f} USD")
    print(f"   SL en pips       : {stop_loss_pips:.1f}")
    print(f"   Tamaño calculado : {lotes_calculados:.4f} lotes")
    print(f"   Tamaño final     : {lotes_finales:.2f} lotes")

    return lotes_finales


def calcular_sl_tp(
    precio_entrada: float,
    atr: float,
    direccion: str,
    mult_sl: float | None = None,
    mult_tp: float | None = None,
) -> dict:
    """
    Calcula los niveles de Stop Loss y Take Profit usando el ATR.

    Args:
        precio_entrada: Precio de entrada de la operación (ask para BUY, bid para SELL).
        atr:            Valor del ATR en precio (no en pips).
        direccion:      'BUY' o 'SELL'.
        mult_sl:        Multiplicador ATR para SL (default: variable de entorno).
        mult_tp:        Multiplicador ATR para TP (default: variable de entorno).

    Returns:
        Diccionario con 'stop_loss', 'take_profit' y 'sl_pips'.
    """
    if mult_sl is None:
        mult_sl = float(os.getenv("MULTIPLICADOR_ATR_SL", 1.5))
    if mult_tp is None:
        mult_tp = float(os.getenv("MULTIPLICADOR_ATR_TP", 3.0))

    direccion = direccion.upper()
    distancia_sl = atr * mult_sl
    distancia_tp = atr * mult_tp

    if direccion == "BUY":
        stop_loss   = precio_entrada - distancia_sl
        take_profit = precio_entrada + distancia_tp
    elif direccion == "SELL":
        stop_loss   = precio_entrada + distancia_sl
        take_profit = precio_entrada - distancia_tp
    else:
        raise ValueError("La dirección debe ser 'BUY' o 'SELL'.")

    # Convertir distancia SL a pips (aproximado para pares de 4 decimales)
    sl_pips = round(distancia_sl / 0.0001, 1)

    print(f"\n🎯 Niveles de la operación ({direccion}):")
    print(f"   Precio entrada : {precio_entrada:.5f}")
    print(f"   Stop Loss      : {stop_loss:.5f}  ({sl_pips} pips | ATR×{mult_sl})")
    print(f"   Take Profit    : {take_profit:.5f}  (ATR×{mult_tp})")
    print(f"   Ratio R:R      : 1:{mult_tp / mult_sl:.1f}")

    return {
        "stop_loss":   round(stop_loss, 5),
        "take_profit": round(take_profit, 5),
        "sl_pips":     sl_pips,
    }
