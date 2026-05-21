/**
 * SmcSignalPanel
 * Panel de análisis Smart Money Concepts (SMC) para XAUUSD.
 * Se muestra en el Dashboard cuando la estrategia activa es "SMC_GOLD".
 */

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, Minus, RefreshCw, Zap, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react'
import { API } from '../utils/constants'

// ── Glosario de términos técnicos (tooltip al pasar el mouse) ─────────────────
const GLOSARIO = {
  CHoCH: 'Cambio de Carácter (CHoCH): Primera señal de que la tendencia podría estar cambiando de dirección. El precio rompió un punto clave en sentido contrario a la tendencia anterior.',
  BOS:   'Ruptura de Estructura (BOS): Confirma que la tendencia actual continúa. El precio rompió un máximo o mínimo previo siguiendo la misma dirección.',
  OB:    'Zona Institucional (Order Block): Área donde bancos y fondos de inversión colocaron órdenes grandes. El precio suele rebotar al volver a visitar estas zonas.',
  FVG:   'Hueco de precio (Fair Value Gap): Espacio dejado por un movimiento muy rápido del precio. El mercado tiende a volver a cubrir estos huecos antes de continuar.',
  SMT:   'Divergencia SMT: El Oro y la Plata normalmente se mueven juntos. Si uno sube y el otro baja, indica una posible trampa de liquidez — señal de alerta.',
  BULLISH: 'Alcista — el precio podría subir',
  BEARISH: 'Bajista — el precio podría bajar',
}

// ── Helpers de color ──────────────────────────────────────────────────────────

const COLOR = {
  alcista: '#3fb950',
  bajista: '#f85149',
  neutral: '#8b949e',
  bg:      '#0d1117',
  panel:   '#161b22',
  hover:   '#21262d',
  borde:   '#30363d',
  texto:   '#c9d1d9',
  muted:   '#8b949e',
}

function colorSenal(senal) {
  if (senal === 'COMPRA') return COLOR.alcista
  if (senal === 'VENTA')  return COLOR.bajista
  return COLOR.neutral
}

// ── Señal Badge ───────────────────────────────────────────────────────────────

function SignalBadge({ senal }) {
  const MAP = {
    COMPRA:  { color: '#3fb950', bg: '#0d2119', border: '#2ea043', Icon: TrendingUp,   label: 'COMPRA'  },
    VENTA:   { color: '#f85149', bg: '#2d1215', border: '#f85149', Icon: TrendingDown, label: 'VENTA'   },
    NEUTRAL: { color: '#8b949e', bg: '#21262d', border: '#30363d', Icon: Minus,        label: 'NEUTRAL' },
  }
  const c = MAP[senal] ?? MAP.NEUTRAL
  return (
    <div
      className="flex items-center gap-2 px-4 py-3 rounded-lg"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}
    >
      <c.Icon size={18} />
      <span className="text-base font-bold tracking-wide">{c.label}</span>
      <span className="ml-auto text-xs font-normal opacity-70">SMC Gold</span>
    </div>
  )
}

// ── DXY Badge ─────────────────────────────────────────────────────────────────

function DxyBadge({ dxy, sesgoXau }) {
  if (!dxy) return null
  const impactoColor = sesgoXau === 'ALCISTA' ? COLOR.alcista
                     : sesgoXau === 'BAJISTA' ? COLOR.bajista
                     : COLOR.neutral
  return (
    <div
      className="flex items-center justify-between rounded-lg px-3 py-2"
      style={{ background: COLOR.hover }}
    >
      <div>
        <p className="text-xs font-semibold" style={{ color: COLOR.texto }}>
          Fuerza del Dólar (DXY)
        </p>
        <p className="text-xs" style={{ color: COLOR.muted, fontSize: 10, marginBottom: 2 }}>
          Dólar fuerte = Oro tiende a bajar
        </p>
        <p className="text-xs" style={{ color: COLOR.muted }}>
          {dxy.valor ? `${dxy.valor}` : 'Sin datos'}
          {dxy.cambio_pct !== undefined && (
            <span style={{ color: dxy.cambio_pct >= 0 ? COLOR.alcista : COLOR.bajista, marginLeft: 6 }}>
              {dxy.cambio_pct >= 0 ? '+' : ''}{dxy.cambio_pct}%
            </span>
          )}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs font-medium" style={{ color: impactoColor }}>
          {dxy.sesgo ?? '—'}
        </p>
        <p className="text-xs" style={{ color: COLOR.muted }}>
          Oro: <span style={{ color: impactoColor }}>{sesgoXau ?? '—'}</span>
        </p>
      </div>
    </div>
  )
}

