"""
Punto de entrada del agente de trading Forex.
Conecta con MetaTrader 5, analiza el mercado y muestra la señal actual.
"""

import mt5_connector as mt5c
import indicators   as ind
from agent import ejecutar_ciclo
from dotenv import load_dotenv
import os

load_dotenv()


def main() -> None:
    print("╔══════════════════════════════════════════════════╗")
    print("║       AGENTE DE TRADING ALGORÍTMICO - FOREX      ║")
    print("║              EURUSD M15 | pandas-ta              ║")
    print("╚══════════════════════════════════════════════════╝\n")

    # ── Conexión a MetaTrader 5 ────────────────────────────────────────────────
    conectado = mt5c.conectar()
    if not conectado:
        print("❌ No se pudo conectar a MetaTrader 5. Verifica el archivo .env y que MT5 esté abierto.")
        return

    try:
        simbolo      = os.getenv("SIMBOLO", "EURUSD")
        temporalidad = os.getenv("TEMPORALIDAD", "M15")
        n_velas      = int(os.getenv("VELAS_HISTORICAS", 200))

        # ── Obtener datos históricos ───────────────────────────────────────────
        df = mt5c.obtener_velas(simbolo, temporalidad, n_velas)

        # ── Calcular indicadores ───────────────────────────────────────────────
        df = ind.calcular_indicadores(df)

        # ── Mostrar últimas 5 velas con indicadores ────────────────────────────
        print("\n📋 Últimas 5 velas con indicadores:")
        columnas = ["close", "ema_20", "ema_50", "ema_200", "rsi_14", "atr_14"]
        print(df[columnas].tail(5).to_string())

        # ── Señal actual ───────────────────────────────────────────────────────
        info_senal = ind.obtener_senal(df)
        ind.imprimir_indicadores(info_senal)

        # ── Precio actual ──────────────────────────────────────────────────────
        precio = mt5c.obtener_precio_actual(simbolo)
        print(f"💱 Precio en vivo → Bid: {precio['bid']} | Ask: {precio['ask']} | "
              f"Spread: {precio['spread']} pips")

        # ── Ejecutar ciclo completo del agente (con gestión de riesgo) ─────────
        print("\n¿Deseas ejecutar el ciclo completo del agente (análisis + orden)? (s/n): ", end="")
        respuesta = input().strip().lower()
        if respuesta == "s":
            ejecutar_ciclo()

    except Exception as e:
        print(f"\n❌ Error durante la ejecución: {e}")

    finally:
        mt5c.desconectar()


if __name__ == "__main__":
    main()
