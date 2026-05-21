# Guía de uso — Forex Agent Dashboard

Guía práctica para operar con el dashboard sin necesidad de conocimientos técnicos avanzados.

---

## Antes de empezar — lista de verificación

- [ ] MetaTrader 5 está abierto e iniciado con tu cuenta
- [ ] El botón **"Trading algorítmico"** está verde en MT5
- [ ] El archivo `.env` tiene tus credenciales correctas
- [ ] El backend está corriendo (`python api.py`)
- [ ] El dashboard está corriendo (`npm run dev` en la carpeta `forex-dashboard`)

---

## Cómo iniciar el sistema

### Paso 1 — Abrir MetaTrader 5

Abre MT5 e inicia sesión con tu cuenta. Verifica que en la barra de herramientas aparece el botón verde que dice **"Algo Trading"** o **"Trading algorítmico"** activado.

### Paso 2 — Iniciar el backend

Abre una terminal PowerShell en la carpeta del proyecto:

```powershell
cd forex-agent
venv\Scripts\activate
python api.py
```

Deberías ver:
```
✅ Inicializado correctamente
✅ Conexión exitosa | Cuenta: XXXXXXXX
Balance: 998.34 USD | ...
```

### Paso 3 — Iniciar el dashboard

Abre **otra** terminal PowerShell:

```powershell
cd forex-agent\forex-dashboard
npm run dev
```

Se abre automáticamente la ventana de Electron con el dashboard.

---

## Navegación del dashboard

```
┌──────────────────────────────────────────────────────────────┐
│  Forex Agent    [EURUSD ▼] [⚡ SMC Gold ▼]  4544.74  MT5 ✅  │  ← Topbar
├──────────┬───────────────────────────────────────────────────┤
│          │                                                   │
│Dashboard │          Gráfico de velas (M15)          │ Panel │
│Señales   │                                          │derecho│
│Historial │                                                   │
│Config    │                                                   │
├──────────┴───────────────────────────────────────────────────┤
│  Balance: $998  Equity: $995  P&L: $0.00  Win rate: 0%       │  ← StatusBar
└──────────────────────────────────────────────────────────────┘
```

### Topbar (barra superior)

| Elemento | Descripción |
|---|---|
| Selector de par | Elige el mercado: EURUSD, GBPUSD, USDJPY o XAUUSD |
| Selector de estrategia | Solo aparece con XAUUSD: elige entre EMA+RSI o SMC Gold (IA) |
| Precio en vivo | Precio actual del par seleccionado (actualiza cada 5 seg) |
| Spread | Diferencia entre precio de compra y venta en pips |
| MT5 Conectado / Desconectado | Estado de la conexión con MetaTrader 5 |

### StatusBar (barra inferior)

Muestra en tiempo real: balance, equity, P&L del día, número de operaciones, win rate y margen libre.

---

## Página Dashboard

### Gráfico de velas

- Muestra las últimas 200 velas de **15 minutos**
- La línea **azul** es la EMA 20 (tendencia de las últimas horas)
- La línea **morada** es la EMA 50 (tendencia de los últimos días)
- Se actualiza automáticamente cada 60 segundos
- Puedes actualizarlo manualmente con el ícono ↻ en la esquina superior derecha del gráfico

### Panel derecho — Estrategia EMA + RSI

Visible cuando seleccionas cualquier par con la estrategia EMA + RSI:

| Sección | Qué muestra |
|---|---|
| **Señal actual** | COMPRA 🟢 / VENTA 🔴 / NEUTRAL — se actualiza cada 5 seg |
| **Indicadores técnicos** | Tendencias corto/medio/largo plazo + impulso (RSI) + volatilidad |
| **Análisis de la señal** | Explicación visual: gráfico de dirección, medidor de impulso y checklist de condiciones |
| **Posiciones abiertas** | Operaciones que están abiertas ahora con su ganancia/pérdida en tiempo real |

### Panel derecho — SMC Gold (solo XAUUSD)

