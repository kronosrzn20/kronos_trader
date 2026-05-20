import { useState, useEffect } from 'react'
import { Save, Check, Settings, Wifi, WifiOff, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { API, PARES, TEMPORALIDADES } from '../utils/constants'

const DEFAULTS = {
  simbolo:     'EURUSD',
  temporalidad:'M15',
  riesgo:      1.0,
  multSL:      1.5,
  multTP:      3.0,
  lotSize:     0.01,
  soloLondres: false,
}

function loadConfig() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('agentConfig') ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#8b949e' }}>
      {children}
    </h2>
  )
}

function Divider() {
  return <hr style={{ borderColor: '#30363d' }} />
}

function SliderField({ label, name, value, onChange, min, max, step, suffix = '' }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <label className="text-sm" style={{ color: '#c9d1d9' }}>{label}</label>
        <span className="text-sm font-mono font-medium" style={{ color: '#58a6ff' }}>
          {value}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(name, parseFloat(e.target.value))}
        className="w-full cursor-pointer"
        style={{ accentColor: '#58a6ff' }}
      />
      <div className="flex justify-between text-xs" style={{ color: '#30363d' }}>
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
    </div>
  )
}

function SelectField({ label, name, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm" style={{ color: '#c9d1d9' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(name, e.target.value)}
        className="text-sm px-3 py-2 rounded outline-none"
        style={{ background: '#21262d', border: '1px solid #30363d', color: '#c9d1d9' }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function ToggleField({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #21262d' }}>
      <div>
        <p className="text-sm" style={{ color: '#c9d1d9' }}>{label}</p>
        {desc && <p className="text-xs" style={{ color: '#8b949e' }}>{desc}</p>}
      </div>
      <div
        onClick={onChange}
        className="relative rounded-full cursor-pointer flex-shrink-0"
        style={{
          width: 40, height: 22,
          background: value ? '#1f6feb' : '#30363d',
          transition: 'background 0.2s',
        }}
      >
        <span
          className="absolute top-1 rounded-full bg-white"
          style={{
            width: 16, height: 16,
            left: value ? 21 : 3,
            transition: 'left 0.2s',
          }}
        />
      </div>
    </div>
  )
}

// ── Sección Conexión MT5 ──────────────────────────────────────────────────────

function MT5Section() {
  const { mt5Connected } = useApp()
  const [creds,        setCreds]        = useState({ login: '', password: '', server: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [status,       setStatus]       = useState(null)   // {ok, msg}
  const [loading,      setLoading]      = useState(false)
  const [loaded,       setLoaded]       = useState(false)

  useEffect(() => {
    fetch(`${API}/mt5-config`)
      .then(r => r.json())
      .then(d => {
        setCreds(prev => ({
          ...prev,
          login:  d.login ?? '',
          server: d.server ?? '',
          password: d.password_set ? '••••••••' : '',
        }))
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const handleSave = async () => {
    if (!creds.login || !creds.server) return
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`${API}/mt5-config`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          login:    parseInt(creds.login),
          password: creds.password.includes('•') ? undefined : creds.password,
          server:   creds.server,
        }),
      })
      const data = await res.json()
      setStatus({ ok: data.ok, msg: data.mensaje })
    } catch {
      setStatus({ ok: false, msg: 'No se pudo conectar con la API' })
    }
    setLoading(false)
  }

  const handleReconnect = async () => {
    setLoading(true)
    setStatus(null)
    try {
      const res  = await fetch(`${API}/reconnect`, { method: 'POST' })
      const data = await res.json()
      setStatus({ ok: data.ok, msg: data.mensaje })
    } catch {
      setStatus({ ok: false, msg: 'Error al intentar reconectar' })
    }
    setLoading(false)
  }

  const inputStyle = {
    background: '#21262d',
    border: '1px solid #30363d',
    color: '#c9d1d9',
    borderRadius: 6,
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  }

  return (
    <div
      className="rounded-lg p-6 flex flex-col gap-5"
      style={{ background: '#161b22', border: '1px solid #30363d' }}
    >
      {/* Cabecera con estado */}
      <div className="flex items-center justify-between">
        <SectionTitle>Conexión MetaTrader 5</SectionTitle>
        <div
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded"
          style={{
            background: mt5Connected ? '#0d2119' : '#2d1215',
            color:      mt5Connected ? '#3fb950' : '#f85149',
            border:     `1px solid ${mt5Connected ? '#2ea043' : '#f85149'}`,
          }}
        >
          {mt5Connected ? <Wifi size={11} /> : <WifiOff size={11} />}
          {mt5Connected ? 'Conectado' : 'Desconectado'}
        </div>
      </div>

      <p className="text-xs" style={{ color: '#8b949e', marginTop: -12 }}>
        Las credenciales se guardan en <code style={{ color: '#58a6ff' }}>mt5_credentials.json</code> en la carpeta del agente. No se modifica el archivo .env.
      </p>

      {/* Campos */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm" style={{ color: '#c9d1d9' }}>Número de cuenta</label>
          <input
            type="number"
            placeholder="Ej: 12345678"
            value={creds.login}
            onChange={e => setCreds(p => ({ ...p, login: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm" style={{ color: '#c9d1d9' }}>Servidor</label>
          <input
            type="text"
            placeholder="Ej: MetaQuotes-Demo"
            value={creds.server}
            onChange={e => setCreds(p => ({ ...p, server: e.target.value }))}
            style={inputStyle}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm" style={{ color: '#c9d1d9' }}>Contraseña</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Contraseña de la cuenta"
            value={creds.password}
            onChange={e => setCreds(p => ({ ...p, password: e.target.value }))}
            style={{ ...inputStyle, paddingRight: 40 }}
          />
          <button
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: '#8b949e', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Resultado */}
      {status && (
        <div
          className="rounded-lg px-4 py-3 text-xs"
          style={{
            background: status.ok ? '#0d2119' : '#2d1215',
            color:      status.ok ? '#3fb950' : '#f85149',
            border:     `1px solid ${status.ok ? '#2ea043' : '#f85149'}`,
          }}
        >
          {status.msg}
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={loading || !creds.login || !creds.server}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
          style={{
            background: '#1f6feb',
            color: '#fff',
            opacity: (loading || !creds.login || !creds.server) ? 0.5 : 1,
            cursor: (!creds.login || !creds.server) ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar y reconectar
        </button>
        <button
          onClick={handleReconnect}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm"
          style={{
            background: '#21262d',
            border: '1px solid #30363d',
            color: '#8b949e',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Reconectar
        </button>
      </div>
    </div>
  )
}

// ── Config page ────────────────────────────────────────────────────────────────

export default function Config() {
  const { llmEnabled, setLlmEnabled, autoTrade, setAutoTrade } = useApp()
  const [config,  setConfig]  = useState(loadConfig)
  const [saved,   setSaved]   = useState(false)
  const [saving,  setSaving]  = useState(false)

  const set = (name, value) => setConfig(prev => ({ ...prev, [name]: value }))

  const handleSave = async () => {
    setSaving(true)
    const full = { ...config, llmEnabled, autoTrade }
    localStorage.setItem('agentConfig', JSON.stringify(full))
    localStorage.setItem('lotSize', String(config.lotSize))

    try {
      await fetch(`${API}/config`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          simbolo:      config.simbolo,
          temporalidad: config.temporalidad,
          riesgo:       config.riesgo,
          mult_sl:      config.multSL,
          mult_tp:      config.multTP,
          auto_trade:   autoTrade,
          llm_enabled:  llmEnabled,
          solo_londres: config.soloLondres,
        }),
      })
    } catch {}

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const rr = (config.multTP / config.multSL).toFixed(1)

  return (
    <div className="flex flex-col gap-4 overflow-auto pb-6" style={{ maxWidth: 680 }}>

      <div className="flex items-center gap-2">
        <Settings size={16} style={{ color: '#8b949e' }} />
        <h1 className="text-base font-semibold" style={{ color: '#c9d1d9' }}>
          Configuración del agente
        </h1>
      </div>

      {/* ── Conexión MT5 ─────────────────────────────────────────────────── */}
      <MT5Section />

      <div
        className="rounded-lg p-6 flex flex-col gap-6"
        style={{ background: '#161b22', border: '1px solid #30363d' }}
      >
        {/* ── Mercado ────────────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Mercado</SectionTitle>
          <div className="grid grid-cols-2 gap-4">
            <SelectField label="Símbolo"      name="simbolo"      value={config.simbolo}      onChange={set} options={PARES} />
            <SelectField label="Temporalidad" name="temporalidad" value={config.temporalidad} onChange={set} options={TEMPORALIDADES} />
          </div>
        </section>

        <Divider />

        {/* ── Riesgo ─────────────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Gestión de riesgo</SectionTitle>
          <div className="flex flex-col gap-5">
            <SliderField label="Riesgo por trade"             name="riesgo" value={config.riesgo} onChange={set} min={0.5} max={5}   step={0.5} suffix="%" />
            <SliderField label="Multiplicador ATR — Stop Loss" name="multSL" value={config.multSL} onChange={set} min={1}   max={3}   step={0.5} suffix="×" />
            <SliderField label="Multiplicador ATR — Take Profit" name="multTP" value={config.multTP} onChange={set} min={1} max={5}   step={0.5} suffix="×" />

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <label className="text-sm" style={{ color: '#c9d1d9' }}>Tamaño de lote</label>
                <span className="text-sm font-mono" style={{ color: '#58a6ff' }}>{config.lotSize}</span>
              </div>
              <input
                type="number"
                min={0.01} max={100} step={0.01}
                value={config.lotSize}
                onChange={e => set('lotSize', parseFloat(e.target.value))}
                className="text-sm px-3 py-2 rounded outline-none"
                style={{
                  background: '#21262d',
                  border: '1px solid #30363d',
                  color: '#c9d1d9',
                  width: 120,
                }}
              />
            </div>
          </div>
        </section>

        <Divider />

        {/* ── Opciones ───────────────────────────────────────────────────── */}
        <section>
          <SectionTitle>Opciones</SectionTitle>
          <ToggleField
            label="LLM Noticias"
            desc="Analizar noticias con inteligencia artificial"
            value={llmEnabled}
            onChange={() => setLlmEnabled(v => !v)}
          />
          <ToggleField
            label="Auto-trade"
            desc="Ejecutar órdenes automáticamente cuando hay señal"
            value={autoTrade}
            onChange={() => setAutoTrade(v => !v)}
          />
          <ToggleField
            label="Solo sesión Londres / NY"
            desc="Operar únicamente en horario de alta liquidez (08:00–17:00 UTC)"
            value={config.soloLondres}
            onChange={() => set('soloLondres', !config.soloLondres)}
          />
        </section>

        <Divider />

        {/* ── Resumen de parámetros ──────────────────────────────────────── */}
        <div
          className="rounded-lg p-4 text-xs flex flex-wrap gap-4"
          style={{ background: '#21262d' }}
        >
          <span style={{ color: '#8b949e' }}>
            Ratio R:R estimado:{' '}
            <span style={{ color: '#3fb950', fontWeight: 600 }}>1:{rr}</span>
          </span>
          <span style={{ color: '#8b949e' }}>
            Riesgo:{' '}
            <span style={{ color: '#f85149', fontWeight: 600 }}>{config.riesgo}%</span>
            {' '}del balance por trade
          </span>
          <span style={{ color: '#8b949e' }}>
            SL: <span style={{ color: '#c9d1d9' }}>ATR × {config.multSL}</span>
            {' · '}
            TP: <span style={{ color: '#c9d1d9' }}>ATR × {config.multTP}</span>
          </span>
        </div>

        {/* ── Botón guardar ──────────────────────────────────────────────── */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium"
          style={{
            background: saved ? '#0d2119' : '#1f6feb',
            color:      saved ? '#3fb950' : '#fff',
            border:     saved ? '1px solid #2ea043' : '1px solid transparent',
            opacity:    saving ? 0.7 : 1,
            cursor:     saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? 'Configuración guardada' : saving ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </div>
    </div>
  )
}
