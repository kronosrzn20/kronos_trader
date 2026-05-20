import { useState, useEffect, useRef } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { API, PARES } from '../utils/constants'

function Toggle({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span className="text-xs" style={{ color: '#8b949e' }}>{label}</span>
      <div
        onClick={() => onChange(!value)}
        className="relative rounded-full cursor-pointer"
        style={{
          width: 36, height: 20,
          background: value ? '#1f6feb' : '#30363d',
          transition: 'background 0.2s',
        }}
      >
        <span
          className="absolute top-0.5 rounded-full bg-white"
          style={{
            width: 16, height: 16,
            left: value ? 18 : 2,
            transition: 'left 0.2s',
          }}
        />
      </div>
    </label>
  )
}

export default function Topbar() {
  const {
    activePair, setActivePair,
    mt5Connected,
    llmEnabled, setLlmEnabled,
    autoTrade,  setAutoTrade,
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

      {/* Toggles */}
      <Toggle label="LLM Noticias" value={llmEnabled} onChange={setLlmEnabled} />
      <Toggle label="Auto-trade"   value={autoTrade}   onChange={setAutoTrade}  />

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