Visible cuando seleccionas **XAUUSD + ⚡ SMC Gold (IA)**:

| Sección | Qué muestra |
|---|---|
| **Señal** | COMPRA / VENTA / NEUTRAL con el sistema de confluencias |
| **Precio en vivo** | Precio actual del oro con alerta si se aleja de la señal |
| **Horario de mercado** | Sesión activa (Londres / Nueva York / Asia) |
| **Fuerza del Dólar** | Valor del DXY y su impacto en el oro |
| **Estructura del mercado** | Si la tendencia está cambiando (CHoCH) o continuando (BOS) |
| **Confluencias** | Lista de condiciones cumplidas — a más verdes, señal más fuerte |
| **Zonas clave** | Áreas de precio donde el oro podría rebotar |
| **Niveles SL/TP** | Stop Loss, entrada y Take Profit calculados |
| **Tomar Entrada** | Botón para ejecutar la operación directamente desde el dashboard |
| **Análisis GPT** | Explicación en texto plano generada por IA con contexto técnico y fundamental |

> **Importante:** el análisis con IA solo funciona en horario de Londres y Nueva York (08:00–22:00 UTC, lunes a viernes). Fuera de ese horario el sistema no gasta tokens y muestra un mensaje informativo.

---

## Cómo operar con la estrategia SMC Gold

### Flujo recomendado

1. **Espera el horario correcto** — Lo ideal es operar entre las 08:00 y las 22:00 UTC (sesión Londres + Nueva York). El oro tiene más movimiento y las señales son más confiables.

2. **Revisa la señal** — El panel se actualiza cada 5 minutos. Espera a que aparezca una señal **COMPRA** o **VENTA** (no NEUTRAL).

3. **Verifica las confluencias** — Cuantas más condiciones verdes haya en la checklist, más fuerte es la señal. Mínimo recomendado: 4 de 6.

4. **Lee el análisis GPT** — La IA explica en lenguaje simple por qué se generó la señal y qué está pasando con el mercado. Si técnico y fundamental se contradicen, lo menciona como riesgo.

5. **Revisa los niveles** — Verifica que el Stop Loss y el Take Profit tienen sentido. El ratio riesgo/beneficio mínimo recomendado es **1:3**.

6. **Toma la entrada** — Haz clic en "Tomar Entrada", revisa el resumen de la orden y confirma. La orden se envía directamente a MT5.

### Señales de alerta que debes respetar

- Si el precio en vivo se alejó más de **1 ATR** de la señal → evalúa con cuidado antes de entrar
- Si el precio se alejó más de **2 ATR** → la señal probablemente ya no es válida, espera el siguiente análisis
- Si hay una **divergencia SMT** (Oro y Plata van en direcciones distintas) → señal de trampa, mayor precaución

---

## Página Señales

Muestra las señales actuales de los **4 pares simultáneamente** (EURUSD, GBPUSD, USDJPY, XAUUSD) con sus indicadores.

- Haz clic en **"¿Qué significa cada cosa?"** para ver una guía desplegable que explica cada término
- Cada tarjeta tiene un botón para ejecutar la orden directamente
- Se actualiza cada 15 segundos

---

## Página Historial

Muestra:
- **Posiciones abiertas** en la parte superior con P&L flotante en tiempo real
- **Últimas 20 operaciones cerradas** con fecha, tipo, símbolo y ganancia/pérdida

---

## Página Configuración

### Conexión MT5

Puedes cambiar las credenciales de MetaTrader 5 directamente desde el dashboard sin editar el `.env`:

1. Ingresa el número de cuenta, contraseña y servidor
2. Haz clic en **"Guardar y reconectar"**
3. El sistema se reconecta automáticamente

> El servidor debe coincidir exactamente con el nombre que aparece en la ventana de login de MT5 (por ejemplo: `XMGlobal-MT5 5`).

### Gestión de riesgo

