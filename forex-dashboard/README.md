# Forex Dashboard

Interfaz de escritorio para el agente de trading algorítmico Forex.
Construida con **Electron + React + Vite + TailwindCSS**.

---

## Requisitos previos

- Node.js 18+
- El backend `api.py` corriendo en `http://localhost:8000`
- MetaTrader 5 abierto y autenticado

---

## Instalación

```powershell
cd forex-agent\forex-dashboard
npm install
```

---

## Ejecutar en desarrollo

Primero levanta la API Python (desde la carpeta raíz del proyecto):

```powershell
# Terminal 1 — Backend
cd forex-agent
venv\Scripts\activate
python api.py
```

Luego el dashboard:

```powershell
# Terminal 2 — Dashboard
cd forex-agent\forex-dashboard
npm run dev
```

Esto lanza Vite en `localhost:5173` y abre Electron automáticamente cuando el servidor está listo.

---

## Build de producción

```powershell
npm run build       # Compila React → dist/
npm run electron    # Abre Electron cargando dist/index.html
```

---

## Estructura

```
forex-dashboard/
├── electron/
│   └── main.js          ← Proceso principal Electron
├── src/
│   ├── context/
│   │   └── AppContext.jsx   ← Estado global + WebSocket
│   ├── utils/
│   │   └── constants.js     ← URL de la API, pares, colores
│   ├── components/
│   │   ├── Sidebar.jsx      ← Navegación + estado MT5
│   │   ├── Topbar.jsx       ← Par activo, precio live, toggles
│   │   └── StatusBar.jsx    ← Balance, P&L, win rate
│   ├── pages/
│   │   ├── Dashboard.jsx    ← Gráfico de velas + señal en tiempo real
│   │   ├── Signals.jsx      ← Señales de 3 pares + botón ejecutar
│   │   ├── News.jsx         ← Noticias + análisis LLM
│   │   ├── History.jsx      ← Historial de operaciones
│   │   └── Config.jsx       ← Configuración del agente
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
└── vite.config.js
```

---

## Páginas

| Ruta | Descripción |
|---|---|
| `/` | Gráfico de velas con EMA20/EMA50, señal actual e indicadores |
| `/signals` | Cards de EURUSD, GBPUSD, USDJPY con señal y botón ejecutar |
| `/news` | Noticias del mercado con badge de sentimiento y análisis LLM |
| `/history` | Historial de las últimas 20 operaciones cerradas con P&L |
| `/config` | Configuración de riesgo, temporalidad y opciones del agente |

---

## Conexión con el backend

| Dato | Fuente |
|---|---|
| Precio en vivo | `GET /price/{symbol}` — polling cada 5 s |
| Gráfico de velas | `GET /candles/{symbol}` — recarga cada 60 s |
| Señal + indicadores | `GET /signal/{symbol}` — polling cada 5 s |
| Historial | `GET /history` |
| Ejecutar orden | `POST /trade` |
| Guardar config | `POST /config` |
| Stream en vivo | `WS /ws/live` — reconexión automática |

---

## Scripts disponibles

| Comando | Acción |
|---|---|
| `npm run dev` | Vite + Electron en paralelo (desarrollo) |
| `npm run build` | Compila la UI en `dist/` |
| `npm run electron` | Abre Electron con el build de producción |
| `npm run preview` | Previsualiza el build en el navegador |
