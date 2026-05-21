"""
Integración con OpenAI GPT-4o-mini para análisis SMC del Oro (XAUUSD).

El modelo recibe:
  - Análisis técnico SMC (CHoCH/BOS, OB, FVG, estructura M15)
  - Análisis fundamental (DXY, VIX, S&P 500, sesión de trading)
Y genera una explicación en español con dos secciones: técnica y fundamental.
"""

import os

_client = None


def _get_client():
    global _client
    if _client is None:
        from openai import OpenAI
        api_key = os.getenv("OPENAI_API_KEY", "")
        if not api_key or api_key.startswith("sk-..."):
            raise RuntimeError(
                "OPENAI_API_KEY no configurada. Agrégala en el archivo .env"
            )
        _client = OpenAI(api_key=api_key)
    return _client


SYSTEM_PROMPT = """\
Eres un analista de trading especializado en el mercado del Oro (XAUUSD) con experiencia en:
  - Smart Money Concepts (SMC): Order Blocks, FVG, CHoCH, BOS, liquidez
  - Análisis fundamental: correlación DXY/Oro, sentimiento de mercado (VIX, S&P 500), \
    calendario económico de alto impacto (NFP, CPI, FOMC, etc.)

Fuentes de datos que recibirás (TODAS en tiempo real):
  1. DXY (Índice del Dólar) — precio actual y tendencia de las últimas 8 horas
  2. VIX (Índice de Miedo) — nivel actual y cambio reciente
  3. S&P 500 — precio y dirección reciente (apetito de riesgo)
  4. Calendario económico de HOY — eventos USD (Estados Unidos) de alto impacto y discursos \
     de la Reserva Federal (Fed/Powell/FOMC), con pronóstico y resultado real si ya salió \
     (fuente: ForexFactory)
  5. Datos técnicos SMC de XAUUSD en M15

Tu tarea: generar un informe en español estructurado en TRES secciones.

Formato OBLIGATORIO (sin markdown, sin asteriscos, sin guiones, texto plano):

ANÁLISIS TÉCNICO (M15):
[2-3 oraciones: estructura CHoCH/BOS, Order Blocks, FVG y señal detectada]

ANÁLISIS FUNDAMENTAL:
[2-3 oraciones: DXY + VIX + SPX + eventos del calendario económico de hoy. \
Si hay un evento pendiente, adviértelo. Si el resultado ya salió, explica su impacto en el oro.]

CONCLUSIÓN:
[1-2 oraciones: veredicto final, nivel de confianza y acción recomendada]

Reglas:
- SIEMPRE en español.
- Lenguaje claro para alguien sin experiencia en trading.
- Si técnico y fundamental se contradicen, menciónalo como riesgo.
- Máximo 200 palabras totales.
- NO uses #, *, -, ni caracteres especiales.
"""


