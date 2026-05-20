import { NavLink } from 'react-router-dom'
import {
  BarChart2, Zap, Newspaper, History, Settings, TrendingUp,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

const LINKS = [
  { to: '/',        icon: BarChart2,  label: 'Dashboard'     },
  { to: '/signals', icon: Zap,        label: 'Señales'       },
  { to: '/news',    icon: Newspaper,  label: 'Noticias'      },
  { to: '/history', icon: History,    label: 'Historial'     },
  { to: '/config',  icon: Settings,   label: 'Configuración' },
]

export default function Sidebar() {
  const { mt5Connected } = useApp()

  return (
    <aside
      className="flex-shrink-0 flex flex-col"
      style={{
        width: 200,
        background: '#161b22',
        borderRight: '1px solid #30363d',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-4 py-5"
        style={{ borderBottom: '1px solid #30363d' }}
      >
        <TrendingUp size={18} style={{ color: '#58a6ff' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: '#c9d1d9' }}>
            Forex Agent
          </p>
          <p className="text-xs" style={{ color: '#8b949e' }}>
            Dashboard v1.0
          </p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-2">
        {LINKS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => [
              'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md text-sm',
              isActive
                ? 'font-medium'
                : '',
            ].join(' ')}
            style={({ isActive }) => ({
              color:      isActive ? '#58a6ff' : '#8b949e',
              background: isActive ? '#21262d' : 'transparent',
              borderLeft: isActive ? '2px solid #58a6ff' : '2px solid transparent',
            })}
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Estado MT5 */}
      <div
        className="px-4 py-4"
        style={{ borderTop: '1px solid #30363d' }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full pulse-dot"
            style={{
              background:  mt5Connected ? '#3fb950' : '#f85149',
              boxShadow:   mt5Connected ? '0 0 6px #3fb950' : '0 0 6px #f85149',
            }}
          />
          <span className="text-xs" style={{ color: '#8b949e' }}>
            MT5 {mt5Connected ? 'Online' : 'Offline'}
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: '#30363d' }}>
          EURUSD · GBPUSD · USDJPY
        </p>
      </div>
    </aside>
  )
}
