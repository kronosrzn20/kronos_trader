import { useState, useEffect } from 'react'
import { API } from '../utils/constants'

function Stat({ label, value, colorValue = false }) {
  const isPositive = typeof value === 'number' ? value > 0 : String(value).startsWith('+')
  const isNegative = typeof value === 'number' ? value < 0 : String(value).startsWith('-')

  const color = colorValue
    ? isPositive ? '#3fb950' : isNegative ? '#f85149' : '#c9d1d9'
    : '#c9d1d9'

  return (
    <div className="flex items-center gap-1.5">
      <span style={{ color: '#8b949e', fontSize: 11 }}>{label}:</span>
      <span style={{ color, fontSize: 11, fontFamily: 'monospace', fontWeight: 500 }}>
        {typeof value === 'number' ? (colorValue && value > 0 ? '+' : '') + value.toFixed(2) : value ?? '—'}
      </span>
    </div>
  )
}

export default function StatusBar() {
  const [account, setAccount] = useState(null)
  const [stats,   setStats]   = useState({ pnl: 0, ops: 0, winRate: 0 })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accRes, histRes] = await Promise.all([
          fetch(`${API}/account`),
          fetch(`${API}/history`),
        ])

        if (accRes.ok) setAccount(await accRes.json())

        if (histRes.ok) {
          const hist = await histRes.json()
          const hoy  = new Date().toISOString().slice(0, 10)
          const opsHoy = (hist.operaciones ?? []).filter(op => op.tiempo.startsWith(hoy))
          const pnl    = opsHoy.reduce((s, op) => s + op.profit, 0)
          const wins   = opsHoy.filter(op => op.profit > 0).length
          setStats({
            pnl,
            ops:     opsHoy.length,
            winRate: opsHoy.length > 0 ? (wins / opsHoy.length) * 100 : 0,
          })
        }
      } catch {}
    }

    fetchData()
    const id = setInterval(fetchData, 30_000)
    return () => clearInterval(id)
  }, [])

  const fmt = (n) =>
    n != null
      ? '$' + n.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '—'

  return (
    <footer
      className="flex items-center px-4 gap-6 flex-shrink-0"
      style={{
        height: 36,
        background: '#161b22',
        borderTop: '1px solid #30363d',
      }}
    >
      <Stat label="Balance"      value={account ? fmt(account.balance) : '—'} />
      <Stat label="Equity"       value={account ? fmt(account.equity)  : '—'} />
      <Stat label="P&L hoy"      value={stats.pnl}     colorValue />
      <Stat label="Ops. hoy"     value={stats.ops} />
      <Stat label="Win rate"     value={`${stats.winRate.toFixed(0)}%`} />
      <Stat label="Margen libre" value={account ? fmt(account.margen_libre) : '—'} />
      {account && (
        <Stat label="Apalancamiento" value={`1:${account.apalancamiento}`} />
      )}
    </footer>
  )
}
