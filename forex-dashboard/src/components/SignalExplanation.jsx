/**
 * SignalExplanation
 * Explica visualmente por qué se generó una señal, en lenguaje claro
 * para cualquier persona, con o sin experiencia en trading.
 */

// ── Gauge de impulso (RSI) ────────────────────────────────────────────────────
function ImpulsoGauge({ rsi }) {
  if (rsi == null) return null

  const pct = Math.min(100, Math.max(0, rsi))

  const zona =
    rsi >= 70 ? { label: 'Muy alto — podría bajar pronto', color: '#f85149', icon: '🔴' } :
    rsi <= 30 ? { label: 'Muy bajo — podría subir pronto',  color: '#58a6ff', icon: '🔵' } :
    rsi >= 40 ? { label: 'Saludable para comprar',          color: '#3fb950', icon: '🟢' } :
                { label: 'Saludable para vender',           color: '#3fb950', icon: '🟢' }

  return (
    <div className="flex flex-col gap-2">
      {/* Título */}
      <div className="flex justify-between items-center">
        <div>
          <span style={{ color: '#c9d1d9', fontSize: 12, fontWeight: 500 }}>
            Fuerza del movimiento
          </span>
          <span style={{ color: '#8b949e', fontSize: 10, marginLeft: 6 }}>
            (RSI {rsi})
          </span>
        </div>
        <span style={{ fontSize: 11, color: zona.color, fontWeight: 600 }}>
          {zona.icon} {zona.label}
        </span>
      </div>

      {/* Barra */}
      <div
        className="relative rounded-full overflow-hidden"
        style={{ height: 10, background: '#21262d' }}
      >
        {/* Zonas de color de fondo */}
        <div style={{ position: 'absolute', left: 0,    width: '30%', top: 0, bottom: 0, background: '#1a3a5c', opacity: 0.5 }} />
        <div style={{ position: 'absolute', left: '30%',width: '40%', top: 0, bottom: 0, background: '#1a2f1a', opacity: 0.5 }} />
        <div style={{ position: 'absolute', left: '70%',width: '30%', top: 0, bottom: 0, background: '#3b1a1a', opacity: 0.5 }} />

        {/* Marcador actual */}
        <div
          className="absolute top-1 bottom-1 rounded-full"
          style={{
            left:       `calc(${pct}% - 5px)`,
            width:      10,
            background: zona.color,
            boxShadow:  `0 0 6px ${zona.color}`,
            transition: 'left 0.5s ease',
          }}
        />
      </div>

      {/* Etiquetas en lenguaje claro */}
      <div className="flex justify-between" style={{ fontSize: 9 }}>
        <span style={{ color: '#58a6ff' }}>⬇ Muy bajo</span>
        <span style={{ color: '#8b949e' }}>Normal</span>
        <span style={{ color: '#f85149' }}>Muy alto ⬆</span>
      </div>
    </div>
  )
}

// ── Tendencia visual ──────────────────────────────────────────────────────────
function TendenciaVisual({ ema20, ema50, ema200, signal }) {
  if (!ema20 || !ema50 || !ema200) return null

  const vals  = [ema200, ema50, ema20]
  const minV  = Math.min(...vals)
  const maxV  = Math.max(...vals)
  const range = maxV - minV || 0.00001

  const filas = [
    {
      nombre: 'Precio ahora',
      desc:   'Últimos minutos',
      valor:  ema20,
      color:  '#58a6ff',
    },
    {
      nombre: 'Precio reciente',
      desc:   'Últimas horas',
      valor:  ema50,
      color:  '#a371f7',
    },
    {
      nombre: 'Precio histórico',
      desc:   'Últimas semanas',
      valor:  ema200,
      color:  '#8b949e',
    },
  ]

  const alineado =
    signal === 'COMPRA' ? ema20 > ema50 && ema50 > ema200 :
    signal === 'VENTA'  ? ema20 < ema50 && ema50 < ema200 : false

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span style={{ color: '#c9d1d9', fontSize: 12, fontWeight: 500 }}>
          Dirección del mercado
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color: alineado ? (signal === 'COMPRA' ? '#3fb950' : '#f85149') : '#8b949e',
        }}>
          {alineado
            ? signal === 'COMPRA' ? '↑ Todo apunta arriba' : '↓ Todo apunta abajo'
            : '↔ Sin dirección clara'}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {filas.map(f => {
          const pct = ((f.valor - minV) / range) * 55 + 30
          return (
            <div key={f.nombre} className="flex items-center gap-3">
              <div style={{ width: 90, flexShrink: 0 }}>
                <p style={{ fontSize: 11, color: '#c9d1d9' }}>{f.nombre}</p>
                <p style={{ fontSize: 9, color: '#8b949e' }}>{f.desc}</p>
              </div>
              <div className="flex-1 rounded-full" style={{ height: 6, background: '#21262d' }}>
                <div
                  className="rounded-full"
                  style={{
                    width:      `${pct}%`,
                    height:     '100%',
                    background: f.color,
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
              <span style={{ fontSize: 10, color: '#8b949e', fontFamily: 'monospace', width: 60, textAlign: 'right' }}>
                {f.valor}
              </span>
            </div>
          )
        })}
      </div>

      {alineado && (
        <p style={{ fontSize: 10, color: '#8b949e', fontStyle: 'italic' }}>
          {signal === 'COMPRA'
            ? '✓ El precio de hoy está por encima del de ayer y de la semana pasada — tendencia sólida.'
            : '✓ El precio de hoy está por debajo del de ayer y de la semana pasada — caída consistente.'}
        </p>
      )}
    </div>
  )
}

