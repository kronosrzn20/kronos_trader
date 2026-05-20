import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { WS_URL } from '../utils/constants'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [activePair, setActivePair]   = useState('EURUSD')
  const [mt5Connected, setMt5Connected] = useState(false)
  const [liveData, setLiveData]       = useState(null)
  const [llmEnabled, setLlmEnabled]   = useState(
    () => localStorage.getItem('llmEnabled') === 'true'
  )
  const [autoTrade, setAutoTrade] = useState(
    () => localStorage.getItem('autoTrade') === 'true'
  )

  const wsRef          = useRef(null)
  const reconnectTimer = useRef(null)

  // ── WebSocket con reconexión automática ────────────────────────────────────
  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data)
            if (data.error) {
              setMt5Connected(false)
            } else {
              setLiveData(data)
              setMt5Connected(true)
            }
          } catch {}
        }

        ws.onerror = () => setMt5Connected(false)

        ws.onclose = () => {
          setMt5Connected(false)
          reconnectTimer.current = setTimeout(connect, 5000)
        }
      } catch {
        setMt5Connected(false)
        reconnectTimer.current = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [])

  // ── Persistir toggles ──────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('llmEnabled', llmEnabled)
  }, [llmEnabled])

  useEffect(() => {
    localStorage.setItem('autoTrade', autoTrade)
  }, [autoTrade])

  return (
    <AppContext.Provider value={{
      activePair, setActivePair,
      mt5Connected,
      liveData,
      llmEnabled, setLlmEnabled,
      autoTrade,  setAutoTrade,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
