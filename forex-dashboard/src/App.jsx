import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Sidebar    from './components/Sidebar'
import Topbar     from './components/Topbar'
import StatusBar  from './components/StatusBar'
import Dashboard  from './pages/Dashboard'
import Signals    from './pages/Signals'
import News       from './pages/News'
import History    from './pages/History'
import Config     from './pages/Config'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="flex h-screen overflow-hidden" style={{ background: '#0d1117' }}>

          {/* Sidebar fijo */}
          <Sidebar />

          {/* Área principal */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <Topbar />

            <main className="flex-1 overflow-auto p-4">
              <Routes>
                <Route path="/"         element={<Dashboard />} />
                <Route path="/signals"  element={<Signals />}   />
                <Route path="/news"     element={<News />}      />
                <Route path="/history"  element={<History />}   />
                <Route path="/config"   element={<Config />}    />
              </Routes>
            </main>

            <StatusBar />
          </div>

        </div>
      </BrowserRouter>
    </AppProvider>
  )
}