// ── Checklist en lenguaje claro ───────────────────────────────────────────────
function CheclistClaro({ signal, ema20, ema50, ema200, rsi }) {
  if (!signal || signal === 'NEUTRAL' || !ema20) return null

  const isCompra = signal === 'COMPRA'

  const condiciones = isCompra
    ? [
        {
          ok:    ema20 > ema50,
          texto: 'El precio sube en el corto plazo',
          detalle: 'La tendencia de las últimas horas es alcista',
        },
        {
          ok:    ema50 > ema200,
          texto: 'La tendencia general también es de subida',
          detalle: 'Confirmado en marco temporal amplio',
        },
        {
          ok:    rsi > 40 && rsi < 70,
          texto: 'El impulso es saludable, no hay excesos',
          detalle: `Fuerza del movimiento: ${rsi} (zona ideal: 40–70)`,
        },
        {
          ok:    ema20 > ema200,
          texto: 'El precio actual supera su promedio histórico',
          detalle: 'Señal de fortaleza a largo plazo',
        },
      ]
    : [
        {
          ok:    ema20 < ema50,
          texto: 'El precio baja en el corto plazo',
          detalle: 'La tendencia de las últimas horas es bajista',
        },
        {
          ok:    ema50 < ema200,
          texto: 'La tendencia general también es de caída',
          detalle: 'Confirmado en marco temporal amplio',
        },
        {
          ok:    rsi > 30 && rsi < 60,
          texto: 'El impulso es saludable, sin rebote inmediato',
          detalle: `Fuerza del movimiento: ${rsi} (zona ideal: 30–60)`,
        },
        {
          ok:    ema20 < ema200,
          texto: 'El precio actual está bajo su promedio histórico',
          detalle: 'Señal de debilidad a largo plazo',
        },
      ]

  const cumplidas = condiciones.filter(c => c.ok).length
  const fuerza    = cumplidas === 4 ? { label: 'Señal fuerte', color: '#3fb950' }
                  : cumplidas >= 3  ? { label: 'Señal moderada', color: '#e3b341' }
                  : cumplidas >= 2  ? { label: 'Señal débil', color: '#f0883e' }
                  :                   { label: 'Señal no confirmada', color: '#f85149' }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span style={{ color: '#c9d1d9', fontSize: 12, fontWeight: 500 }}>
          ¿Por qué esta señal?
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: fuerza.color }}>
          {fuerza.label} · {cumplidas}/{condiciones.length}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {condiciones.map((c, i) => (
          <div
            key={i}
            className="flex items-start gap-2 rounded-lg px-3 py-2"
            style={{ background: c.ok ? '#0d1f0d' : '#1a1a1a' }}
          >
            <span style={{ fontSize: 14, lineHeight: 1.3, color: c.ok ? '#3fb950' : '#30363d' }}>
              {c.ok ? '✓' : '○'}
            </span>
            <div>
              <p style={{ fontSize: 12, color: c.ok ? '#c9d1d9' : '#8b949e' }}>
                {c.texto}
              </p>
              <p style={{ fontSize: 10, color: c.ok ? '#8b949e' : '#30363d', marginTop: 1 }}>
                {c.detalle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function SignalExplanation({ signal, indicators, precio }) {
  if (!indicators) return null

  const { ema20, ema50, ema200, rsi, atr } = indicators

  const mult_sl = parseFloat(localStorage.getItem('mult_sl') ?? '1.5')
  const mult_tp = parseFloat(localStorage.getItem('mult_tp') ?? '3.0')

  const sl = signal === 'COMPRA' ? precio - atr * mult_sl
           : signal === 'VENTA'  ? precio + atr * mult_sl : null
  const tp = signal === 'COMPRA' ? precio + atr * mult_tp
           : signal === 'VENTA'  ? precio - atr * mult_tp : null

  const signalColor = signal === 'COMPRA' ? '#3fb950' : signal === 'VENTA' ? '#f85149' : '#8b949e'

  // Resumen en lenguaje natural
  const resumen =
    signal === 'COMPRA'
      ? 'El mercado viene subiendo de forma consistente en el corto, mediano y largo plazo. El impulso está en una zona saludable para comprar: no está demasiado acelerado, lo que reduce el riesgo de una caída inmediata.'
      : signal === 'VENTA'
      ? 'El mercado viene bajando de forma consistente en el corto, mediano y largo plazo. El impulso indica que aún hay presión vendedora sin señales de recuperación inmediata.'
      : 'Las condiciones del mercado no son lo suficientemente claras para tomar una decisión. Es mejor esperar a que la dirección se confirme.'

  return (
    <div className="flex flex-col gap-4">

      {/* Resumen en lenguaje natural */}
      <div
        className="rounded-lg px-4 py-3"
        style={{ background: '#21262d', borderLeft: `3px solid ${signalColor}` }}
      >
        <p style={{ fontSize: 12, color: '#c9d1d9', lineHeight: 1.7 }}>
          {resumen}
        </p>
      </div>

      {/* Tendencia visual */}
      <TendenciaVisual ema20={ema20} ema50={ema50} ema200={ema200} signal={signal} />

      {/* Gauge de impulso */}
      <ImpulsoGauge rsi={rsi} />

      {/* Checklist amigable */}
      <CheclistClaro signal={signal} ema20={ema20} ema50={ema50} ema200={ema200} rsi={rsi} />

      {/* Niveles de la operación */}
      {sl && tp && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: '#21262d' }}
        >
          <p
            className="text-center py-1.5 text-xs font-medium"
            style={{ color: '#8b949e', borderBottom: '1px solid #30363d' }}
          >
            Niveles de la operación
          </p>
          <div className="grid grid-cols-3">
            <div className="text-center py-3 px-2" style={{ borderRight: '1px solid #30363d' }}>
              <p style={{ fontSize: 9, color: '#f85149', marginBottom: 4 }}>🛑 Límite de pérdida</p>
              <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#f85149', fontWeight: 700 }}>
                {sl.toFixed(5)}
              </p>
              <p style={{ fontSize: 9, color: '#8b949e', marginTop: 2 }}>Stop Loss</p>
            </div>
            <div className="text-center py-3 px-2" style={{ borderRight: '1px solid #30363d' }}>
              <p style={{ fontSize: 9, color: '#8b949e', marginBottom: 4 }}>📍 Precio de entrada</p>
              <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#c9d1d9', fontWeight: 700 }}>
                {precio?.toFixed(5)}
              </p>
              <p style={{ fontSize: 9, color: '#8b949e', marginTop: 2 }}>Actual</p>
            </div>
            <div className="text-center py-3 px-2">
              <p style={{ fontSize: 9, color: '#3fb950', marginBottom: 4 }}>🎯 Objetivo de ganancia</p>
              <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#3fb950', fontWeight: 700 }}>
                {tp.toFixed(5)}
              </p>
              <p style={{ fontSize: 9, color: '#8b949e', marginTop: 2 }}>Take Profit</p>
            </div>
          </div>
          <div
            className="text-center py-1.5 text-xs"
            style={{ color: '#8b949e', borderTop: '1px solid #30363d' }}
          >
            Por cada <span style={{ color: '#f85149' }}>$1</span> que arriesgas puedes ganar{' '}
            <span style={{ color: '#3fb950', fontWeight: 600 }}>${(mult_tp / mult_sl).toFixed(1)}</span>
          </div>
        </div>
      )}

    </div>
  )
}