// ── Estructura de Mercado ─────────────────────────────────────────────────────

function EstructuraBadge({ estructura }) {
  if (!estructura) return null
  const tipo      = estructura.tipo ?? 'Sin estructura'
  const direccion = estructura.direccion ?? 'NEUTRAL'
  const color     = direccion === 'ALCISTA' ? COLOR.alcista
                  : direccion === 'BAJISTA' ? COLOR.bajista
                  : COLOR.neutral

  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{ background: COLOR.hover }}
    >
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className="text-xs font-semibold" style={{ color: COLOR.texto }}>
            Estructura del mercado
          </span>
          <p className="text-xs mt-0.5" style={{ color: COLOR.muted, fontSize: 10 }}>
            ¿Está cambiando o siguiendo la tendencia?
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-bold px-2 py-0.5 rounded cursor-help"
            style={{
              background: color + '22',
              color,
              border: `1px solid ${color}44`,
            }}
            title={GLOSARIO[tipo] ?? tipo}
          >
            {tipo === 'CHoCH' ? '🔄 Cambio de tendencia'
             : tipo === 'BOS'  ? '➡ Sigue la tendencia'
             : tipo}
          </span>
          <span className="text-xs font-medium" style={{ color }}>
            {direccion === 'ALCISTA' ? '↑' : direccion === 'BAJISTA' ? '↓' : '↔'}
          </span>
        </div>
      </div>
      {estructura.descripcion && (
        <p className="text-xs" style={{ color: COLOR.muted, lineHeight: 1.5 }}>
          {estructura.descripcion}
        </p>
      )}
      {estructura.nivel && (
        <p className="text-xs mt-1" style={{ color: COLOR.muted }}>
          Nivel clave:{' '}
          <span style={{ color: COLOR.texto, fontFamily: 'monospace' }}>
            ${estructura.nivel}
          </span>
        </p>
      )}
    </div>
  )
}

// ── Checklist de Confluencias ─────────────────────────────────────────────────

