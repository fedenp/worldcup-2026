import { useState } from 'react'
import Calendario from './components/Calendario.jsx'
import Grupos from './components/Grupos.jsx'
import Bracket from './components/Bracket.jsx'
import PrePartido from './components/PrePartido.jsx'
import {
  SoccerBall, CalendarBlank, Trophy, ChartLineUp,
  ChartBar, Globe, Newspaper, Sun, Moon, CaretLeft
} from '@phosphor-icons/react'
import './App.css'

const TABS = [
  { id: 'grupos',        Icon: SoccerBall,    label: 'Grupos' },
  { id: 'calendario',   Icon: CalendarBlank,  label: 'Calendario' },
  { id: 'bracket',      Icon: Trophy,         label: 'Bracket' },
  { id: 'estadisticas', Icon: ChartLineUp,    label: 'Stats' },
  { id: 'pronosticos',  Icon: ChartBar,       label: 'Pronóst.' },
  { id: 'equipos',      Icon: Globe,          label: 'Equipos' },
  { id: 'noticias',     Icon: Newspaper,      label: 'Noticias' },
]

export default function App() {
  const [activeTab,     setActiveTab]     = useState('calendario')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [theme, setTheme] = useState(() => {
    const t = 'dark'
    document.documentElement.setAttribute('data-theme', t)
    return t
  })

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
  }

  function openMatch(match) {
    setSelectedMatch(match)
  }

  function closeMatch() {
    setSelectedMatch(null)
  }

  return (
    <div id="view-main" style={selectedMatch ? { paddingBottom: 0 } : {}}>
      {/* Desktop sidebar */}
      <aside className="sidebar" style={{ display: 'none' }}>
        <div className="sb-top">
          <div className="sb-brand">
            <img src={`${import.meta.env.BASE_URL}mascotas.webp`} alt="Mascotas" className="sb-mascot" />
            <div>
              <div className="sb-title">Mundial 2026</div>
              <div className="sb-sub">FIFA WORLD CUP</div>
            </div>
          </div>
          <div className="sb-toggle" onClick={toggleTheme}>
            <div className="toggle-track"><div className="toggle-knob" /></div>
            <span className="sb-toggle-lbl">{theme === 'dark' ? 'Modo oscuro' : 'Modo claro'}</span>
          </div>
        </div>
        <nav className="sb-nav">
          {selectedMatch && (
            <button className="sb-back-btn" onClick={closeMatch}>
              <CaretLeft size={15} weight="bold" />
              <span>Volver al Calendario</span>
            </button>
          )}
          {TABS.map(({ id, Icon, label }) => (
            <button
              key={id}
              className={`sb-item ${activeTab === id ? 'active' : ''}`}
              onClick={() => { closeMatch(); setActiveTab(id) }}
            >
              <Icon size={17} weight={activeTab === id ? 'duotone' : 'regular'} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sb-footer"><SoccerBall size={13} weight="duotone" /> Mundial 2026</div>
      </aside>

      {/* Main scroll area */}
      <div className="main-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        {/* Topbar — changes when a match is open */}
        <header className="topbar">
          {selectedMatch ? (
            <button className="topbar-back" onClick={closeMatch}>
              <CaretLeft size={16} weight="bold" />
              <span>Calendario</span>
            </button>
          ) : (
            <div className="brand">
              <div className="brand-mark">
                <img src={`${import.meta.env.BASE_URL}mascotas.webp`} alt="Mascotas Mundial 2026" className="brand-mascot" />
              </div>
              <div>
                <div className="brand-name">Mundial 2026</div>
                <div className="brand-year">FIFA WORLD CUP</div>
              </div>
            </div>
          )}
          <div className="topbar-right">
            <div className="toggle-wrap" onClick={toggleTheme}>
              {theme === 'dark'
                ? <Moon size={15} weight="duotone" />
                : <Sun size={15} weight="duotone" />}
              <div className="toggle-track"><div className="toggle-knob" /></div>
            </div>
          </div>
        </header>

        <div className="content">
          {!selectedMatch && activeTab === 'grupos'      && <Grupos />}
          {!selectedMatch && activeTab === 'calendario'  && <Calendario onSelectMatch={openMatch} />}
          {!selectedMatch && activeTab === 'bracket'     && <Bracket />}
          {!selectedMatch && !['grupos', 'calendario', 'bracket'].includes(activeTab) && (
            <div className="placeholder">
              <p>Próximamente</p>
            </div>
          )}
        </div>
      </div>

      {/* Pre-partido overlay — slides in over the content */}
      {selectedMatch && <PrePartido key={selectedMatch.id} match={selectedMatch} />}

      {/* Bottom nav — hidden while a match is open */}
      {!selectedMatch && (
        <nav className="bottom-nav">
          <div className="nav-items">
            {TABS.map(({ id, Icon, label }) => (
              <button
                key={id}
                className={`nav-item ${activeTab === id ? 'active' : ''}`}
                onClick={() => setActiveTab(id)}
              >
                <div className="nav-icon-wrap">
                  <Icon size={20} weight={activeTab === id ? 'duotone' : 'regular'} />
                </div>
                <span className="nav-label">{label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
