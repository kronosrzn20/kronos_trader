import { TrendingUp, TrendingDown, Minus, Brain, Newspaper } from 'lucide-react'
import { useApp } from '../context/AppContext'

const NOTICIAS = [
  {
    id: 1,
    titulo: 'Fed mantiene tasas sin cambios; mercado espera recorte en julio',
    fuente: 'Reuters',
    hora: 'Hace 2 horas',
    sentimiento: 'neutral',
    pares: ['EURUSD', 'GBPUSD'],
    resumen: 'La Reserva Federal mantuvo las tasas entre 5.25%-5.50% en su reunión de mayo. El presidente Powell señaló que se necesitan más datos antes de iniciar recortes.',
    impacto: 'Presión bajista moderada sobre el USD. EURUSD podría buscar resistencia en 1.0900. Vigilar datos de inflación PCE del viernes.',
  },
  {
    id: 2,
    titulo: 'CPI del Reino Unido supera expectativas: 3.2% vs 3.0% esperado',
    fuente: 'ONS / BBC Business',
    hora: 'Hace 4 horas',
    sentimiento: 'alcista',
    pares: ['GBPUSD'],
    resumen: 'La inflación en el RU se situó en 3.2% anual en abril. La inflación de servicios sigue elevada en 5.9%, lo que complica al Bank of England reducir tasas a corto plazo.',
    impacto: 'Alcista para la libra. GBPUSD en zona de resistencia clave en 1.2700. Posibles oportunidades de compra en pullbacks hacia 1.2650.',
  },
  {
    id: 3,
    titulo: 'Japón interviene en divisas para frenar depreciación del yen',
    fuente: 'Bloomberg / Ministry of Finance',
    hora: 'Hace 6 horas',
    sentimiento: 'bajista',
    pares: ['USDJPY'],
    resumen: 'El Ministerio de Finanzas de Japón confirmó intervención comprando yenes. El USDJPY cayó aproximadamente 300 pips en los primeros minutos tras la intervención.',
    impacto: 'Alta volatilidad en USDJPY. Se recomienda extrema precaución con posiciones largas. Soporte inmediato en 152.00 — nueva intervención posible por encima de 155.',
  },
  {
    id: 4,
    titulo: 'PMI manufacturero de la Eurozona sube a 47.3 en mayo',
    fuente: 'S&P Global',
    hora: 'Hace 8 horas',
    sentimiento: 'alcista',
    pares: ['EURUSD'],
    resumen: 'El PMI manufacturero de la Eurozona mejoró a 47.3 desde 45.7, superando la estimación de 46.5. Aunque sigue en zona de contracción (<50), la mejora es significativa.',
    impacto: 'Levemente positivo para el euro. EURUSD resistencia en 1.0880. Un cierre diario por encima abriría hacia 1.0950.',
  },
  {
    id: 5,
    titulo: 'NFP de EE.UU. supera expectativas: +256K vs +240K estimado',
    fuente: 'Bureau of Labor Statistics',
    hora: 'Hace 2 días',
    sentimiento: 'bajista',
    pares: ['EURUSD', 'GBPUSD', 'USDJPY'],
    resumen: 'Las nóminas no agrícolas añadieron 256.000 empleos en abril, y la tasa de desempleo bajó al 3.8%. Los datos robustos del mercado laboral reducen la urgencia de recortes de tasas.',
    impacto: 'Fortalece el USD en todos los pares principales. EURUSD busca soporte en 1.0800. USDJPY podría reanudar alza hacia 155 si la intervención no persiste.',
  },
]

const SENT_CONFIG = {
  alcista: { label: 'Alcista', color: '#3fb950', bg: '#0d2119', border: '#2ea043', Icon: TrendingUp  },
  bajista: { label: 'Bajista', color: '#f85149', bg: '#2d1215', border: '#f85149', Icon: TrendingDown },
  neutral: { label: 'Neutro',  color: '#8b949e', bg: '#21262d', border: '#30363d', Icon: Minus       },
}

function NoticiaCard({ n, llmEnabled }) {
  const s = SENT_CONFIG[n.sentimiento]
  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-3"
      style={{ background: '#161b22', border: '1px solid #30363d' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-medium leading-snug" style={{ color: '#c9d1d9' }}>
            {n.titulo}
          </h3>
          <p className="text-xs mt-1" style={{ color: '#8b949e' }}>
            {n.fuente} · {n.hora}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
            style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
          >
            <s.Icon size={10} />
            {s.label}
          </span>
          {llmEnabled && (
            <span
              className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
              style={{ color: '#a371f7', background: '#1a0e2e', border: '1px solid #6e40c9' }}
            >
              <Brain size={10} />
              LLM
            </span>
          )}
        </div>
      </div>

      {/* Resumen */}
      <p className="text-xs leading-relaxed" style={{ color: '#8b949e' }}>{n.resumen}</p>

      {/* Pares afectados */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs" style={{ color: '#8b949e' }}>Pares:</span>
        {n.pares.map(p => (
          <span
            key={p}
            className="text-xs font-mono px-2 py-0.5 rounded"
            style={{ background: '#21262d', color: '#c9d1d9' }}
          >
            {p}
          </span>
        ))}
      </div>

      {/* Impacto */}
      <div className="rounded-lg px-4 py-3" style={{ background: '#21262d' }}>
        <p className="text-xs font-medium mb-1" style={{ color: '#8b949e' }}>
          Impacto en posiciones
        </p>
        <p className="text-xs" style={{ color: '#c9d1d9' }}>{n.impacto}</p>
      </div>
    </div>
  )
}

export default function News() {
  const { llmEnabled } = useApp()

  return (
    <div className="flex flex-col gap-4">

      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Newspaper size={16} style={{ color: '#8b949e' }} />
          <h1 className="text-base font-semibold" style={{ color: '#c9d1d9' }}>
            Noticias del mercado
          </h1>
        </div>

        {llmEnabled && (
          <span
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
            style={{ color: '#a371f7', background: '#1a0e2e', border: '1px solid #6e40c9' }}
          >
            <Brain size={12} />
            Análisis LLM activo
          </span>
        )}
      </div>

      {/* Noticias */}
      <div className="flex flex-col gap-3 overflow-auto pb-4">
        {NOTICIAS.map(n => (
          <NoticiaCard key={n.id} n={n} llmEnabled={llmEnabled} />
        ))}
      </div>
    </div>
  )
}
