import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Clock } from 'lucide-react'
import { API } from '../utils/constants'

function PnlCell({ value }) {
  const color = value > 0 ? '#3fb950' : value < 0 ? '#f85149' : '#8b949e'
  return (
    <td className="px-4 py-3 font-mono font-medium text-right" style={{ color }}>
      {value > 0 ? '+' : ''}{value.toFixed(2)}
    </td>
  )
}

function OpenPositions({ positions, loading }) {
  if (loading) return null
  if (positions.length === 0) return null

  const pnlTotal = positions.reduce((s, p) => s + p.profit, 0)

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: '#161b22', border: '1px solid #30363d' }}
    >
      {/* Cabecera */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #30363d', background: '#21262d' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full pulse-dot"
            style={{ background: '#3fb950', boxShadow: '0 0 5px #3fb950' }}
          />
          <span className="text-sm font-medium" style={{ color: '#c9d1d9' }}>
            Posiciones abiertas
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded font-medium"
            style={{ background: '#0d2119', color: '#3fb950', border: '1px solid #2ea043' }}
          >
            {positions.length} activa{positions.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span
          className="text-sm font-mono font-semibold"
          style={{ color: pnlTotal >= 0 ? '#3fb950' : '#f85149' }}
        >
          P&L flotante: {pnlTotal >= 0 ? '+' : ''}{pnlTotal.toFixed(2)}
        </span>
      </div>

      {/* Tabla */}
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Ticket', 'Par', 'Tipo', 'Lotes', 'Entrada', 'Actual', 'SL', 'TP', 'P&L', 'Apertura'].map(h => (
              <th
                key={h}
                className="px-4 py-2.5 text-left text-xs font-medium"
                style={{ color: '#8b949e' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {positions.map(p => (
            <tr
              key={p.ticket}
              style={{ borderTop: '1px solid #21262d' }}
              onMouseEnter={e => e.currentTarget.style.background = '#21262d'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td className="px-4 py-3 font-mono text-xs" style={{ color: '#8b949e' }}>#{p.ticket}</td>
              <td className="px-4 py-3 font-medium" style={{ color: '#c9d1d9' }}>{p.symbol}</td>
              <td className="px-4 py-3">
                <span
                  className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: p.tipo === 'BUY' ? '#3fb950' : '#f85149' }}
                >
                  {p.tipo === 'BUY' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {p.tipo}
                </span>
              </td>
              <td className="px-4 py-3 font-mono" style={{ color: '#c9d1d9' }}>{p.lotes}</td>
              <td className="px-4 py-3 font-mono" style={{ color: '#c9d1d9' }}>{p.precio_entrada}</td>
              <td className="px-4 py-3 font-mono" style={{ color: '#c9d1d9' }}>{p.precio_actual}</td>
              <td className="px-4 py-3 font-mono text-xs" style={{ color: p.sl ? '#f85149' : '#30363d' }}>
                {p.sl ?? '—'}
              </td>
              <td className="px-4 py-3 font-mono text-xs" style={{ color: p.tp ? '#3fb950' : '#30363d' }}>
                {p.tp ?? '—'}
              </td>
              <PnlCell value={p.profit} />
              <td className="px-4 py-3 text-xs" style={{ color: '#8b949e' }}>
                {new Date(p.tiempo).toLocaleString('es', {
                  month: '2-digit', day: '2-digit',
                  hour: '2-digit', minute: '2-digit',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function History() {
  const [ops,       setOps]       = useState([])
  const [positions, setPositions] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const [histRes, posRes] = await Promise.all([
        fetch(`${API}/history`),
        fetch(`${API}/positions`),
      ])
      if (!histRes.ok) throw new Error(`Error ${histRes.status}: ${histRes.statusText}`)
      const histData = await histRes.json()
      setOps(histData.operaciones ?? [])
      if (posRes.ok) {
        const posData = await posRes.json()
        setPositions(posData.posiciones ?? [])
      }
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchHistory()
    const id = setInterval(fetchHistory, 10_000)
    return () => clearInterval(id)
  }, [])

  const totalPnl  = ops.reduce((s, op) => s + op.profit, 0)
  const totalSwap = ops.reduce((s, op) => s + (op.swap ?? 0), 0)
  const wins      = ops.filter(op => op.profit > 0).length
  const winRate   = ops.length > 0 ? ((wins / ops.length) * 100).toFixed(0) : 0

  return (
    <div className="flex flex-col gap-4" style={{ height: 'calc(100vh - 56px - 36px - 80px)' }}>

      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} style={{ color: '#8b949e' }} />
          <h1 className="text-base font-semibold" style={{ color: '#c9d1d9' }}>
            Historial de operaciones
          </h1>
          {!loading && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#21262d', color: '#8b949e' }}>
              {ops.length} operaciones
            </span>
          )}
        </div>
        <button
          onClick={fetchHistory}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded"
          style={{ background: '#21262d', border: '1px solid #30363d', color: '#8b949e' }}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* Posiciones abiertas */}
      <OpenPositions positions={positions} loading={loading} />

      {/* Error */}
      {error && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ background: '#2d1215', border: '1px solid #f85149', color: '#f85149' }}
        >
          {error}
        </div>
      )}

      {/* Tabla */}
      <div
        className="rounded-lg overflow-hidden flex flex-col flex-1"
        style={{ background: '#161b22', border: '1px solid #30363d' }}
      >
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#21262d', position: 'sticky', top: 0, zIndex: 1 }}>
                {['Ticket', 'Par', 'Tipo', 'Lotes', 'Precio', 'Swap', 'P&L', 'Hora'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium"
                    style={{ color: '#8b949e' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading
                ? [...Array(6)].map((_, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #21262d' }}>
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div
                            className="rounded animate-pulse"
                            style={{ height: 14, background: '#21262d' }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                : ops.length === 0
                  ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-12 text-center text-sm"
                        style={{ color: '#8b949e' }}
                      >
                        No hay operaciones en el historial
                      </td>
                    </tr>
                  )
                  : ops.map(op => (
                    <tr
                      key={op.ticket}
                      style={{ borderBottom: '1px solid #21262d' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#21262d'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: '#8b949e' }}>
                        #{op.ticket}
                      </td>
                      <td className="px-4 py-3 font-medium" style={{ color: '#c9d1d9' }}>
                        {op.symbol}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="flex items-center gap-1 text-xs font-medium"
                          style={{ color: op.tipo === 'BUY' ? '#3fb950' : '#f85149' }}
                        >
                          {op.tipo === 'BUY'
                            ? <TrendingUp size={11} />
                            : <TrendingDown size={11} />
                          }
                          {op.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: '#c9d1d9' }}>
                        {op.lotes}
                      </td>
                      <td className="px-4 py-3 font-mono" style={{ color: '#c9d1d9' }}>
                        {op.precio}
                      </td>
                      <td className="px-4 py-3 font-mono text-right" style={{ color: '#8b949e' }}>
                        {op.swap?.toFixed(2) ?? '0.00'}
                      </td>
                      <PnlCell value={op.profit} />
                      <td className="px-4 py-3 text-xs" style={{ color: '#8b949e' }}>
                        {new Date(op.tiempo).toLocaleString('es', {
                          month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Footer con resumen */}
        {!loading && ops.length > 0 && (
          <div
            className="px-4 py-3 flex items-center justify-between flex-shrink-0"
            style={{ borderTop: '1px solid #30363d', background: '#21262d' }}
          >
            <div className="flex items-center gap-6 text-xs" style={{ color: '#8b949e' }}>
              <span>Win rate: <span style={{ color: '#c9d1d9' }}>{winRate}%</span></span>
              <span>Ganadoras: <span style={{ color: '#3fb950' }}>{wins}</span></span>
              <span>Perdedoras: <span style={{ color: '#f85149' }}>{ops.length - wins}</span></span>
              <span>Swap total: <span style={{ color: totalSwap < 0 ? '#f85149' : '#c9d1d9' }}>{totalSwap.toFixed(2)}</span></span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: '#8b949e' }}>P&L Total</span>
              <span
                className="font-semibold font-mono"
                style={{ color: totalPnl > 0 ? '#3fb950' : totalPnl < 0 ? '#f85149' : '#8b949e' }}
              >
                {totalPnl > 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
