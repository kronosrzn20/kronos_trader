/**
 * Guide — Manual de uso del dashboard
 * Página interactiva con secciones desplegables, tablas y glosario.
 */
import { useState } from 'react'
import {
  BookOpen, ChevronDown, ChevronUp, CheckCircle2, Circle,
  Clock, AlertTriangle, Lightbulb, TrendingUp, TrendingDown,
  Minus, Zap, BarChart2, BookMarked,
} from 'lucide-react'

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  bg:     '#0d1117',
  panel:  '#161b22',
  hover:  '#21262d',
  borde:  '#30363d',
  texto:  '#c9d1d9',
  muted:  '#8b949e',
  azul:   '#58a6ff',
  verde:  '#3fb950',
  rojo:   '#f85149',
  naranja:'#f0883e',
  amarillo:'#e3b341',
  morado: '#a371f7',
}

// ── Componentes base ──────────────────────────────────────────────────────────

function Panel({ children, style }) {
  return (
    <div
      className="rounded-lg p-5"
      style={{ background: C.panel, border: `1px solid ${C.borde}`, ...style }}
    >
      {children}
    </div>
  )
}

function SectionTitle({ icon: Icon, color = C.azul, children }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon size={16} style={{ color }} />}
      <h2 className="text-sm font-semibold" style={{ color: C.texto }}>
        {children}
      </h2>
    </div>
  )
}

function InfoBox({ type = 'tip', children }) {
  const MAP = {
    tip:     { color: C.azul,    bg: '#0d1f3c', border: '#1f6feb44', Icon: Lightbulb,     label: 'Consejo'    },
    warning: { color: C.amarillo,bg: '#2d1f0d', border: '#e3b34144', Icon: AlertTriangle,  label: 'Importante' },
    danger:  { color: C.rojo,    bg: '#2d1215', border: '#f8514944', Icon: AlertTriangle,  label: 'Advertencia'},
    success: { color: C.verde,   bg: '#0d2119', border: '#2ea04344', Icon: CheckCircle2,   label: 'Recomendado'},
  }
  const s = MAP[type]
  return (
    <div
      className="flex gap-3 rounded-lg px-4 py-3 my-3"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <s.Icon size={14} style={{ color: s.color, flexShrink: 0, marginTop: 2 }} />
      <div className="text-xs" style={{ color: C.texto, lineHeight: 1.7 }}>
        <span className="font-semibold" style={{ color: s.color }}>{s.label}: </span>
        {children}
      </div>
    </div>
  )
}

