# Agente de Trading Algorítmico — Forex

Bot de trading en Python que se conecta a **MetaTrader 5**, analiza el mercado con indicadores técnicos (EMA, RSI, ATR) y ejecuta órdenes con gestión de riesgo automática.

---

## Requisitos previos

| Herramienta | Versión mínima | Notas |
|---|---|---|
| Python | 3.10+ (incluido 3.14) | Compatible con todas las versiones modernas |
| MetaTrader 5 | Cualquiera | Debe estar **abierto** antes de ejecutar |
| Cuenta MT5 | Demo o real | Se recomienda demo para pruebas |

> Los indicadores (EMA, RSI, ATR) están implementados directamente con `pandas` y `numpy`, sin `pandas-ta` ni `numba`, por lo que funcionan en cualquier versión de Python.

---

## Estructura del proyecto

```
forex-agent/
├── .env              ← Credenciales y parámetros (no subir a git)
├── main.py           ← Punto de entrada
├── mt5_connector.py  ← Conexión, datos y órdenes con MT5
├── indicators.py     ← EMA 20/50/200, RSI 14, ATR 14
├── agent.py          ← Ciclo completo del agente
├── risk_manager.py   ← Tamaño de posición, SL y TP
└── requirements.txt  ← Dependencias
```

---

## Instalación

### 1. Clonar o descargar el proyecto

```bash
git clone https://github.com/tu-usuario/forex-agent.git
cd forex-agent
```

### 2. Crear un entorno virtual (recomendado)

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

---

## Configuración

Edita el archivo `.env` con tus datos reales antes de ejecutar:

```ini
# Credenciales de MetaTrader 5
MT5_LOGIN=12345678          # Número de cuenta
MT5_PASSWORD=tu_contraseña  # Contraseña de la cuenta
MT5_SERVER=MetaQuotes-Demo  # Nombre del servidor del broker

# Gestión de riesgo
RIESGO_POR_TRADE=1.0        # % del balance a arriesgar por operación
MULTIPLICADOR_ATR_SL=1.5    # Distancia del Stop Loss en múltiplos de ATR
MULTIPLICADOR_ATR_TP=3.0    # Distancia del Take Profit en múltiplos de ATR

# Mercado a analizar
SIMBOLO=EURUSD
TEMPORALIDAD=M15            # M1, M5, M15, M30, H1, H4, D1
VELAS_HISTORICAS=200
```

> El servidor (`MT5_SERVER`) debe coincidir exactamente con el nombre que aparece en la ventana de login de MetaTrader 5.

---

## Ejecución

**1. Abre MetaTrader 5** e inicia sesión con tu cuenta.

**2. Ejecuta el agente:**

```bash
python api.py
python main.py

```

### Flujo de ejecución

```
main.py
  │
  ├── Conecta con MT5 y muestra info de cuenta
  ├── Descarga 200 velas EURUSD M15
  ├── Calcula EMA 20/50/200 · RSI 14 · ATR 14
  ├── Muestra tabla con las últimas 5 velas
  ├── Imprime la señal actual (COMPRA / VENTA / NEUTRAL)
  │
  └── [Opcional] Ciclo completo del agente:
        ├── Calcula SL y TP con ATR
        ├── Calcula tamaño de posición por % de riesgo
        ├── Pide confirmación al usuario
        └── Ejecuta la orden en MT5
```

### Ejemplo de salida esperada

```
╔══════════════════════════════════════════════════╗
║       AGENTE DE TRADING ALGORÍTMICO - FOREX      ║
║              EURUSD M15 | pandas-ta              ║
╚══════════════════════════════════════════════════╝

🔌 Iniciando conexión con MetaTrader 5...
✅ Conexión exitosa | Cuenta: 12345678 | Servidor: MetaQuotes-Demo
   Balance: 10000.00 USD | Equity: 10000.00 | Apalancamiento: 1:100

📊 Descargando 200 velas de EURUSD [M15]...
   ✅ 200 velas cargadas | Desde: 2026-05-10 08:00 | Hasta: 2026-05-12 16:15

📐 Indicadores calculados: EMA 20/50/200 | RSI 14 | ATR 14

──────────────────────────────────────────────────
  🟢  SEÑAL ACTUAL: COMPRA
──────────────────────────────────────────────────
  Precio cierre : 1.08542
  EMA  20       : 1.08410
  EMA  50       : 1.08105
  EMA 200       : 1.07830
  RSI  14       : 58.34
  ATR  14       : 0.00087
──────────────────────────────────────────────────
```

---

## Lógica de señales

| Señal | Condición EMAs | Condición RSI |
|---|---|---|
| **COMPRA** | EMA20 > EMA50 > EMA200 | RSI entre 40 y 70 |
| **VENTA** | EMA20 < EMA50 < EMA200 | RSI entre 30 y 60 |
| **NEUTRAL** | Sin alineación clara | — |

> Los indicadores están implementados con `pandas`/`numpy` puro (sin `pandas-ta`), usando el método de Wilder para RSI y True Range para ATR.

### Gestión de riesgo

- **Stop Loss** = `precio ± ATR × 1.5`
- **Take Profit** = `precio ± ATR × 3.0`
- **Ratio R:R** = 1 : 2
- **Tamaño de posición** calculado automáticamente para no arriesgar más del `RIESGO_POR_TRADE`% del balance

---

## Temporalidades disponibles

`M1` · `M5` · `M15` · `M30` · `H1` · `H4` · `D1`

Cámbiala en `.env` con la variable `TEMPORALIDAD`.

---

---

## API REST + WebSocket

El archivo `api.py` expone todos los datos del agente como una API HTTP y WebSocket, pensada para conectarse desde Electron, React u otras frontends.

### Iniciar la API

```powershell
python api.py
# o con recarga automática en desarrollo:
uvicorn api:app --reload --port 8000
```

La API se conecta a MT5 automáticamente al arrancar. Documentación interactiva disponible en [http://localhost:8000/docs](http://localhost:8000/docs).

### Endpoints REST

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/account` | Balance, equity y apalancamiento de la cuenta |
| `GET` | `/signal/{symbol}` | Señal actual (COMPRA/VENTA/NEUTRAL) con indicadores |
| `GET` | `/price/{symbol}` | Precio bid/ask en tiempo real |
| `GET` | `/history` | Últimas 20 operaciones cerradas |
| `POST` | `/trade` | Ejecutar orden manual |

#### POST /trade — body de ejemplo

```json
{
  "symbol": "EURUSD",
  "type": "BUY",
  "lot": 0.1
}
```

> Si no se envían `sl` y `tp`, se calculan automáticamente usando ATR × multiplicadores del `.env`.

### WebSocket — /ws/live

Conectar a `ws://localhost:8000/ws/live`. Emite cada 5 segundos:

```json
{
  "price":      { "bid": 1.08540, "ask": 1.08542, "spread": 0.2 },
  "signal":     "COMPRA",
  "indicators": { "ema20": 1.0841, "ema50": 1.0810, "ema200": 1.0783, "rsi": 58.3, "atr": 0.00087 },
  "symbol":     "EURUSD",
  "timestamp":  "2026-05-12T21:00:00Z"
}
```

Un snapshot inicial se envía al conectar (sin esperar 5 s).

---

## Advertencia

> Este proyecto es **educativo**. El trading algorítmico conlleva riesgo de pérdida de capital. Prueba siempre en una **cuenta demo** antes de operar con dinero real. Los resultados pasados no garantizan rendimientos futuros.
