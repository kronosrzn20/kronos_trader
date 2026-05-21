import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, CrosshairMode, LineStyle } from 'lightweight-charts'
import { TrendingUp, TrendingDown, Minus, RefreshCw, CircleDot } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { API } from '../utils/constants'
import SignalExplanation from '../components/SignalExplanation'
import SmcSignalPanel   from '../components/SmcSignalPanel'

// ── Sub-componentes ────────────────────────────────────────────────────────────

function SignalBadge({ signal }) {
  const MAP = {
    COMPRA:  { color: '#3fb950', bg: '#0d2119', border: '#2ea043', Icon: TrendingUp,   label: 'COMPRA'  },
    VENTA:   { color: '#f85149', bg: '#2d1215', border: '#f85149', Icon: TrendingDown, label: 'VENTA'   },
    NEUTRAL: { color: '#8b949e', bg: '#21262d', border: '#30363d', Icon: Minus,        label: 'NEUTRAL' },
  }
  const c = MAP[signal] ?? MAP.NEUTRAL
  return (
    <div
      className="flex items-center gap-2 px-4 py-3 rounded-lg"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}
    >
      <c.Icon size={20} />
      <span className="text-lg font-bold tracking-wide">{c.label}</span>
    </div>
  )
}

function IndRow({ label, sublabel, value, color, tag, tagColor }) {
  return (
    <div
      className="flex justify-between items-center py-2"
      style={{ borderBottom: '1px solid #21262d' }}
    >
      <div>
        <span style={{ color: '#8b949e', fontSize: 12 }}>{label}</span>
        {sublabel && (
          <p style={{ color: '#30363d', fontSize: 10, marginTop: 1 }}>{sublabel}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {tag && (
          <span style={{ fontSize: 10, color: tagColor ?? '#8b949e', fontWeight: 600 }}>
            {tag}
          </span>
        )}
        <span style={{ color: color ?? '#c9d1d9', fontSize: 12, fontFamily: 'monospace' }}>
          {value ?? '—'}
        </span>
      </div>
    </div>
  )
}

function getRsiTag(rsi) {
  if (!rsi) return {}
  if (rsi > 70) return { tag: 'Sobrecomprado',   tagColor: '#f85149' }
  if (rsi < 30) return { tag: 'Sobrevendido',     tagColor: '#58a6ff' }
  if (rsi > 55) return { tag: 'Fuerza alcista',   tagColor: '#3fb950' }
  if (rsi < 45) return { tag: 'Fuerza bajista',   tagColor: '#f0883e' }
  return          { tag: 'Zona neutral',           tagColor: '#8b949e' }
}

function Skeleton({ h = 5 }) {
  return (
    <div
      className="rounded animate-pulse"
      style={{ height: h * 4, background: '#21262d', marginBottom: 8 }}
    />
  )
}

function getSignalReason(signal, ind) {
  if (!ind) return 'Calculando indicadores…'
  if (signal === 'COMPRA') {
    return `Tendencia alcista confirmada: EMA20 (${ind.ema20}) > EMA50 (${ind.ema50}) > EMA200 (${ind.ema200}). RSI en zona válida de compra (${ind.rsi}). ATR indica volatilidad de ${ind.atr} pts.`
  }
  if (signal === 'VENTA') {
    return `Tendencia bajista confirmada: EMA20 (${ind.ema20}) < EMA50 (${ind.ema50}) < EMA200 (${ind.ema200}). RSI en zona válida de venta (${ind.rsi}). ATR indica volatilidad de ${ind.atr} pts.`
  }
  return 'Sin alineación clara en las EMAs o RSI fuera de los rangos definidos. Se recomienda esperar confirmación antes de operar.'
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { activePair, mt5Connected, activeStrategy } = useApp()
  const smcMode = activeStrategy === 'SMC_GOLD' && activePair === 'XAUUSD'

  const containerRef  = useRef(null)
  const chartRef      = useRef(null)
  const candleRef     = useRef(null)
  const ema20Ref      = useRef(null)
  const ema50Ref      = useRef(null)

  const smcLinesRef = useRef([])  // price lines SMC activas en el gráfico

  const [chartLoading,  setChartLoading]  = useState(true)
  const [signalInfo,    setSignalInfo]    = useState(null)
  const [signalLoading, setSignalLoading] = useState(true)
  const [positions,     setPositions]     = useState([])
  const [smcData,       setSmcData]       = useState(null)

  // ── Capas del gráfico (visibles u ocultas) — persisten en localStorage ─────
  const [layers, setLayers] = useState(() => {
    try {
      const s = localStorage.getItem('chartLayers')
      return s ? JSON.parse(s) : { ema20: true, ema50: true, estructura: true, ob: true, fvg: true, sltp: true }
    } catch { return { ema20: true, ema50: true, estructura: true, ob: true, fvg: true, sltp: true } }
  })

  const toggleLayer = (key) => setLayers(prev => {
    const next = { ...prev, [key]: !prev[key] }
    localStorage.setItem('chartLayers', JSON.stringify(next))
    return next
  })

  // ── Crear gráfico al montar (una sola vez) ─────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = createChart(el, {
      layout: {
        background: { color: '#0d1117' },
        textColor:  '#8b949e',
        fontSize:   11,
      },
      grid: {
        vertLines: { color: '#161b22' },
        horzLines: { color: '#161b22' },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#30363d' },
      timeScale: {
        borderColor:     '#30363d',
        timeVisible:     true,
        secondsVisible:  false,
      },
      width:  el.clientWidth,
      height: el.clientHeight,
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor:         '#3fb950',
      downColor:       '#f85149',
      borderUpColor:   '#3fb950',
      borderDownColor: '#f85149',
      wickUpColor:     '#3fb950',
      wickDownColor:   '#f85149',
    })

    const ema20Series = chart.addLineSeries({
      color:             '#58a6ff',
      lineWidth:         1,
      priceLineVisible:  false,
      lastValueVisible:  false,
      title:             'EMA20',
    })

    const ema50Series = chart.addLineSeries({
      color:             '#a371f7',
      lineWidth:         1,
      priceLineVisible:  false,
      lastValueVisible:  false,
      title:             'EMA50',
    })

    chartRef.current  = chart
    candleRef.current = candleSeries
    ema20Ref.current  = ema20Series
    ema50Ref.current  = ema50Series

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.resize(containerRef.current.clientWidth, containerRef.current.clientHeight)
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = candleRef.current = ema20Ref.current = ema50Ref.current = null
    }
  }, [])

  // ── Visibilidad de EMAs según toggle ──────────────────────────────────────
  useEffect(() => { ema20Ref.current?.applyOptions({ visible: layers.ema20 }) }, [layers.ema20])
  useEffect(() => { ema50Ref.current?.applyOptions({ visible: layers.ema50 }) }, [layers.ema50])

  // ── Dibujar niveles SMC sobre el gráfico ──────────────────────────────────
  const clearSmcLines = useCallback(() => {
    smcLinesRef.current.forEach(pl => {
      try { candleRef.current?.removePriceLine(pl) } catch {}
    })
    smcLinesRef.current = []
  }, [])

  const drawSmcLevels = useCallback((smc, lyr) => {
    if (!candleRef.current || !smc) return
    clearSmcLines()
    const lines = []

    const addLine = (price, color, title, style = LineStyle.Dashed, width = 1) => {
      if (!price || isNaN(price)) return
      try {
        const pl = candleRef.current.createPriceLine({
          price, color, lineWidth: width, lineStyle: style,
          axisLabelVisible: true, title,
        })
        lines.push(pl)
      } catch {}
    }

    // CHoCH / BOS — solo si fue detectado (cumple confluencia)
    if (lyr.estructura && smc.estructura?.nivel && smc.estructura.tipo) {
      const c = smc.estructura.direccion === 'ALCISTA' ? '#3fb950' : '#f85149'
      addLine(smc.estructura.nivel, c, smc.estructura.tipo, LineStyle.LargeDashed, 2)
    }

    // Order Block más relevante (solo el más cercano al precio actual)
    if (lyr.ob && smc.order_blocks?.length) {
      const precio = smc.precio ?? 0
      const ob = smc.order_blocks
        .filter(o => !o.mitigado)                              // descartar ya mitigados
        .sort((a, b) => Math.abs((a.mitad ?? 0) - precio) - Math.abs((b.mitad ?? 0) - precio))[0]
      if (ob) {
        const c = ob.tipo === 'BULLISH' ? '#3fb950' : '#f85149'
        addLine(ob.alto ?? ob.high, c, `OB ${ob.tipo === 'BULLISH' ? '▲' : '▼'}`, LineStyle.Dashed)
        addLine(ob.bajo ?? ob.low,  c, '', LineStyle.Dashed)
      }
    }

    // FVG más relevante (solo el más cercano al precio actual)
    if (lyr.fvg && smc.fvgs?.length) {
      const precio = smc.precio ?? 0
      const fvg = smc.fvgs
        .sort((a, b) => Math.abs((a.mitad ?? 0) - precio) - Math.abs((b.mitad ?? 0) - precio))[0]
      if (fvg) {
        const c = fvg.tipo === 'BULLISH' ? '#58a6ff' : '#a371f7'
        addLine(fvg.superior, c, `FVG ${fvg.tipo === 'BULLISH' ? '▲' : '▼'}`, LineStyle.Dotted)
        addLine(fvg.inferior, c, '', LineStyle.Dotted)
      }
    }

    // SL y TP — solo cuando hay señal real
    if (lyr.sltp && smc.senal !== 'NEUTRAL') {
      if (smc.sl)  addLine(smc.sl,  '#f85149', '🛑 SL',  LineStyle.Solid, 1)
      if (smc.tp1) addLine(smc.tp1, '#3fb950', '🎯 TP1', LineStyle.Solid, 1)
      if (smc.tp2) addLine(smc.tp2, '#3fb950', 'TP2',    LineStyle.Dashed)
      if (smc.tp3) addLine(smc.tp3, '#3fb950', 'TP3',    LineStyle.Dotted)
    }

    smcLinesRef.current = lines
  }, [clearSmcLines])

  // ── Cargar velas cuando cambia el par ─────────────────────────────────────
  const fetchCandles = useCallback(async () => {
    if (!mt5Connected || !candleRef.current) return
    setChartLoading(true)
    try {
      const res  = await fetch(`${API}/candles/${activePair}`)
      if (!res.ok) return
      const data = await res.json()
      if (!data.candles?.length) return
      candleRef.current?.setData(data.candles)
      ema20Ref.current?.setData(data.ema20  ?? [])
      ema50Ref.current?.setData(data.ema50  ?? [])
      chartRef.current?.timeScale().fitContent()
    } catch (e) {
      console.error('[Dashboard] Error velas:', e)
    } finally {
      setChartLoading(false)
    }
  }, [activePair, mt5Connected])

  useEffect(() => {
    // Fetch inmediato al conectar o cambiar de par — nunca queda vacío
    if (mt5Connected) fetchCandles()
    const id = setInterval(() => { if (mt5Connected) fetchCandles() }, 60_000)
    return () => clearInterval(id)
  }, [fetchCandles, mt5Connected])

  // ── Señal e indicadores (polling 5 s) ─────────────────────────────────────
  const fetchSignal = useCallback(async () => {
    if (!mt5Connected) return
    setSignalLoading(true)
    try {
      const res  = await fetch(`${API}/signal/${activePair}`)
      if (!res.ok) return
      const data = await res.json()
      setSignalInfo({
        signal:     data.señal,
        indicators: data.indicadores,
        precio:     data.precio,
        timestamp:  data.timestamp,
      })
    } catch {}
    finally { setSignalLoading(false) }
  }, [activePair, mt5Connected])

  useEffect(() => {
    fetchSignal()
    const id = setInterval(fetchSignal, 5_000)
    return () => clearInterval(id)
  }, [fetchSignal])

  // ── Datos SMC para dibujar en el gráfico (solo en modo SMC Gold) ──────────
  const fetchSmcForChart = useCallback(async () => {
    if (!smcMode || !mt5Connected) return
    try {
      const res  = await fetch(`${API}/signal/xauusd/smc`)
      if (!res.ok) return
      const data = await res.json()
      setSmcData(data)
      drawSmcLevels(data, layers)
    } catch {}
  }, [smcMode, mt5Connected, drawSmcLevels, layers])

  useEffect(() => {
    if (!smcMode) { clearSmcLines(); setSmcData(null); return }
    fetchSmcForChart()
    const id = setInterval(fetchSmcForChart, 310_000)
    return () => clearInterval(id)
  }, [smcMode, fetchSmcForChart, clearSmcLines])

  // Redibujar cuando cambian las capas visibles o cuando cargan nuevas velas
  useEffect(() => {
    if (smcData && !chartLoading) drawSmcLevels(smcData, layers)
  }, [chartLoading, smcData, layers, drawSmcLevels])

  // ── Posiciones abiertas (polling 5 s) ──────────────────────────────────────
  useEffect(() => {
    if (!mt5Connected) return
    const fetchPositions = async () => {
      try {
        const res = await fetch(`${API}/positions`)
        if (!res.ok) return
        const data = await res.json()
        setPositions(data.posiciones ?? [])
      } catch {}
    }
    fetchPositions()
    const id = setInterval(fetchPositions, 5_000)
    return () => clearInterval(id)
  }, [mt5Connected])

  const ind = signalInfo?.indicators

  return (
    <div className="flex gap-4" style={{ height: 'calc(100vh - 56px - 36px - 32px)' }}>

      {/* ── Gráfico ─────────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col flex-1 rounded-lg overflow-hidden"
        style={{ background: '#161b22', border: '1px solid #30363d' }}
      >
        {/* Cabecera gráfico */}
        <div
          className="flex items-center justify-between px-3 py-1.5 flex-shrink-0 flex-wrap gap-2"
          style={{ borderBottom: '1px solid #30363d' }}
        >
          {/* Par + temporalidad */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: '#c9d1d9' }}>{activePair}</span>
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: '#21262d', color: '#8b949e' }}>M15</span>
          </div>

          {/* Toggles de capas */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* EMAs — siempre disponibles */}
            {[
              { key: 'ema20', label: 'EMA20', color: '#58a6ff' },
              { key: 'ema50', label: 'EMA50', color: '#a371f7' },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() => toggleLayer(key)}
                title={layers[key] ? `Ocultar ${label}` : `Mostrar ${label}`}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                style={{
                  background: layers[key] ? color + '22' : '#21262d',
                  border:     `1px solid ${layers[key] ? color + '88' : '#30363d'}`,
                  color:      layers[key] ? color : '#30363d',
                  opacity:    layers[key] ? 1 : 0.5,
                }}
              >
                <span className="w-3 inline-block" style={{ borderTop: `2px solid ${color}` }} />
                {label}
              </button>
            ))}

            {/* Separador — capas SMC solo en modo Gold */}
            {smcMode && (
              <>
                <span style={{ color: '#30363d', fontSize: 10 }}>|</span>
                {[
                  { key: 'estructura', label: 'CHoCH/BOS', color: '#e3b341', dash: 'dashed' },
                  { key: 'ob',         label: 'OB',         color: '#3fb950', dash: 'dashed' },
                  { key: 'fvg',        label: 'FVG',        color: '#58a6ff', dash: 'dotted' },
                  { key: 'sltp',       label: 'SL/TP',      color: '#f85149', dash: 'solid'  },
                ].map(({ key, label, color, dash }) => (
                  <button
                    key={key}
                    onClick={() => toggleLayer(key)}
                    title={layers[key] ? `Ocultar ${label}` : `Mostrar ${label}`}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                    style={{
                      background: layers[key] ? color + '22' : '#21262d',
                      border:     `1px solid ${layers[key] ? color + '88' : '#30363d'}`,
                      color:      layers[key] ? color : '#30363d',
                      opacity:    layers[key] ? 1 : 0.5,
                    }}
                  >
                    <span className="w-3 inline-block" style={{ borderTop: `2px ${dash} ${color}` }} />
                    {label}
                  </button>
                ))}
              </>
            )}
          </div>
          <button
            onClick={fetchCandles}
            className="p-1 rounded"
            style={{ color: '#8b949e' }}
            title="Actualizar gráfico"
          >
            <RefreshCw size={13} className={chartLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Contenedor chart */}
        <div ref={containerRef} className="flex-1" />
      </div>

      {/* ── Panel derecho ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3" style={{ width: 270 }}>

        {smcMode ? (
          /* ── Modo SMC Gold ──────────────────────────────────────────────── */
          <div
            className="rounded-lg p-4 overflow-auto flex-1"
            style={{ background: '#161b22', border: '1px solid #30363d' }}
          >
            <SmcSignalPanel mt5Connected={mt5Connected} />
          </div>
        ) : (
          /* ── Modo EMA + RSI (default) ───────────────────────────────────── */
          <>
            {/* Señal */}
            <div
              className="rounded-lg p-4"
              style={{ background: '#161b22', border: '1px solid #30363d' }}
            >
              <p className="text-xs mb-2" style={{ color: '#8b949e' }}>Señal actual · {activePair}</p>
              {signalLoading && !signalInfo
                ? <Skeleton h={12} />
                : <SignalBadge signal={signalInfo?.signal ?? 'NEUTRAL'} />
              }
              {signalInfo?.timestamp && (
                <p className="text-xs mt-2" style={{ color: '#30363d' }}>
                  {new Date(signalInfo.timestamp).toLocaleTimeString('es')}
                </p>
              )}
            </div>

            {/* Indicadores */}
            <div
              className="rounded-lg p-4"
              style={{ background: '#161b22', border: '1px solid #30363d' }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium" style={{ color: '#8b949e' }}>Indicadores técnicos</p>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: '#21262d', color: '#30363d', fontSize: 10 }}
                  title="Estos valores se calculan automáticamente con los precios de las últimas horas"
                >
                  M15 · automático
                </span>
              </div>
              {signalLoading && !ind
                ? [1,2,3,4,5,6].map(i => <Skeleton key={i} />)
                : <>
                    <IndRow
                      label="Tendencia corto plazo"
                      sublabel="EMA 20 — últimas horas"
                      value={ind?.ema20}
                      color="#58a6ff"
                    />
                    <IndRow
                      label="Tendencia medio plazo"
                      sublabel="EMA 50 — últimos días"
                      value={ind?.ema50}
                      color="#a371f7"
                    />
                    <IndRow
                      label="Tendencia largo plazo"
                      sublabel="EMA 200 — últimas semanas"
                      value={ind?.ema200}
                    />
                    <IndRow
                      label="Impulso del precio"
                      sublabel="RSI 14 — fuerza del movimiento"
                      value={ind?.rsi}
                      color={ind?.rsi > 70 ? '#f85149' : ind?.rsi < 30 ? '#58a6ff' : '#c9d1d9'}
                      {...getRsiTag(ind?.rsi)}
                    />
                    <IndRow
                      label="Volatilidad"
                      sublabel="ATR 14 — rango promedio de cada vela"
                      value={ind?.atr}
                    />
                    <IndRow
                      label="Precio actual"
                      value={signalInfo?.precio?.toFixed(5)}
                    />
                  </>
              }
            </div>

            {/* Explicación visual de la señal */}
            <div
              className="rounded-lg p-4"
              style={{ background: '#161b22', border: '1px solid #30363d' }}
            >
              <p className="text-xs mb-3 font-medium" style={{ color: '#8b949e' }}>
                Análisis de la señal
              </p>
              {signalInfo
                ? <SignalExplanation
                    signal={signalInfo.signal}
                    indicators={signalInfo.indicators}
                    precio={signalInfo.precio}
                  />
                : <div style={{ color: '#30363d', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
                    Esperando datos…
                  </div>
              }
            </div>
          </>
        )}

        {/* Posiciones abiertas — oculto en modo SMC (el panel SMC ocupa todo el espacio) */}
        {!smcMode && <div
          className="rounded-lg p-4 flex-1 overflow-auto"
          style={{ background: '#161b22', border: '1px solid #30363d' }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium" style={{ color: '#8b949e' }}>
              Posiciones abiertas
            </p>
            <div className="flex items-center gap-1.5">
              {positions.length > 0 && (
                <span
                  className="w-1.5 h-1.5 rounded-full pulse-dot"
                  style={{ background: '#3fb950', boxShadow: '0 0 4px #3fb950' }}
                />
              )}
              <span className="text-xs font-mono" style={{ color: positions.length > 0 ? '#3fb950' : '#8b949e' }}>
                {positions.length} abierta{positions.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {positions.length === 0 ? (
            <p className="text-xs text-center py-4" style={{ color: '#30363d' }}>
              Sin posiciones abiertas
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {positions.map(p => {
                const isPositive = p.profit >= 0
                return (
                  <div
                    key={p.ticket}
                    className="rounded-lg px-3 py-2.5"
                    style={{ background: '#21262d' }}
                  >
                    {/* Par + tipo */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold" style={{ color: '#c9d1d9' }}>
                          {p.symbol}
                        </span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{
                            color:      p.tipo === 'BUY' ? '#3fb950' : '#f85149',
                            background: p.tipo === 'BUY' ? '#0d2119' : '#2d1215',
                          }}
                        >
                          {p.tipo}
                        </span>
                        <span className="text-xs" style={{ color: '#8b949e' }}>
                          {p.lotes} lotes
                        </span>
                      </div>
                      {/* P&L flotante */}
                      <span
                        className="text-xs font-mono font-semibold"
                        style={{ color: isPositive ? '#3fb950' : '#f85149' }}
                      >
                        {isPositive ? '+' : ''}{p.profit.toFixed(2)}
                      </span>
                    </div>

                    {/* Precios */}
                    <div className="flex justify-between text-xs" style={{ color: '#8b949e' }}>
                      <span>Entrada: <span style={{ color: '#c9d1d9', fontFamily: 'monospace' }}>{p.precio_entrada}</span></span>
                      <span>Actual: <span style={{ color: '#c9d1d9', fontFamily: 'monospace' }}>{p.precio_actual}</span></span>
                    </div>

                    {/* SL / TP */}
                    {(p.sl || p.tp) && (
                      <div className="flex gap-3 mt-1 text-xs">
                        {p.sl && (
                          <span style={{ color: '#f85149' }}>
                            SL: <span style={{ fontFamily: 'monospace' }}>{p.sl}</span>
                          </span>
                        )}
                        {p.tp && (
                          <span style={{ color: '#3fb950' }}>
                            TP: <span style={{ fontFamily: 'monospace' }}>{p.tp}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* P&L total */}
              {positions.length > 1 && (
                <div
                  className="flex justify-between items-center px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{ background: '#0d1117' }}
                >
                  <span style={{ color: '#8b949e' }}>P&L total flotante</span>
                  <span style={{
                    fontFamily: 'monospace',
                    color: positions.reduce((s, p) => s + p.profit, 0) >= 0 ? '#3fb950' : '#f85149',
                  }}>
                    {positions.reduce((s, p) => s + p.profit, 0) >= 0 ? '+' : ''}
                    {positions.reduce((s, p) => s + p.profit, 0).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>}

      </div>
    </div>
  )
}