function Table({ headers, rows }) {
  return (
    <div className="overflow-x-auto rounded-lg" style={{ border: `1px solid ${C.borde}` }}>
      <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: C.hover }}>
            {headers.map((h, i) => (
              <th
                key={i}
                className="text-left px-3 py-2 font-semibold"
                style={{ color: C.muted, borderBottom: `1px solid ${C.borde}` }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
              style={{ borderBottom: ri < rows.length - 1 ? `1px solid ${C.borde}` : 'none' }}
            >
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2"
                  style={{ color: C.texto }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Acordeon({ titulo, icono: Icon, iconColor = C.azul, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.borde}` }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: open ? C.hover : C.panel }}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} style={{ color: iconColor }} />}
          <span className="text-sm font-medium" style={{ color: C.texto }}>{titulo}</span>
        </div>
        {open
          ? <ChevronUp size={14} style={{ color: C.muted }} />
          : <ChevronDown size={14} style={{ color: C.muted }} />
        }
      </button>
      {open && (
        <div
          className="px-4 pb-4 pt-3 flex flex-col gap-3"
          style={{ background: C.panel, borderTop: `1px solid ${C.borde}` }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function Paso({ num, titulo, children }) {
  return (
    <div className="flex gap-3">
      <div
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: C.azul + '22', color: C.azul, border: `1px solid ${C.azul}44` }}
      >
        {num}
      </div>
      <div className="flex-1">
        <p className="text-xs font-semibold mb-1" style={{ color: C.texto }}>{titulo}</p>
        <div className="text-xs" style={{ color: C.muted, lineHeight: 1.6 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function Tag({ color, bg, children }) {
  return (
    <span
      className="inline-block text-xs font-semibold px-2 py-0.5 rounded"
      style={{ color, background: bg ?? color + '22', border: `1px solid ${color}44` }}
    >
      {children}
    </span>
  )
}

// ── Sección: Inicio rápido ─────────────────────────────────────────────────────
function SeccionInicio() {
  return (
    <Panel>
      <SectionTitle icon={BookOpen} color={C.azul}>Inicio rápido — 3 pasos</SectionTitle>
      <div className="flex flex-col gap-4">
        <Paso num={1} titulo="Abre MetaTrader 5 e inicia sesión">
          Asegúrate de que el botón <strong style={{ color: C.verde }}>"Algo Trading"</strong> esté verde en la barra de herramientas de MT5.
          Si no aparece, ve a <em>Herramientas → Opciones → Trading algorítmico</em> y actívalo.
        </Paso>
        <Paso num={2} titulo="Inicia el backend (API Python)">
          Abre una terminal en la carpeta del proyecto y ejecuta:
          <div
            className="rounded mt-2 px-3 py-2 font-mono text-xs"
            style={{ background: C.bg, color: C.verde, border: `1px solid ${C.borde}` }}
          >
            venv\Scripts\activate<br />
            python api.py
          </div>
          Debes ver <span style={{ color: C.verde }}>✅ Conexión exitosa</span> en la terminal.
        </Paso>
        <Paso num={3} titulo="Inicia el dashboard">
          Abre <strong>otra</strong> terminal y ejecuta:
          <div
            className="rounded mt-2 px-3 py-2 font-mono text-xs"
            style={{ background: C.bg, color: C.azul, border: `1px solid ${C.borde}` }}
          >
            cd forex-dashboard<br />
            npm run dev
          </div>
          Se abre automáticamente esta ventana del dashboard.
        </Paso>
      </div>
      <InfoBox type="warning">
        MetaTrader 5 debe estar abierto <strong>antes</strong> de ejecutar <code>python api.py</code>.
        Si arrancas el backend primero, el sistema mostrará "MT5 Desconectado".
      </InfoBox>
    </Panel>
  )
}

// ── Sección: El dashboard ─────────────────────────────────────────────────────
function SeccionDashboard() {
  return (
    <div className="flex flex-col gap-3">
      <Acordeon titulo="Topbar — barra superior" icono={BarChart2} defaultOpen>
        <Table
          headers={['Elemento', 'Para qué sirve']}
          rows={[
            ['Selector de par', 'Elige el mercado: EURUSD, GBPUSD, USDJPY o XAUUSD'],
            ['⚡ SMC Gold (IA)', 'Solo aparece con XAUUSD. Activa el análisis con inteligencia artificial'],
            ['Precio en vivo', 'Precio actual del par seleccionado — se actualiza cada 5 segundos'],
            ['Spread', 'Diferencia entre precio de compra y venta (coste de la operación)'],
            ['MT5 Conectado', 'Verde = todo bien. Rojo = revisar que MT5 esté abierto'],
          ]}
        />
      </Acordeon>

      <Acordeon titulo="Gráfico de velas" icono={TrendingUp}>
        <p className="text-xs" style={{ color: C.muted, lineHeight: 1.7 }}>
          Muestra las últimas <strong style={{ color: C.texto }}>200 velas de 15 minutos</strong> del par seleccionado.
        </p>
        <div className="flex gap-3 text-xs mt-1">
          <span style={{ color: C.muted }}>
            <span style={{ color: C.azul }}>— Línea azul</span> = EMA 20 (tendencia últimas horas)
          </span>
          <span style={{ color: C.muted }}>
            <span style={{ color: C.morado }}>— Línea morada</span> = EMA 50 (tendencia últimos días)
          </span>
        </div>
        <InfoBox type="tip">
          Si el gráfico aparece vacío, haz clic en el ícono <strong>↻</strong> en la esquina superior derecha del gráfico para actualizar manualmente.
        </InfoBox>
      </Acordeon>

      <Acordeon titulo="Panel de señal — EMA + RSI (todos los pares)" icono={Zap} iconColor={C.amarillo}>
        <p className="text-xs" style={{ color: C.muted, lineHeight: 1.7 }}>
          Cuando usas la estrategia <strong style={{ color: C.texto }}>EMA + RSI</strong>, el panel derecho muestra:
        </p>
        <Table
          headers={['Sección', 'Qué muestra']}
          rows={[
            [<Tag color={C.verde} key="c">COMPRA</Tag>, 'Las tres tendencias apuntan arriba y el impulso es saludable'],
            [<Tag color={C.rojo} key="v">VENTA</Tag>, 'Las tres tendencias apuntan abajo con presión vendedora'],
            [<Tag color={C.muted} key="n">NEUTRAL</Tag>, 'Condiciones no claras — se recomienda esperar'],
            ['Indicadores', 'Tendencia corto/medio/largo plazo, impulso RSI y volatilidad ATR'],
            ['Análisis visual', 'Gráfico de dirección del mercado, medidor de impulso y checklist'],
            ['Posiciones abiertas', 'Operaciones activas con ganancia/pérdida en tiempo real'],
          ]}
        />
      </Acordeon>

      <Acordeon titulo="Panel SMC Gold — solo XAUUSD con IA" icono={Zap} iconColor={C.verde}>
        <p className="text-xs mb-2" style={{ color: C.muted, lineHeight: 1.7 }}>
          Al seleccionar <strong style={{ color: C.texto }}>XAUUSD + ⚡ SMC Gold (IA)</strong>, el panel muestra
          un análisis institucional completo del oro con explicación de inteligencia artificial.
        </p>
        <Table
          headers={['Sección', 'Qué muestra']}
          rows={[
            ['Señal', 'COMPRA / VENTA / NEUTRAL basado en confluencias institucionales'],
            ['Precio en vivo', 'Precio actual con alerta si se aleja demasiado de la señal'],
            ['Horario de mercado', 'Sesión activa: Londres, Nueva York o Asia'],
            ['Fuerza del Dólar (DXY)', 'Si el dólar sube, el oro tiende a bajar — y viceversa'],
            ['Estructura del mercado', '🔄 Cambio de tendencia (CHoCH) o ➡ Continúa (BOS)'],
            ['Confluencias', 'Lista de condiciones — a más ✓ verdes, señal más confiable'],
            ['Zonas clave', 'Áreas de precio donde el oro podría rebotar'],
            ['Niveles SL / TP', 'Stop Loss, precio de entrada y Take Profit calculados'],
            ['Tomar Entrada', 'Botón para ejecutar la operación directamente en MT5'],
            ['Análisis GPT', 'Explicación en texto plano de la situación técnica y fundamental'],
          ]}
        />
        <InfoBox type="tip">
          La IA solo genera análisis en <strong>horario de Londres y Nueva York (08:00–22:00 UTC, lunes a viernes)</strong>.
          Fuera de ese horario no se consumen tokens y el panel muestra un mensaje informativo.
        </InfoBox>
      </Acordeon>
    </div>
  )
}

// ── Sección: Cómo operar con SMC Gold ────────────────────────────────────────
function SeccionSMC() {
  const pasos = [
    {
      titulo: 'Espera el horario correcto',
      desc: 'Lo ideal es operar entre las 08:00 y las 22:00 UTC. Fuera de ese rango el oro tiene poca liquidez y las señales son menos confiables.',
      icon: Clock,
      color: C.azul,
    },
    {
      titulo: 'Verifica que haya señal',
      desc: 'Espera a que aparezca COMPRA 🟢 o VENTA 🔴. El panel se actualiza cada 5 minutos. Una señal NEUTRAL significa "espera", no "entra".',
      icon: Zap,
      color: C.amarillo,
    },
    {
      titulo: 'Revisa las confluencias',
      desc: 'Cuantas más condiciones verdes (✓) haya en la checklist, más sólida es la señal. Mínimo recomendado: 4 de 6.',
      icon: CheckCircle2,
      color: C.verde,
    },
    {
      titulo: 'Lee el análisis GPT',
      desc: 'La IA explica en lenguaje simple qué está pasando. Si menciona un riesgo o contradicción entre técnico y fundamental, tómalo en serio.',
      icon: BookOpen,
      color: C.morado,
    },
    {
      titulo: 'Revisa los niveles SL y TP',
      desc: 'El ratio riesgo/beneficio mínimo recomendado es 1:3 — por cada $1 que arriesgas debes poder ganar $3. Si el ratio es menor, mejor esperar otra oportunidad.',
      icon: TrendingUp,
      color: C.verde,
    },
    {
      titulo: 'Toma la entrada',
      desc: 'Haz clic en "Tomar Entrada", revisa el resumen (lotes, SL, TP, dinero en riesgo) y confirma. La orden se envía directamente a MT5.',
      icon: Zap,
      color: C.azul,
    },
  ]

  return (
    <Panel>
      <SectionTitle icon={Zap} color={C.verde}>Cómo operar con SMC Gold — paso a paso</SectionTitle>
      <div className="flex flex-col gap-4">
        {pasos.map((p, i) => (
          <div key={i} className="flex gap-3">
            <div
              className="flex-shrink-0 flex items-center justify-center rounded-full"
              style={{ width: 28, height: 28, background: p.color + '22', border: `1px solid ${p.color}44` }}
            >
              <p.icon size={13} style={{ color: p.color }} />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: C.texto }}>{i + 1}. {p.titulo}</p>
              <p className="text-xs mt-0.5" style={{ color: C.muted, lineHeight: 1.6 }}>{p.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <p className="text-xs font-semibold" style={{ color: C.texto }}>Señales de alerta que debes respetar</p>
        <div
          className="rounded-lg px-3 py-2.5 text-xs"
          style={{ background: '#2d1f0d', border: `1px solid ${C.amarillo}44`, color: C.texto, lineHeight: 1.7 }}
        >
          ⚡ <strong style={{ color: C.amarillo }}>Movimiento de 1 ATR</strong> desde la señal → evalúa con cuidado antes de entrar<br />
          ⚠️ <strong style={{ color: C.rojo }}>Movimiento de 2 ATR</strong> → la señal probablemente ya no es válida, espera el siguiente análisis<br />
          🔀 <strong style={{ color: C.naranja }}>Divergencia SMT</strong> (Oro y Plata van en direcciones distintas) → posible trampa, mayor precaución
        </div>
      </div>
    </Panel>
  )
}

// ── Sección: Horarios ─────────────────────────────────────────────────────────
function SeccionHorarios() {
  return (
    <Panel>
      <SectionTitle icon={Clock} color={C.azul}>Horarios recomendados para el Oro</SectionTitle>
      <Table
        headers={['Sesión', 'Horario UTC', 'Hora México (UTC−6)', 'Actividad']}
        rows={[
          ['Asia',              '23:00 – 07:00', '17:00 – 01:00', <Tag color={C.muted} key="a">Baja — evitar</Tag>],
          ['Londres',           '08:00 – 17:00', '02:00 – 11:00', <Tag color={C.verde}  key="l">Alta ✅</Tag>],
          ['Nueva York',        '13:00 – 22:00', '07:00 – 16:00', <Tag color={C.verde}  key="n">Alta ✅</Tag>],
          ['Superposición LDN/NY', '13:00 – 17:00', '07:00 – 11:00', <Tag color={C.amarillo} key="s">Muy alta ⭐</Tag>],
        ]}
      />
      <InfoBox type="success">
        El mejor momento para el oro es la <strong>superposición Londres + Nueva York (13:00–17:00 UTC / 07:00–11:00 México)</strong>.
        Es cuando hay más volumen, spreads más bajos y señales más limpias.
      </InfoBox>
      <InfoBox type="warning">
        <strong>Noticias de alto impacto</strong> (NFP, CPI, FOMC): no entres durante el dato. El spread puede triplicarse
        y sacarte del stop por volatilidad pura. Espera 5–10 minutos después de la publicación.
      </InfoBox>
    </Panel>
  )
}

// ── Sección: Configuración ────────────────────────────────────────────────────
function SeccionConfig() {
  return (
    <Panel>
      <SectionTitle icon={BookMarked} color={C.azul}>Configuración del sistema</SectionTitle>
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: C.texto }}>Conexión MT5</p>
          <p className="text-xs mb-2" style={{ color: C.muted, lineHeight: 1.7 }}>
            Puedes cambiar las credenciales de MetaTrader 5 desde el menú <strong style={{ color: C.texto }}>Configuración</strong> sin
            necesidad de editar ningún archivo. Solo ingresa tu número de cuenta, contraseña y servidor, y haz clic en "Guardar y reconectar".
          </p>
          <InfoBox type="tip">
            El servidor debe coincidir exactamente con el nombre que aparece en la ventana de login de MT5.
            Por ejemplo: <code style={{ color: C.verde }}>XMGlobal-MT5 5</code>
          </InfoBox>
        </div>
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: C.texto }}>Gestión de riesgo</p>
          <Table
            headers={['Parámetro', 'Qué controla', 'Valor recomendado']}
            rows={[
              ['Riesgo por trade', '% del balance que arriesgas en cada operación', <Tag color={C.verde} key="r">1%</Tag>],
              ['Multiplicador SL', 'Distancia del Stop Loss en múltiplos de ATR', <Tag color={C.azul}  key="s">1.5×</Tag>],
              ['Multiplicador TP', 'Distancia del Take Profit en múltiplos de ATR', <Tag color={C.azul} key="t">3.0×</Tag>],
              ['Tamaño de lote', 'Lote fijo para la página Señales', <Tag color={C.muted} key="l">0.01 (mínimo)</Tag>],
            ]}
          />
        </div>
      </div>
    </Panel>
  )
}

// ── Sección: Glosario ─────────────────────────────────────────────────────────
const GLOSARIO = [
  { term: 'EMA',          def: 'Promedio móvil del precio. EMA 20 = tendencia de las últimas horas. EMA 50 = últimos días. EMA 200 = últimas semanas. Cuando todas apuntan en la misma dirección, la señal es más confiable.' },
  { term: 'RSI',          def: 'Fuerza del movimiento (0–100). Por encima de 70 = el precio subió demasiado rápido (sobrecomprado, posible corrección). Por debajo de 30 = bajó demasiado rápido (sobrevendido, posible rebote). Entre 30–70 = zona normal.' },
  { term: 'ATR',          def: 'Volatilidad — cuánto se mueve el precio en promedio por cada vela de 15 minutos. Se usa para calcular el Stop Loss y el Take Profit. A mayor ATR, mayor volatilidad.' },
  { term: 'Stop Loss (SL)', def: 'Precio límite de pérdida. La operación se cierra automáticamente si el mercado llega a este precio, para que no pierdas más de lo planeado.' },
  { term: 'Take Profit (TP)', def: 'Precio objetivo de ganancia. La operación se cierra automáticamente al llegar, asegurando la ganancia sin necesitar estar frente a la pantalla.' },
  { term: 'CHoCH',        def: 'Cambio de Carácter. Primera señal de que la tendencia podría estar girando. El precio rompió un máximo o mínimo clave en sentido contrario a la tendencia anterior.' },
  { term: 'BOS',          def: 'Ruptura de Estructura (Break of Structure). Confirma que la tendencia actual continúa. El precio rompió un nivel previo siguiendo la misma dirección.' },
  { term: 'Order Block (OB)', def: 'Zona institucional. Área donde bancos y fondos de inversión colocaron órdenes grandes. El precio suele rebotar al volver a visitar estas zonas.' },
  { term: 'FVG',          def: 'Hueco de precio (Fair Value Gap). Espacio dejado por un movimiento muy rápido entre 3 velas. El mercado tiende a volver a "llenar" ese hueco antes de continuar.' },
  { term: 'DXY',          def: 'Índice del Dólar estadounidense. Mide la fortaleza del dólar frente a otras monedas. El oro tiene correlación inversa: si el DXY sube, el oro tiende a bajar, y viceversa.' },
  { term: 'Divergencia SMT', def: 'El Oro y la Plata normalmente se mueven juntos. Si van en direcciones distintas (divergencia), puede ser una señal de trampa de liquidez — alerta para no entrar.' },
  { term: 'Spread',       def: 'Diferencia entre el precio de compra (ask) y venta (bid). Es el coste implícito de cada operación. En noticias importantes el spread puede dispararse.' },
  { term: 'Lote',         def: 'Tamaño de la posición. 0.01 = micro lote (mínimo). 0.10 = mini lote. 1.00 = lote estándar. En oro: 1 lote = 100 onzas.' },
  { term: 'P&L',          def: 'Profit & Loss — ganancia o pérdida de una operación, expresada en la moneda de tu cuenta.' },
  { term: 'R:R',          def: 'Ratio Riesgo:Beneficio. 1:3 significa que ganas $3 si aciertas y pierdes $1 si te equivocas. Para el oro se recomienda mínimo 1:3.' },
  { term: 'Confluencia',  def: 'Cuando varios factores distintos apuntan en la misma dirección al mismo tiempo. A más confluencias, mayor probabilidad de que la señal sea correcta.' },
  { term: 'Sesión activa', def: 'Horario en que los principales mercados financieros del mundo están operando. Londres (08:00–17:00 UTC) y Nueva York (13:00–22:00 UTC) son las más importantes para el oro.' },
]

function SeccionGlosario() {
  const [busqueda, setBusqueda] = useState('')
  const filtrados = GLOSARIO.filter(g =>
    g.term.toLowerCase().includes(busqueda.toLowerCase()) ||
    g.def.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <Panel>
      <SectionTitle icon={BookMarked} color={C.morado}>Glosario de términos</SectionTitle>
      <input
        type="text"
        placeholder="Buscar término..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-xs outline-none mb-3"
        style={{
          background: C.hover,
          border: `1px solid ${C.borde}`,
          color: C.texto,
        }}
      />
      <div className="flex flex-col gap-2">
        {filtrados.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: C.muted }}>
            No se encontró el término "{busqueda}"
          </p>
        ) : (
          filtrados.map(({ term, def }) => (
            <div
              key={term}
              className="rounded-lg px-3 py-2.5"
              style={{ background: C.hover }}
            >
              <p className="text-xs font-semibold mb-0.5" style={{ color: C.azul }}>{term}</p>
              <p className="text-xs" style={{ color: C.muted, lineHeight: 1.6 }}>{def}</p>
            </div>
          ))
        )}
      </div>
    </Panel>
  )
}

// ── Sección: Consejos finales ─────────────────────────────────────────────────
function SeccionConsejos() {
  const consejos = [
    { icon: '🧪', text: 'Empieza siempre en cuenta demo. Prueba el sistema varias semanas antes de usar dinero real.' },
    { icon: '🛡️', text: 'Nunca arriesgues más del 1–2% por operación. Proteger el capital es más importante que ganar.' },
    { icon: '📰', text: 'No operes durante noticias de alto impacto (NFP, CPI, FOMC). El spread se dispara. Espera 5–10 min después del dato.' },
    { icon: '🤖', text: 'Si el análisis GPT menciona un riesgo o contradicción, no lo ignores. Es preferible no entrar que entrar con dudas.' },
    { icon: '⏳', text: 'El NEUTRAL no es malo. Significa que el mercado no da condiciones claras. Esperar también es una decisión correcta de trading.' },
    { icon: '📊', text: 'Cuantas más confluencias verdes veas en la checklist, más sólida es la señal. Con 3 o menos, mejor esperar.' },
  ]

  return (
    <Panel>
      <SectionTitle icon={Lightbulb} color={C.amarillo}>Consejos para operar mejor</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        {consejos.map((c, i) => (
          <div
            key={i}
            className="rounded-lg px-3 py-3 flex gap-2.5"
            style={{ background: C.hover }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{c.icon}</span>
            <p className="text-xs" style={{ color: C.muted, lineHeight: 1.6 }}>{c.text}</p>
          </div>
        ))}
      </div>
      <div
        className="mt-3 rounded-lg px-4 py-3 text-xs"
        style={{ background: '#2d1215', border: `1px solid ${C.rojo}44`, color: C.muted, lineHeight: 1.7 }}
      >
        <span style={{ color: C.rojo, fontWeight: 600 }}>⚠️ Advertencia: </span>
        Este sistema es una herramienta de apoyo educativa. El trading conlleva riesgo de pérdida de capital.
        El análisis generado por inteligencia artificial no constituye asesoramiento financiero.
        Opera siempre con dinero que puedas permitirte perder.
      </div>
    </Panel>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
const SECCIONES = [
  { id: 'inicio',    label: 'Inicio rápido',        icon: BookOpen   },
  { id: 'dashboard', label: 'El dashboard',          icon: BarChart2  },
  { id: 'smc',       label: 'Operar con SMC Gold',   icon: Zap        },
  { id: 'horarios',  label: 'Horarios del mercado',  icon: Clock      },
  { id: 'config',    label: 'Configuración',         icon: BookMarked },
  { id: 'glosario',  label: 'Glosario',              icon: BookMarked },
  { id: 'consejos',  label: 'Consejos',              icon: Lightbulb  },
]

export default function Guide() {
  const [seccion, setSeccion] = useState('inicio')

  const renderSeccion = () => {
    switch (seccion) {
      case 'inicio':    return <SeccionInicio />
      case 'dashboard': return <SeccionDashboard />
      case 'smc':       return <SeccionSMC />
      case 'horarios':  return <SeccionHorarios />
      case 'config':    return <SeccionConfig />
      case 'glosario':  return <SeccionGlosario />
      case 'consejos':  return <SeccionConsejos />
      default:          return <SeccionInicio />
    }
  }

  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 56px - 36px - 32px)' }}>

      {/* Menú lateral del manual */}
      <div
        className="flex-shrink-0 rounded-lg overflow-hidden flex flex-col"
        style={{ width: 190, background: C.panel, border: `1px solid ${C.borde}` }}
      >
        <div className="px-4 py-3" style={{ borderBottom: `1px solid ${C.borde}` }}>
          <div className="flex items-center gap-2">
            <BookOpen size={13} style={{ color: C.azul }} />
            <p className="text-xs font-semibold" style={{ color: C.texto }}>Manual de uso</p>
          </div>
          <p className="text-xs mt-0.5" style={{ color: C.muted, fontSize: 10 }}>
            Guía completa del dashboard
          </p>
        </div>

        <nav className="flex-1 overflow-auto py-2">
          {SECCIONES.map(({ id, label, icon: Icon }) => {
            const active = seccion === id
            return (
              <button
                key={id}
                onClick={() => setSeccion(id)}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-xs"
                style={{
                  color:      active ? C.azul    : C.muted,
                  background: active ? C.hover   : 'transparent',
                  borderLeft: `2px solid ${active ? C.azul : 'transparent'}`,
                  fontWeight: active ? 600 : 400,
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-auto pb-4">
        {renderSeccion()}
      </div>

    </div>
  )
}