def analizar_con_gpt(datos_smc: dict) -> str:
    """
    Envía el análisis completo a GPT-4o-mini y retorna el informe técnico + fundamental.

    Args:
        datos_smc: Resultado de gold_strategy.calcular_senal_smc()

    Returns:
        Informe en texto plano con secciones técnica, fundamental y conclusión.
    """
    try:
        cliente = _get_client()

        senal           = datos_smc.get("senal", "NEUTRAL")
        precio          = datos_smc.get("precio", 0)
        atr             = datos_smc.get("atr", 0)
        dxy             = datos_smc.get("dxy", {})
        macro           = datos_smc.get("macro", {})
        estructura      = datos_smc.get("estructura", {})
        sesion          = datos_smc.get("sesion", {})
        smt             = datos_smc.get("smt", {})
        sl              = datos_smc.get("sl")
        tp1             = datos_smc.get("tp1")
        lotes_info      = datos_smc.get("lotes", {})
        confluencias_ok = datos_smc.get("confluencias_ok", 0)
        total_conf      = datos_smc.get("total_confluencias", 6)

        checklist_str = "\n".join(
            f"  {'SI' if c['cumplida'] else 'NO'} | {c['nombre']}: {c['valor']}"
            for c in datos_smc.get("checklist", [])
        )

        obs_str = " | ".join(
            f"OB {o['tipo']} zona {o['bajo']}-{o['alto']}"
            for o in datos_smc.get("order_blocks", [])[:2]
        ) or "ninguno relevante"

        fvg_str = " | ".join(
            f"FVG {f['tipo']} zona {f['inferior']}-{f['superior']}"
            for f in datos_smc.get("fvgs", [])[:2]
        ) or "ninguno relevante"

        vix       = macro.get("vix", {})
        spx       = macro.get("spx", {})
        calendario = datos_smc.get("calendario", [])

        if calendario and "error" not in calendario[0]:
            cal_str = "\n".join(
                f"  - [{ev.get('moneda','USD')}] {ev['titulo']} | "
                f"Hora UTC: {ev['hora_utc']} | "
                f"Pronóstico: {ev['pronostico']} | Anterior: {ev['anterior']} | "
                f"Resultado: {ev['resultado']} | Impacto: {ev['impacto']}"
                for ev in calendario
            )
        elif calendario and "error" in calendario[0]:
            cal_str = f"  (No disponible: {calendario[0]['error']})"
        else:
            cal_str = "  Sin eventos de alto impacto USD hoy."

        prompt = f"""
=== DATOS PARA ANÁLISIS ===

PAR: XAUUSD | TEMPORALIDAD: M15
SEÑAL TÉCNICA: {senal}
PRECIO ACTUAL: ${precio} USD
CONFLUENCIAS: {confluencias_ok}/{total_conf}
ATR (volatilidad promedio M15): ${atr}

--- ANÁLISIS TÉCNICO SMC ---
Estructura de mercado: {estructura.get('tipo', 'Sin estructura')} {estructura.get('direccion', '')}
Descripción: {estructura.get('descripcion', 'N/A')}
Order Blocks: {obs_str}
Fair Value Gaps: {fvg_str}
Divergencia SMT Oro/Plata: {smt.get('descripcion', 'Sin datos')}

Checklist de confluencias:
{checklist_str}

--- ANÁLISIS FUNDAMENTAL ---
DXY (Índice del Dólar):
  Valor actual: {dxy.get('valor', 'N/A')} | Tendencia: {dxy.get('sesgo', 'N/A')} | Cambio 8h: {dxy.get('cambio_pct', 0):+.3f}%
  Implicación para el Oro: {'DXY SUBE → Oro presionado a la baja' if dxy.get('sesgo') == 'ALCISTA' else 'DXY BAJA → Oro tiende a subir' if dxy.get('sesgo') == 'BAJISTA' else 'DXY neutral'}

VIX (Índice de Miedo del mercado):
  Valor: {vix.get('valor', 'N/A')} | Cambio: {vix.get('cambio_pct', 0):+.2f}%
  {vix.get('descripcion', 'Sin datos')}

S&P 500 (Sentimiento de riesgo):
  Valor: {spx.get('valor', 'N/A')} | Cambio 8h: {spx.get('cambio_pct', 0):+.3f}%
  {spx.get('descripcion', 'Sin datos')}

Sesión activa: {sesion.get('sesion', 'N/A')} | {'SESIÓN ACTIVA — buena liquidez' if sesion.get('activa') else 'SIN SESIÓN — baja liquidez, evitar entradas'}

CALENDARIO ECONÓMICO HOY (eventos USD — Estados Unidos — alto impacto + discursos Fed):
{cal_str}
IMPORTANTE: Si hay un evento pendiente (sin resultado aún), la señal es de mayor riesgo. \
Si el resultado ya salió, analiza si fue mejor o peor que el pronóstico y su impacto en el Oro.

--- NIVELES DE LA OPERACIÓN ---
Stop Loss: ${sl if sl else 'N/A'}
Take Profit 1 (TP1): ${tp1 if tp1 else 'N/A'}
Lotes calculados (riesgo {lotes_info.get('riesgo_pct', 1)}%): {lotes_info.get('lotes', 'N/A')}
Dinero en riesgo: ${lotes_info.get('dinero_en_riesgo', 'N/A')}

Por favor, genera el informe con el formato exacto indicado en el sistema.
"""

        response = cliente.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.25,
            max_tokens=500,
        )

        return response.choices[0].message.content.strip()

    except RuntimeError as e:
        return f"⚠️ {e}"
    except Exception as e:
        return f"Análisis IA no disponible: {str(e)}"
