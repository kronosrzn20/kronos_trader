"""
Agente de trading principal.
Orquesta el análisis de mercado y la toma de decisiones de entrada.
"""

import mt5_connector as mt5c
import indicators   as ind
import risk_manager as rm
from dotenv import load_dotenv
import os

load_dotenv()


def ejecutar_ciclo() -> None:
    """
    Ejecuta un ciclo completo del agente:
      1. Obtiene velas históricas.
      2. Calcula indicadores técnicos.
      3. Evalúa la señal de mercado.
      4. Si hay señal, calcula riesgo y ejecuta la orden.
    """
    simbolo      = os.getenv("SIMBOLO", "EURUSD")
    temporalidad = os.getenv("TEMPORALIDAD", "M15")
    n_velas      = int(os.getenv("VELAS_HISTORICAS", 200))

    print("\n" + "═" * 50)
    print("  🤖  CICLO DEL AGENTE DE TRADING")
    print("═" * 50)

    # ── 1. Datos de mercado ───────────────────────────────────────────────────
    df = mt5c.obtener_velas(simbolo, temporalidad, n_velas)

    precio_actual = mt5c.obtener_precio_actual(simbolo)
    print(f"\n💱 Precio actual {simbolo}: "
          f"Bid={precio_actual['bid']} | Ask={precio_actual['ask']} | "
          f"Spread={precio_actual['spread']} pips")

    # ── 2. Indicadores ────────────────────────────────────────────────────────
    df = ind.calcular_indicadores(df)

    # ── 3. Señal ──────────────────────────────────────────────────────────────
    info_senal = ind.obtener_senal(df)
    ind.imprimir_indicadores(info_senal)

    senal = info_senal["señal"]
    atr   = info_senal["atr_14"]

    # ── 4. Ejecución de orden (solo si hay señal clara) ───────────────────────
    if senal == "NEUTRAL":
        print("⏳ Sin señal clara en este momento. No se ejecuta ninguna orden.\n")
        return

    direccion    = "BUY"  if senal == "COMPRA" else "SELL"
    precio_entr  = precio_actual["ask"] if direccion == "BUY" else precio_actual["bid"]

    niveles = rm.calcular_sl_tp(precio_entr, atr, direccion)
    lotes   = rm.calcular_tamano_posicion(simbolo, niveles["sl_pips"])

    confirmacion = input(
        f"\n¿Ejecutar orden {direccion} {lotes:.2f} lotes de {simbolo}? (s/n): "
    ).strip().lower()

    if confirmacion == "s":
        resultado = mt5c.ejecutar_orden(
            simbolo     = simbolo,
            direccion   = direccion,
            lotes       = lotes,
            stop_loss   = niveles["stop_loss"],
            take_profit = niveles["take_profit"],
        )
        if resultado["exito"]:
            print(f"\n🏆 Operación abierta con éxito | Ticket #{resultado['ticket']}\n")
        else:
            print(f"\n⚠️  La orden no pudo ejecutarse. Revisa los logs.\n")
    else:
        print("🚫 Orden cancelada por el usuario.\n")
