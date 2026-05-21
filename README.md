# Agente de Trading Algorítmico — Forex + Gold (XAUUSD)

Bot de trading en Python que se conecta a **MetaTrader 5**, analiza el mercado con dos estrategias y ofrece un dashboard en Electron + React para operar desde una interfaz visual.

---

## Estrategias disponibles

| Estrategia | Pares | Método técnico | IA |
|---|---|---|---|
| **EMA + RSI** | EURUSD, GBPUSD, USDJPY, XAUUSD | EMA 20/50/200 · RSI 14 · ATR 14 | — |
| **SMC Gold (IA)** | Solo XAUUSD | CHoCH/BOS · Order Blocks · FVG · Equal H/L · SMT | GPT-4o-mini |

---

## Requisitos previos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| Python | 3.10+ | Compatible con 3.14. Sin `numba` ni `pandas-ta` |
| MetaTrader 5 | Cualquiera | Debe estar **abierto** antes de ejecutar |
| Node.js | 18+ | Solo para el dashboard |
| Cuenta MT5 | Demo o real | Se recomienda demo para pruebas |
| OpenAI API Key | — | Solo para la estrategia SMC Gold |

---

## Estructura del proyecto

```
forex-agent/
├── .env                  ← Credenciales y parámetros (no subir a git)
├── api.py                ← API REST + WebSocket (FastAPI)
├── main.py               ← Punto de entrada en modo consola
├── mt5_connector.py      ← Conexión, datos y órdenes con MT5
├── indicators.py         ← EMA 20/50/200, RSI 14, ATR 14
├── gold_strategy.py      ← Motor SMC para XAUUSD (CHoCH, OB, FVG, DXY, calendario)
├── openai_analyst.py     ← Análisis técnico + fundamental con GPT-4o-mini
├── agent.py              ← Ciclo completo del agente
├── risk_manager.py       ← Tamaño de posición, SL y TP
├── requirements.txt      ← Dependencias Python
└── forex-dashboard/      ← Dashboard Electron + React + Vite
    ├── electron/
    │   └── main.js
    ├── src/
    │   ├── components/   ← Sidebar, Topbar, StatusBar, SignalExplanation, SmcSignalPanel
    │   ├── context/      ← AppContext (estado global)
    │   ├── pages/        ← Dashboard, Signals, History, Config
    │   └── utils/
    │       └── constants.js
    ├── package.json
    └── vite.config.js
```

---

## Instalación

### 1. Clonar o descargar el proyecto

```bash
git clone https://github.com/tu-usuario/forex-agent.git
cd forex-agent
```

### 2. Crear entorno virtual Python

```powershell
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Linux / macOS
```

### 3. Instalar dependencias Python

```bash
pip install -r requirements.txt
```

### 4. Instalar dependencias del dashboard

```bash
cd forex-dashboard
npm install
cd ..
```

---

## Configuración

Edita el archivo `.env` con tus datos antes de ejecutar:

```ini
# OpenAI (para la estrategia SMC Gold con análisis IA)
OPENAI_API_KEY=sk-proj-...tu_clave_aqui...

# Credenciales de MetaTrader 5
MT5_LOGIN=12345678
MT5_PASSWORD=tu_contraseña
MT5_SERVER=NombreDelServidor   # Ejemplo: XMGlobal-MT5 5

# Ruta al ejecutable de MT5 (obligatorio si la conexión falla)
# MT5_PATH=C:\Program Files\XM Global MT5 Terminal\terminal64.exe
MT5_PATH=

# Gestión de riesgo
RIESGO_POR_TRADE=1.0        # % del balance a arriesgar por operación
MULTIPLICADOR_ATR_SL=1.5    # Distancia del SL en múltiplos de ATR (estrategia EMA)
MULTIPLICADOR_ATR_TP=3.0    # Distancia del TP en múltiplos de ATR (estrategia EMA)

# Mercado por defecto (estrategia EMA+RSI)
SIMBOLO=EURUSD
TEMPORALIDAD=M15
VELAS_HISTORICAS=200

# Nombres de símbolos en MT5 — varían según el broker
# XM Global usa GOLD y SILVER. Otros brokers: XAUUSD y XAGUSD
MT5_GOLD_SYMBOL=GOLD
MT5_SILVER_SYMBOL=SILVER
```

> **MT5_PATH** es importante si usas un terminal de broker específico (XM, IC Markets, Pepperstone). Busca `terminal64.exe` en la carpeta de instalación de MT5.

> **MT5_SERVER** debe coincidir exactamente con el nombre que aparece en la ventana de login de MetaTrader 5.

---

## Ejecución

### Backend (API)

```powershell
cd forex-agent
venv\Scripts\activate
python api.py
```

