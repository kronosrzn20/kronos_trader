import { useState, useEffect, useRef } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { API, PARES } from '../utils/constants'

export default function Topbar() {
  const {
    activePair,      setActivePair,
    mt5Connected,
    activeStrategy,  setActiveStrategy,
  } = useApp()

  const [priceData,   setPriceData]   = useState(null)
  const [priceChange, setPriceChange] = useState(0)
  const basePriceRef = useRef(null)

  useEffect(() => {
    basePriceRef.current = null
    setPriceData(null)
    setPriceChange(0)

    const fetchPrice = async () => {
      try {
        const res = await fetch(`${API}/price/${activePair}`)
        if (!res.ok) return
        const data = await res.json()
        if (basePriceRef.current === null) basePriceRef.current = data.bid
        setPriceChange(((data.bid - basePriceRef.current) / basePriceRef.current) * 100)
        setPriceData(data)
      } catch {}
    }

    fetchPrice()
    const id = setInterval(fetchPrice, 5000)
    return () => clearInterval(id)
  }, [activePair])

  const changePositive = priceChange >= 0

  return (
    <header
      className="flex items-center px-4 gap-5 flex-shrink-0"
      style={{
        height: 56,
        background: '#161b22',
        borderBottom: '1px solid #30363d',
      }}
    >
      {/* Par selector */}
      <select
        value={activePair}
        onChange={e => setActivePair(e.target.value)}
        className="text-sm rounded px-3 py-1.5 outline-none cursor-pointer"
        style={{
          background: '#21262d',
          border: '1px solid #30363d',
          color: '#c9d1d9',
        }}
      >
        {PARES.map(p => <option key={p} value={p}>{p}</option>)}
      </select>

      {/* Selector de estrategia — visible solo cuando el par es XAUUSD */}
      {activePair === 'XAUUSD' && (
        <select
          value={activeStrategy}
          onChange={e => setActiveStrategy(e.target.value)}
          className="text-xs rounded px-2.5 py-1.5 outline-none cursor-pointer font-medium"
          style={{
            background: activeStrategy === 'SMC_GOLD' ? '#1a2f1a' : '#21262d',
            border: `1px solid ${activeStrategy === 'SMC_GOLD' ? '#2ea043' : '#30363d'}`,
            color: activeStrategy === 'SMC_GOLD' ? '#3fb950' : '#8b949e',
          }}
          title="Estrategia de análisis para XAUUSD"
        >
          <option value="EMA_RSI">EMA + RSI</option>
          <option value="SMC_GOLD">⚡ SMC Gold (IA)</option>
        </select>
      )}

      {/* Precio en vivo */}
      <div className="flex items-baseline gap-2">
        <span
          className="text-xl font-mono font-semibold"
          style={{ color: '#c9d1d9' }}
        >
          {priceData?.bid?.toFixed(5) ?? '—'}
        </span>
        <span
          className="text-sm font-mono"
          style={{ color: changePositive ? '#3fb950' : '#f85149' }}
        >
          {changePositive ? '+' : ''}{priceChange.toFixed(3)}%
        </span>
      </div>

      {/* Spread */}
      {priceData && (
        <span className="text-xs" style={{ color: '#8b949e' }}>
          Spread: <span style={{ color: '#c9d1d9' }}>{priceData.spread}</span> pips
        </span>
      )}

      <div className="flex-1" />

      {/* Badge conexión MT5 */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
        style={{
          background:   mt5Connected ? '#0d2119' : '#2d1215',
          border:       `1px solid ${mt5Connected ? '#2ea043' : '#f85149'}`,
          color:        mt5Connected ? '#3fb950' : '#f85149',
        }}
      >
        {mt5Connected ? <Wifi size={12} /> : <WifiOff size={12} />}
        MT5 {mt5Connected ? 'Conectado' : 'Desconectado'}
      </div>
    </header>
  )
}
