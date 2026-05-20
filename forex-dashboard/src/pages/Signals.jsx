import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Minus, Zap, RefreshCw, AlertCircle } from 'lucide-react'
import { API, PARES } from '../utils/constants'

const SIG_STYLE = {
  COMPRA:  { color: '#3fb950', bg: '#0d2119', border: '#2ea043' },
  VENTA:   { color: '#f85149', bg: '#2d1215', border: '#f85149' },
  NEUTRAL: { color: '#8b949e', bg: '#21262d', border: '#30363d' },
}

function IndItem({ label, value, color }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: '#8b949e' }}>{label}</p>
      <p style={{ fontSize: 12, fontFamily: 'monospace', color: color ?? '#c9d1d9' }}>
        {value ?? '—'}
      </p>
    </div>
  )
}

function SignalCard({ symbol, data, loading }) {
  const [executing, setExecuting] = useState(false)
  const [result,    setResult]    = useState(null)

  const s      = SIG_STYLE[data?.señal] ?? SIG_STYLE.NEUTRAL
  const signal = data?.señal ?? 'NEUTRAL'
  const ind    = data?.indicadores ?? {}

  const handleTrade = async () => {
    if (signal === 'NEUTRAL') return
    const lot = parseFloat(localStorage.getItem('lotSize') ?? '0.01')
    const type = signal === 'COMPRA' ? 'BUY' : 'SELL'
    setExecuting(true)
    setResult(null)
    try {
      const res = await fetch(`${API}/trade`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ symbol, type, lot }),
      })
      const d = await res.json()
      if (res.ok && d.exito) {
        setResult({ ok: true, msg: `Ticket #${d.ticket} abierto a ${d.precio}` })
      } else {
        setResult({ ok: false, msg: d.detail ?? 'Error al ejecutar' })
      }
    } catch {
      setResult({ ok: false, msg: 'Sin conexión con la API' })
    }
    setExecuting(false)
    setTimeout(() => setResult(null), 5000)
  }

  const slEst = ind.atr ? (ind.atr * 1.5).toFixed(5) : null
  const tpEst = ind.atr ? (ind.atr * 3.0).toFixed(5) : null
  const rr    = '1:2.0'

  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-4"
      style={{ background: '#161b22', border: '1px solid #30363d' }}
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <span className="font-semibold" style={{ color: '#c9d1d9' }}>{symbol}</span>

        {loading
          ? <div className="rounded animate-pulse" style={{ width: 80, height: 24, background: '#21262d' }} />
          : (
            <span
              className="text-xs font-bold px-3 py-1 rounded"
              style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
            >
              {signal}
            </span>
          )
        }
      </div>

      {/* Grid indicadores */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <IndItem label="EMA 20"   value={ind.ema20}  color="#58a6ff" />
        <IndItem label="EMA 50"   value={ind.ema50}  color="#a371f7" />
        <IndItem label="EMA 200"  value={ind.ema200} />
        <IndItem label="RSI 14"   value={ind.rsi} />
        <IndItem label="SL estimado" value={slEst ? `-${slEst}` : null} color="#f85149" />
        <IndItem label="TP estimado" value={tpEst ? `+${tpEst}` : null} color="#3fb950" />
      </div>

      {/* Info lote */}
      <div
        className="rounded-lg px-3 py-2 flex justify-between items-center text-xs"
        style={{ background: '#21262d' }}
      >
        <span style={{ color: '#8b949e' }}>Lote: <span style={{ color: '#c9d1d9' }}>{localStorage.getItem('lotSize') ?? '0.01'}</span></span>
        <span style={{ color: '#8b949e' }}>R:R <span style={{ color: '#3fb950' }}>{rr}</span></span>
        <span style={{ color: '#8b949e' }}>ATR: <span style={{ color: '#c9d1d9' }}>{ind.atr ?? '—'}</span></span>
      </div>

      {/* Resultado */}
      {result && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
          style={{
            background: result.ok ? '#0d2119' : '#2d1215',
            color:      result.ok ? '#3fb950' : '#f85149',
            border:     `1px solid ${result.ok ? '#2ea043' : '#f85149'}`,
          }}
        >
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          {result.msg}
        </div>
      )}

      {/* Botón ejecutar */}
      <button
        onClick={handleTrade}
        disabled={executing || loading || signal === 'NEUTRAL'}
        className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
        style={{
          background: signal === 'COMPRA'
            ? executing ? '#2ea043' : '#1a7f37'
            : signal === 'VENTA'
              ? executing ? '#b91c1c' : '#8b1c1c'
              : '#21262d',
          color:   signal === 'NEUTRAL' ? '#8b949e' : '#fff',
          cursor:  signal === 'NEUTRAL' ? 'not-allowed' : 'pointer',
          opacity: (loading || executing) ? 0.7 : 1,
        }}
      >
        {signal === 'COMPRA' ? <TrendingUp size={14} /> : signal === 'VENTA' ? <TrendingDown size={14} /> : <Minus size={14} />}
        {executing
          ? 'Ejecutando…'
          : signal === 'COMPRA' ? 'Ejecutar Compra'
          : signal === 'VENTA'  ? 'Ejecutar Venta'
          : 'Sin señal'}
      </button>
    </div>
  )
}

export default function Signals() {
  const [signals,    setSignals]    = useState({})
  const [loading,    setLoading]    = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const results = await Promise.all(
        PARES.map(p =>
          fetch(`${API}/signal/${p}`)
            .then(r => r.ok ? r.json() : null)
            .catch(() => null)
        )
      )
      const map = {}
      PARES.forEach((p, i) => { if (results[i]) map[p] = results[i] })
      setSignals(map)
      setLastUpdate(new Date().toLocaleTimeString('es'))
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, 15_000)
    return () => clearInterval(id)
  }, [fetchAll])

  return (
    <div className="flex flex-col gap-4">

      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold" style={{ color: '#c9d1d9' }}>
            Señales activas
          </h1>
          <p className="text-xs" style={{ color: '#8b949e' }}>
            Actualización automática cada 15 segundos
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs" style={{ color: '#8b949e' }}>
              Último: {lastUpdate}
            </span>
          )}
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
            style={{
              background: '#21262d',
              border:     '1px solid #30363d',
              color:      '#8b949e',
            }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {PARES.map(symbol => (
          <SignalCard
            key={symbol}
            symbol={symbol}
            data={signals[symbol]}
            loading={loading}
          />
        ))}
      </div>

      {/* Nota */}
      <p className="text-xs" style={{ color: '#30363d' }}>
        SL/TP calculados automáticamente usando ATR×1.5 / ATR×3.0 · Lote configurable en Configuración
      </p>
    </div>
  )
}