La API se conecta a MT5 automáticamente. Documentación en [http://localhost:8000/docs](http://localhost:8000/docs).

### Dashboard (interfaz visual)

En otra terminal:

```powershell
cd forex-agent\forex-dashboard
npm run dev
```

Abre la ventana de Electron automáticamente. Si solo quieres la interfaz web: [http://localhost:5173](http://localhost:5173).

---

## Estrategia 1 — EMA + RSI

### Señales

| Señal | Condición EMAs | Condición RSI |
|---|---|---|
| **COMPRA** | EMA20 > EMA50 > EMA200 | RSI entre 40 y 70 |
| **VENTA** | EMA20 < EMA50 < EMA200 | RSI entre 30 y 60 |
| **NEUTRAL** | Sin alineación clara | — |

### Gestión de riesgo (ATR)

- **Stop Loss** = `precio ± ATR × MULTIPLICADOR_ATR_SL`
- **Take Profit** = `precio ± ATR × MULTIPLICADOR_ATR_TP`
- **Ratio R:R** = 1:2 (con valores por defecto)
- **Lotes** calculados automáticamente: `(balance × riesgo%) / (SL_pips × valor_pip)`

---

## Estrategia 2 — SMC Gold (solo XAUUSD)

Estrategia basada en **Smart Money Concepts** con análisis técnico en M15 y análisis fundamental en tiempo real mediante IA.

### Cómo activarla

1. Selecciona **XAUUSD** en el selector de par del dashboard.
2. Elige **⚡ SMC Gold (IA)** en el dropdown de estrategia (aparece solo con XAUUSD).

### Componentes técnicos (Python — M15)

| Componente | Qué detecta |
|---|---|
| **CHoCH** (Change of Character) | Cambio de tendencia: el precio rompe el último máximo/mínimo significativo |
| **BOS** (Break of Structure) | Continuación de tendencia: ruptura en la dirección actual |
| **Order Blocks** | Última vela alcista/bajista antes de un impulso fuerte — zona de entrada institucional |
| **Fair Value Gap (FVG)** | Hueco de precio entre 3 velas — el mercado tiende a volver a llenarlo |
| **Equal Highs / Lows** | Máximos o mínimos iguales — zonas donde hay liquidez acumulada (stops de traders) |
| **Sesión activa** | Londres (07–16 UTC) y Nueva York (12–21 UTC) — mayor liquidez |
| **Divergencia SMT** | Compara XAUUSD vs XAGUSD — si se separan, puede ser trampa de liquidez |

### Componentes fundamentales (tiempo real)

| Fuente | Dato | Proveedor |
|---|---|---|
| **DXY** | Valor actual + tendencia 8 h | Yahoo Finance (`DX=F`) |
| **VIX** | Índice de miedo del mercado | Yahoo Finance (`^VIX`) |
| **S&P 500** | Sentimiento de riesgo | Yahoo Finance (`^GSPC`) |
| **Calendario USD** | Eventos de alto impacto de hoy: NFP, CPI, PCE, FOMC, PIB + discursos de Powell/Fed | ForexFactory (feed JSON, caché 1 h) |

> El oro tiene correlación inversa con el DXY. Si el dólar sube, el oro tiende a bajar y viceversa. El VIX alto indica miedo en los mercados, lo que impulsa el oro como activo refugio.

### Sistema de confluencias (puntuación)

La señal solo se genera si se cumplen **al menos 4 de 6 condiciones**:

| # | Condición | Puntos |
|---|---|---|
| 1 | Sesgo DXY favorable | 2 |
| 2 | Estructura CHoCH o BOS en la dirección | 2 |
| 3 | Precio dentro de un Order Block | 2 |
| 4 | Fair Value Gap presente en precio actual | 1 |
| 5 | Sesión activa (Londres / NY) | 0.5 |
| 6 | Sin divergencia SMT (oro y plata alineados) | — / −1.5 |

### Gestión de riesgo para XAUUSD

- **SL** = encima/debajo del Order Block + buffer $0.50
- **TP1** = ATR × 3.0 | **TP2** = ATR × 5.0 | **TP3** = ATR × 8.0
- **Lotes** = `(balance × riesgo%) / (distancia_SL_en_$ × 100)` ← fórmula específica para el oro
- Ratio R:R mínimo recomendado: **1:3**

### Análisis IA (GPT-4o-mini)

El modelo recibe todos los datos anteriores y genera un informe en español con tres secciones:

```
ANÁLISIS TÉCNICO (M15):
[Estructura CHoCH/BOS, Order Blocks, FVG y señal detectada]

ANÁLISIS FUNDAMENTAL:
[DXY + VIX + SPX + eventos del calendario económico de hoy]

CONCLUSIÓN:
[Veredicto final, nivel de confianza y acción recomendada]
```

### Control de consumo de tokens (optimizado)

El sistema usa **tres niveles de protección** para minimizar el gasto en OpenAI:

| Condición | Llamada a GPT | Tokens |
|---|---|---|
| Fuera de horario (< 08:00 UTC o > 22:00 UTC) | ❌ No | 0 |
| Fin de semana | ❌ No | 0 |
| Señal NEUTRAL o < 3 confluencias | ❌ No — mensaje fijo | 0 |
| Dentro de caché (< 5 min desde última llamada) | ❌ No | 0 |
| **Señal COMPRA/VENTA · ≥ 3 confluencias · en horario** | ✅ Sí | ~500 tok |

> Con uso normal el costo estimado es de **$0.10–$0.30 / mes** con GPT-4o-mini.

---

## API REST + WebSocket

### Iniciar la API

```powershell
python api.py
# o con recarga automática:
uvicorn api:app --reload --port 8000
```

### Endpoints REST

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/account` | Balance, equity y apalancamiento |
| `GET` | `/signal/{symbol}` | Señal EMA+RSI con indicadores y SL/TP absolutos |
| `GET` | `/signal/xauusd/smc` | Análisis SMC completo + análisis GPT (caché 5 min · solo en horario operativo) |
| `GET` | `/price/{symbol}` | Precio bid/ask en tiempo real |
| `GET` | `/candles/{symbol}` | OHLCV + EMA20/EMA50 para el gráfico |
| `GET` | `/positions` | Posiciones abiertas con P&L flotante |
| `GET` | `/history` | Últimas 20 operaciones cerradas |
| `POST` | `/trade` | Ejecutar orden manual |
| `GET` | `/config` | Configuración actual del agente |
| `POST` | `/config` | Actualizar configuración del agente |
| `GET` | `/mt5-config` | Credenciales MT5 guardadas (contraseña enmascarada) |
| `POST` | `/mt5-config` | Guardar credenciales y reconectar MT5 |
| `POST` | `/reconnect` | Forzar reconexión a MT5 |

#### POST /trade — body de ejemplo

```json
{
  "symbol": "GOLD",
  "type": "BUY",
  "lot": 0.03,
  "sl": 4520.00,
  "tp": 4580.00
}
```

> Usa el nombre real del símbolo en MT5. Para XM Global el oro se llama `GOLD` (no `XAUUSD`). El dashboard lo resuelve automáticamente desde la variable `MT5_GOLD_SYMBOL` del `.env`.
> Si no se envían `sl` y `tp`, se calculan automáticamente con ATR.

### WebSocket — /ws/live

Conectar a `ws://localhost:8000/ws/live`. Emite cada 5 segundos:

```json
{
  "price":      { "bid": 3300.50, "ask": 3300.80, "spread": 30 },
  "signal":     "COMPRA",
  "indicators": { "ema20": 3298.1, "ema50": 3290.5, "ema200": 3250.0, "rsi": 58.3, "atr": 8.4 },
  "symbol":     "XAUUSD",
  "timestamp":  "2026-05-20T21:00:00Z"
}
```

---

## Solución de problemas comunes

### Error: `IPC timeout` al conectar con MT5

1. Abre MetaTrader 5 manualmente e inicia sesión.
2. Activa **"Trading algorítmico"** (botón verde en la barra de herramientas).
3. Agrega `MT5_PATH` en el `.env` apuntando a `terminal64.exe`:

```powershell
# Buscar la ruta en Windows:
Get-ChildItem -Path "C:\Program Files" -Recurse -Filter "terminal64.exe" -ErrorAction SilentlyContinue
```

4. Usa el terminal instalado por tu broker (XM, IC Markets, etc.), no el genérico de MetaQuotes.

### Error: `Authorization failed`

- Verifica que `MT5_SERVER` en `.env` sea exactamente igual al nombre del servidor en la ventana de login de MT5.
- Asegúrate de que el botón "Trading algorítmico" está **verde** en MT5.
- Usa el terminal MT5 específico de tu broker.

### Error: `OPENAI_API_KEY no configurada`

- Agrega tu clave en `.env`: `OPENAI_API_KEY=sk-proj-...`
- La estrategia SMC Gold requiere esta clave para el análisis IA.
- La estrategia EMA+RSI funciona sin ella.

### Error 400 en `/price/XAUUSD` o `/signal/XAUUSD`

El broker usa un nombre distinto para el símbolo. Ejecuta este diagnóstico para encontrar el nombre correcto:

```python
# Con el venv activado:
python -c "
import MetaTrader5 as mt5; mt5.initialize()
simbolos = mt5.symbols_get()
oro = [s.name for s in simbolos if 'XAU' in s.name or 'GOLD' in s.name.upper()]
print('Símbolos de oro:', oro)
mt5.shutdown()
"
```

Luego actualiza `.env`:
```ini
MT5_GOLD_SYMBOL=GOLD   # o XAUUSD, XAUUSDm, etc. según tu broker
```

---

## Temporalidades disponibles

`M1` · `M5` · `M15` · `M30` · `H1` · `H4` · `D1`

Cámbiala en `.env` con la variable `TEMPORALIDAD` (afecta a la estrategia EMA+RSI).
La estrategia SMC Gold siempre usa **M15**.

---

## Advertencia

> Este proyecto es **educativo**. El trading algorítmico conlleva riesgo de pérdida de capital. Prueba siempre en una **cuenta demo** antes de operar con dinero real. Los resultados pasados no garantizan rendimientos futuros. El análisis generado por IA no constituye asesoramiento financiero.