function Checklist({ checklist, confluencias_ok, total }) {
  if (!checklist?.length) return null

  const fuerza =
    confluencias_ok >= 5 ? { label: 'Señal muy fuerte', color: COLOR.alcista } :
    confluencias_ok >= 4 ? { label: 'Señal sólida',     color: '#e3b341'      } :
    confluencias_ok >= 3 ? { label: 'Señal débil',       color: '#f0883e'      } :
                            { label: 'Sin confirmar',     color: COLOR.bajista  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: COLOR.texto }}>
          Confluencias
        </span>
        <span className="text-xs font-semibold" style={{ color: fuerza.color }}>
          {fuerza.label} · {confluencias_ok}/{total}
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="rounded-full overflow-hidden" style={{ height: 4, background: COLOR.hover }}>
        <div
          className="rounded-full"
          style={{
            width:      `${(confluencias_ok / total) * 100}%`,
            height:     '100%',
            background: fuerza.color,
            transition: 'width 0.5s ease',
          }}
        />
      </div>

      {checklist.map((c, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded px-2.5 py-2"
          style={{ background: c.cumplida ? '#0d2119' : '#1a1a1a' }}
        >
          <span style={{ color: c.cumplida ? COLOR.alcista : COLOR.borde, fontSize: 13, lineHeight: 1.2, flexShrink: 0 }}>
            {c.cumplida ? '✓' : '○'}
          </span>
          <div>
            <p className="text-xs font-medium" style={{ color: c.cumplida ? COLOR.texto : COLOR.muted }}>
              {c.nombre}
            </p>
            <p className="text-xs" style={{ color: c.cumplida ? COLOR.muted : '#30363d', marginTop: 1, lineHeight: 1.4 }}>
              {c.valor}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Zonas OB / FVG ────────────────────────────────────────────────────────────

function ZonasPanel({ orderBlocks, fvgs, precio }) {
  const relevantes = [
    ...(orderBlocks ?? []).slice(0, 2).map(z => ({ ...z, origen: 'OB' })),
    ...(fvgs        ?? []).slice(0, 2).map(z => ({ ...z, origen: 'FVG' })),
  ].sort((a, b) => Math.abs(a.mitad - precio) - Math.abs(b.mitad - precio))

  if (!relevantes.length) return null

  const NOMBRE_ZONA = {
    OB:  { label: 'Zona institucional', tooltip: GLOSARIO.OB  },
    FVG: { label: 'Hueco de precio',    tooltip: GLOSARIO.FVG },
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <span className="text-xs font-medium" style={{ color: COLOR.texto }}>
          Zonas clave del mercado
        </span>
        <p className="text-xs" style={{ color: COLOR.muted, fontSize: 10 }}>
          Áreas donde el precio podría reaccionar
        </p>
      </div>
      {relevantes.slice(0, 3).map((z, i) => {
        const color     = z.tipo === 'BULLISH' ? COLOR.alcista : COLOR.bajista
        const dist      = Math.abs((z.mitad ?? z.mitad) - precio).toFixed(2)
        const zonaInfo  = NOMBRE_ZONA[z.origen] ?? { label: z.origen, tooltip: '' }
        const dirLabel  = z.tipo === 'BULLISH' ? 'soporte ▲' : 'resistencia ▼'
        return (
          <div
            key={i}
            className="flex items-center justify-between rounded px-2.5 py-1.5"
            style={{ background: COLOR.hover, borderLeft: `2px solid ${color}` }}
          >
            <div>
              <span
                className="text-xs font-semibold cursor-help"
                style={{ color }}
                title={zonaInfo.tooltip}
              >
                {zonaInfo.label} — {dirLabel}
              </span>
              <div className="text-xs mt-0.5" style={{ color: COLOR.muted, fontFamily: 'monospace', fontSize: 10 }}>
                {z.bajo ?? z.inferior} – {z.alto ?? z.superior}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs" style={{ color: COLOR.muted }}>
                a <span style={{ color: COLOR.texto, fontFamily: 'monospace' }}>${dist}</span>
              </span>
              {z.mitigado && (
                <div className="text-xs" style={{ color: '#f0883e' }}>ya visitada</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Niveles SL / TP ───────────────────────────────────────────────────────────

function NivelesPanel({ sl, tp1, tp2, tp3, precio, senal }) {
  if (!sl || !tp1) return null

  const color = senal === 'COMPRA' ? COLOR.alcista : COLOR.bajista
  const rr    = tp1 && sl && precio
    ? Math.abs(tp1 - precio) / Math.abs(precio - sl)
    : null

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLOR.borde}` }}>
      <p
        className="text-center text-xs py-1.5 font-medium"
        style={{ color: COLOR.muted, background: COLOR.hover, borderBottom: `1px solid ${COLOR.borde}` }}
      >
        Niveles de la operación
      </p>

      {/* SL / Entrada / TP1 */}
      <div className="grid grid-cols-3" style={{ background: COLOR.bg }}>
        <div className="text-center py-2 px-1" style={{ borderRight: `1px solid ${COLOR.borde}` }}>
          <p style={{ fontSize: 9, color: COLOR.bajista, marginBottom: 3 }}>🛑 Stop Loss</p>
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: COLOR.bajista, fontWeight: 700 }}>
            {sl?.toFixed(2)}
          </p>
        </div>
        <div className="text-center py-2 px-1" style={{ borderRight: `1px solid ${COLOR.borde}` }}>
          <p style={{ fontSize: 9, color: COLOR.muted, marginBottom: 3 }}>📍 Entrada</p>
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: COLOR.texto, fontWeight: 700 }}>
            {precio?.toFixed(2)}
          </p>
        </div>
        <div className="text-center py-2 px-1">
          <p style={{ fontSize: 9, color: COLOR.alcista, marginBottom: 3 }}>🎯 TP 1</p>
          <p style={{ fontSize: 11, fontFamily: 'monospace', color: COLOR.alcista, fontWeight: 700 }}>
            {tp1?.toFixed(2)}
          </p>
        </div>
      </div>

      {/* TP2 / TP3 */}
      {(tp2 || tp3) && (
        <div
          className="flex justify-around py-1.5"
          style={{ borderTop: `1px solid ${COLOR.borde}`, background: COLOR.hover }}
        >
          {tp2 && (
            <span className="text-xs" style={{ color: COLOR.muted }}>
              TP 2: <span style={{ color, fontFamily: 'monospace', fontWeight: 600 }}>{tp2?.toFixed(2)}</span>
            </span>
          )}
          {tp3 && (
            <span className="text-xs" style={{ color: COLOR.muted }}>
              TP 3: <span style={{ color, fontFamily: 'monospace', fontWeight: 600 }}>{tp3?.toFixed(2)}</span>
            </span>
          )}
        </div>
      )}

      {/* R:R */}
      {rr && (
        <div
          className="text-center text-xs py-1"
          style={{ color: COLOR.muted, borderTop: `1px solid ${COLOR.borde}` }}
        >
          Riesgo/Beneficio:{' '}
          <span style={{ color: rr >= 3 ? COLOR.alcista : rr >= 2 ? '#e3b341' : COLOR.bajista, fontWeight: 600 }}>
            1:{rr.toFixed(1)}
          </span>
          {rr < 3 && (
            <span style={{ color: '#f0883e', marginLeft: 6 }}>
              (mínimo recomendado: 1:3)
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Explicación GPT ───────────────────────────────────────────────────────────

function GptExplanation({ texto, senal }) {
  if (!texto) return null
  const color = colorSenal(senal)

  return (
    <div
      className="rounded-lg px-3 py-3"
      style={{ background: COLOR.hover, borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Zap size={11} style={{ color }} />
        <span className="text-xs font-semibold" style={{ color }}>
          Análisis GPT-4o-mini
        </span>
      </div>
      <p className="text-xs" style={{ color: COLOR.texto, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
        {texto}
      </p>
    </div>
  )
}

// ── Botón de Tomar Entrada ────────────────────────────────────────────────────

function TradeButton({ senal, precio, sl, tp1, lotes_info, mt5Symbol }) {
  const [estado,    setEstado]    = useState('idle')   // idle | confirm | loading | success | error
  const [mensaje,   setMensaje]   = useState('')

  if (!senal || senal === 'NEUTRAL' || !sl || !tp1) return null

  const tipo         = senal === 'COMPRA' ? 'BUY' : 'SELL'
  const color        = senal === 'COMPRA' ? COLOR.alcista : COLOR.bajista
  const bgColor      = senal === 'COMPRA' ? '#0d2f1a' : '#2d1215'
  const borderColor  = senal === 'COMPRA' ? '#2ea043' : '#f85149'
  const lotes        = lotes_info?.lotes ?? 0.01
  const dineroRiesgo = lotes_info?.dinero_en_riesgo ?? '—'
  const slDist       = lotes_info?.sl_distancia ?? '—'

  const ejecutar = async () => {
    setEstado('loading')
    setMensaje('')
    try {
      const res = await fetch(`${API}/trade`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: mt5Symbol || 'GOLD',  // nombre real del broker (viene del backend)
          type:   tipo,
          lot:    lotes,
          sl:     sl,
          tp:     tp1,
        }),
      })
      const data = await res.json()
      if (res.ok && data.exito) {
        setEstado('success')
        setMensaje(`Orden ejecutada — Ticket #${data.ticket} | ${tipo} ${lotes} lotes @ ${data.precio}`)
      } else {
        setEstado('error')
        setMensaje(data.detail ?? data.mensaje ?? 'Error desconocido al ejecutar la orden')
      }
    } catch (e) {
      setEstado('error')
      setMensaje('No se pudo conectar con la API')
    }
  }

  return (
    <div className="flex flex-col gap-2">

      {/* Resumen de la orden */}
      <div
        className="rounded-lg p-3"
        style={{ background: bgColor, border: `1px solid ${borderColor}44` }}
      >
        <p className="text-xs font-semibold mb-2" style={{ color }}>
          {senal === 'COMPRA' ? '▲ Orden de COMPRA' : '▼ Orden de VENTA'} — XAUUSD
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span style={{ color: COLOR.muted }}>Entrada</span>
          <span style={{ color: COLOR.texto, fontFamily: 'monospace' }}>${precio}</span>
          <span style={{ color: COLOR.muted }}>Stop Loss</span>
          <span style={{ color: COLOR.bajista, fontFamily: 'monospace' }}>${sl}</span>
          <span style={{ color: COLOR.muted }}>Take Profit</span>
          <span style={{ color: COLOR.alcista, fontFamily: 'monospace' }}>${tp1}</span>
          <span style={{ color: COLOR.muted }}>Lotes (riesgo {lotes_info?.riesgo_pct ?? 1}%)</span>
          <span style={{ color: COLOR.texto, fontFamily: 'monospace' }}>{lotes}</span>
          <span style={{ color: COLOR.muted }}>Dinero en riesgo</span>
          <span style={{ color: '#e3b341', fontFamily: 'monospace' }}>${dineroRiesgo}</span>
          <span style={{ color: COLOR.muted }}>Distancia SL</span>
          <span style={{ color: COLOR.muted, fontFamily: 'monospace' }}>${slDist}</span>
        </div>
      </div>

      {/* Feedback de éxito/error */}
      {estado === 'success' && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
          style={{ background: '#0d2119', border: '1px solid #2ea043', color: COLOR.alcista }}
        >
          <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" />
          <span>{mensaje}</span>
        </div>
      )}
      {estado === 'error' && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
          style={{ background: '#2d1215', border: '1px solid #f85149', color: COLOR.bajista }}
        >
          <XCircle size={13} className="flex-shrink-0 mt-0.5" />
          <span>{mensaje}</span>
        </div>
      )}

      {/* Advertencia antes de confirmar */}
      {estado === 'confirm' && (
        <div
          className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
          style={{ background: '#2d1f0d', border: '1px solid #e3b341', color: '#e3b341' }}
        >
          <ShieldAlert size={13} className="flex-shrink-0 mt-0.5" />
          <span>¿Confirmar la ejecución de la orden? Esta acción enviará una orden real a MT5.</span>
        </div>
      )}

      {/* Botones */}
      {estado === 'idle' && (
        <button
          onClick={() => setEstado('confirm')}
          className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: color + '22', border: `1px solid ${color}`, color }}
        >
          {senal === 'COMPRA' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          Tomar Entrada ({tipo})
        </button>
      )}

      {estado === 'confirm' && (
        <div className="flex gap-2">
          <button
            onClick={() => setEstado('idle')}
            className="flex-1 py-2 rounded-lg text-xs font-medium"
            style={{ background: COLOR.hover, border: `1px solid ${COLOR.borde}`, color: COLOR.muted }}
          >
            Cancelar
          </button>
          <button
            onClick={ejecutar}
            className="flex-1 py-2 rounded-lg text-xs font-semibold"
            style={{ background: color, color: '#fff' }}
          >
            Confirmar orden
          </button>
        </div>
      )}

      {estado === 'loading' && (
        <button
          disabled
          className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: COLOR.hover, color: COLOR.muted, border: `1px solid ${COLOR.borde}` }}
        >
          <RefreshCw size={13} className="animate-spin" />
          Enviando orden a MT5…
        </button>
      )}

      {(estado === 'success' || estado === 'error') && (
        <button
          onClick={() => { setEstado('idle'); setMensaje('') }}
          className="w-full py-2 rounded-lg text-xs"
          style={{ background: COLOR.hover, color: COLOR.muted, border: `1px solid ${COLOR.borde}` }}
        >
          Nueva evaluación
        </button>
      )}

    </div>
  )
}


// ── Precio en vivo + alerta de invalidación ───────────────────────────────────

function PrecioEnVivo({ precioSenal, atr, senal, mt5Symbol }) {
  const [precioVivo, setPrecioVivo] = useState(null)
  const symbol = mt5Symbol || 'GOLD'

  useEffect(() => {
    const fetch5s = async () => {
      try {
        const res  = await fetch(`${API}/price/${symbol}`)
        if (!res.ok) return
        const data = await res.json()
        setPrecioVivo(data.bid)
      } catch {}
    }
    fetch5s()
    const id = setInterval(fetch5s, 5_000)
    return () => clearInterval(id)
  }, [])

  if (!precioVivo || !precioSenal) return null

  const diff      = precioVivo - precioSenal
  const diffAbs   = Math.abs(diff)
  // Si el precio se movió más de 1 ATR desde la señal, puede estar en riesgo
  const enRiesgo  = atr && diffAbs > atr * 1.0
  const enPeligro = atr && diffAbs > atr * 2.0
  const color     = diff >= 0 ? COLOR.alcista : COLOR.bajista
  const bgAlert   = enPeligro ? '#2d1215' : enRiesgo ? '#2d1f0d' : COLOR.hover
  const borderAlert = enPeligro ? COLOR.bajista : enRiesgo ? '#e3b341' : COLOR.borde

  return (
    <div
      className="rounded-lg px-3 py-2.5"
      style={{ background: bgAlert, border: `1px solid ${borderAlert}` }}
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs" style={{ color: COLOR.muted }}>Precio en vivo</span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-base font-mono font-bold" style={{ color: COLOR.texto }}>
              ${precioVivo.toFixed(2)}
            </span>
            <span className="text-xs font-mono" style={{ color }}>
              {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs" style={{ color: COLOR.muted }}>Señal en</span>
          <p className="text-xs font-mono" style={{ color: COLOR.muted }}>${precioSenal.toFixed(2)}</p>
        </div>
      </div>

      {enPeligro && (
        <p className="text-xs mt-1.5 font-medium" style={{ color: COLOR.bajista }}>
          ⚠️ El precio se alejó más de 2 ATR — la estructura SMC podría estar invalidada. Espera el próximo análisis.
        </p>
      )}
      {enRiesgo && !enPeligro && (
        <p className="text-xs mt-1.5" style={{ color: '#e3b341' }}>
          ⚡ Movimiento fuerte — el precio se alejó más de 1 ATR desde la señal. Evalúa antes de entrar.
        </p>
      )}
    </div>
  )
}


// ── Panel principal ───────────────────────────────────────────────────────────

export default function SmcSignalPanel({ mt5Connected }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchSmc = useCallback(async () => {
    if (!mt5Connected) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/signal/xauusd/smc`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [mt5Connected])

  useEffect(() => {
    fetchSmc()
    // Análisis completo cada 5 min — la estructura M15 solo cambia al cerrar la vela
    const id = setInterval(fetchSmc, 310_000)
    return () => clearInterval(id)
  }, [fetchSmc])

  if (!mt5Connected) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8">
        <p className="text-xs" style={{ color: COLOR.muted }}>
          MT5 desconectado — sin datos SMC
        </p>
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-3 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-lg" style={{ height: 48, background: COLOR.hover }} />
        ))}
        <p className="text-xs text-center" style={{ color: COLOR.muted }}>
          Analizando DXY + estructura SMC…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-lg px-3 py-3 text-xs"
        style={{ background: '#2d1215', color: COLOR.bajista, border: `1px solid ${COLOR.bajista}` }}
      >
        {error}
        <button
          onClick={fetchSmc}
          className="block mt-2 underline"
          style={{ color: COLOR.bajista }}
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="flex flex-col gap-3">

      {/* Cabecera con botón refresh */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium" style={{ color: COLOR.texto }}>
            Análisis del Oro (XAUUSD)
          </span>
          <p className="text-xs" style={{ color: COLOR.muted, fontSize: 10 }}>
            Estrategia institucional · actualiza cada 15 min
          </p>
        </div>
        <button
          onClick={fetchSmc}
          className="p-1 rounded"
          style={{ color: COLOR.muted }}
          title="Actualizar análisis SMC"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Señal principal */}
      <SignalBadge senal={data.senal} />

      {/* Precio en vivo (actualización cada 5 s, sin llamar a GPT) */}
      <PrecioEnVivo
        precioSenal={data.precio}
        atr={data.atr}
        senal={data.senal}
        mt5Symbol={data.mt5_symbol}
      />

      {/* Sesión */}
      <div
        className="flex items-center justify-between rounded-lg px-3 py-2"
        style={{
          background: data.sesion?.activa ? '#0d2119' : '#1a1a1a',
          border: `1px solid ${data.sesion?.activa ? '#2ea04344' : COLOR.borde}`,
        }}
      >
        <div>
          <span className="text-xs" style={{ color: COLOR.muted }}>Horario de mercado</span>
          {!data.sesion?.activa && (
            <p className="text-xs" style={{ color: '#30363d', fontSize: 10 }}>
              Fuera de sesión — señales menos fiables
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {data.sesion?.activa && (
            <span
              className="w-1.5 h-1.5 rounded-full pulse-dot"
              style={{ background: COLOR.alcista, boxShadow: `0 0 4px ${COLOR.alcista}` }}
            />
          )}
          <span className="text-xs font-medium" style={{ color: data.sesion?.activa ? COLOR.alcista : COLOR.muted }}>
            {data.sesion?.sesion ?? 'Mercado cerrado'}
          </span>
        </div>
      </div>

      {/* DXY */}
      <DxyBadge dxy={data.dxy} sesgoXau={data.sesgo_macro} />

      {/* Estructura */}
      <EstructuraBadge estructura={data.estructura} />

      {/* Checklist */}
      <Checklist
        checklist={data.checklist}
        confluencias_ok={data.confluencias_ok}
        total={data.total_confluencias}
      />

      {/* Zonas OB / FVG */}
      <ZonasPanel
        orderBlocks={data.order_blocks}
        fvgs={data.fvgs}
        precio={data.precio}
      />

      {/* SMT Divergencia */}
      {data.smt?.divergencia && (
        <div
          className="rounded-lg px-3 py-2.5 text-xs"
          style={{ background: '#2d1f0d', border: '1px solid #e3b34144' }}
        >
          <p className="font-semibold mb-1" style={{ color: '#e3b341' }}>
            ⚠️ Señal de alerta — Divergencia Oro/Plata
          </p>
          <p style={{ color: '#c9d1d9', lineHeight: 1.5 }}>
            {data.smt.descripcion}
          </p>
          <p className="mt-1" style={{ color: '#8b949e', fontSize: 10 }}>
            El Oro y la Plata normalmente se mueven juntos. Si van en direcciones distintas,
            el movimiento actual podría ser una trampa. Considera esperar confirmación.
          </p>
        </div>
      )}

      {/* Niveles SL/TP */}
      <NivelesPanel
        sl={data.sl}
        tp1={data.tp1}
        tp2={data.tp2}
        tp3={data.tp3}
        precio={data.precio}
        senal={data.senal}
      />

      {/* Botón Tomar Entrada */}
      <TradeButton
        senal={data.senal}
        precio={data.precio}
        sl={data.sl}
        tp1={data.tp1}
        lotes_info={data.lotes}
        mt5Symbol={data.mt5_symbol}
      />

      {/* Explicación GPT */}
      <GptExplanation texto={data.explicacion_gpt} senal={data.senal} />

      {/* Timestamp */}
      {data.timestamp && (
        <p className="text-center text-xs" style={{ color: '#30363d' }}>
          {new Date(data.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

    </div>
  )
}