| Parámetro | Qué controla |
|---|---|
| Riesgo por trade | % del balance que arriesgas en cada operación (recomendado: 1%) |
| Multiplicador SL | Distancia del Stop Loss en múltiplos de ATR (recomendado: 1.5×) |
| Multiplicador TP | Distancia del Take Profit en múltiplos de ATR (recomendado: 3.0×) |
| Tamaño de lote | Lote fijo para la página Señales (el SMC Gold calcula el lote automáticamente) |

### Opciones

- **Solo sesión Londres / NY** — Cuando está activo, la estrategia EMA+RSI solo opera en el horario de alta liquidez (08:00–17:00 UTC)

---

## Horarios recomendados para operar el Oro

| Sesión | Horario UTC | Horario México (UTC-6) | Actividad |
|---|---|---|---|
| Asia | 23:00 – 07:00 | 17:00 – 01:00 | Baja — evitar |
| Londres | 08:00 – 17:00 | 02:00 – 11:00 | Alta ✅ |
| Nueva York | 13:00 – 22:00 | 07:00 – 16:00 | Alta ✅ |
| Superposición Londres/NY | 13:00 – 17:00 | 07:00 – 11:00 | Muy alta ⭐ |

> Los mejores momentos para el oro suelen ser justo después de la apertura de Londres (08:00–10:00 UTC) y durante la superposición con Nueva York (13:00–17:00 UTC).

---

## Glosario de términos

| Término | Significado simple |
|---|---|
| **EMA** | Promedio del precio en el tiempo. EMA 20 = últimas horas. EMA 200 = últimas semanas |
| **RSI** | Fuerza del movimiento. >70 = el precio subió demasiado rápido. <30 = bajó demasiado rápido |
| **ATR** | Cuánto se mueve el precio en promedio por vela. Se usa para calcular SL y TP |
| **Stop Loss (SL)** | Precio límite de pérdida — la operación se cierra automáticamente si llega ahí |
| **Take Profit (TP)** | Precio objetivo de ganancia — la operación se cierra automáticamente al llegar |
| **CHoCH** | Cambio de Carácter — primera señal de que la tendencia podría estar girando |
| **BOS** | Ruptura de Estructura — confirma que la tendencia actual continúa |
| **Order Block (OB)** | Zona donde bancos y fondos colocaron órdenes grandes. El precio suele rebotar ahí |
| **FVG** | Hueco de precio dejado por un movimiento muy rápido. El mercado tiende a volver a cubrirlo |
| **DXY** | Índice del Dólar. Si sube, el oro tiende a bajar. Si baja, el oro tiende a subir |
| **Spread** | Diferencia entre el precio de compra y venta. Coste implícito de cada operación |
| **Lote** | Tamaño de la posición. 0.01 lotes = tamaño mínimo (micro lote) |
| **P&L** | Profit & Loss — ganancia o pérdida de una operación |
| **R:R** | Ratio Riesgo:Beneficio. 1:3 significa que ganas 3 si aciertas y pierdes 1 si te equivocas |
| **Confluencia** | Cuando varios factores distintos apuntan en la misma dirección — mayor fiabilidad |

---

## Consejos finales

1. **Empieza siempre en cuenta demo** — prueba el sistema varias semanas antes de usar dinero real.
2. **Nunca arriesgues más del 1–2% por operación** — protege el capital ante todo.
3. **No operes durante noticias de alto impacto** — el spread se dispara y puede salirte el stop loss por volatilidad. Espera 5–10 minutos después del dato.
4. **Si el análisis GPT menciona un riesgo o contradicción** — no ignores ese aviso. Es preferible no entrar que entrar con dudas.
5. **El NEUTRAL no es malo** — significa que el mercado no da condiciones claras. Esperar también es una decisión de trading correcta.

---

> **Advertencia:** Este sistema es una herramienta de apoyo educativa. El trading conlleva riesgo de pérdida de capital. El análisis generado por inteligencia artificial no constituye asesoramiento financiero. Opera siempre con dinero que puedas permitirte perder.
