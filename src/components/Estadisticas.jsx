import { useState, useEffect } from 'react'
import { flagUrl } from '../teamFlags.js'
import './Estadisticas.css'

const TABS = [
  { id: 'goleadores',  label: 'Goleadores' },
  { id: 'asistencias', label: 'Asistencias' },
  { id: 'porteros',    label: 'Porteros' },
]

const RANK_COLOR = ['#FCD34D', '#94A3B8', '#C07850']

function shortName(name) {
  if (!name) return ''
  const parts = name.trim().split(' ')
  if (parts.length === 1) return name
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

function PlayerRow({ player, rank, mainStat, mainIcon, secondaries }) {
  const rColor = rank < 3 ? RANK_COLOR[rank] : null
  const flag   = flagUrl(player.team_name, 40)

  return (
    <div className="est-row">
      <div
        className={`est-rank${rColor ? ' est-rank--top' : ''}`}
        style={rColor ? { color: rColor } : {}}
      >
        {rank + 1}
      </div>

      {flag
        ? <img className="est-flag" src={flag} alt={player.team_name} loading="lazy" />
        : <span className="est-flag-ph" />
      }

      <div className="est-pinfo">
        <span className="est-name">{shortName(player.name)}</span>
        <span className="est-team">
          {player.team_name}
          {player.club ? <span className="est-club"> · {player.club}</span> : null}
        </span>
      </div>

      <div className="est-statcol">
        <div className="est-main-row">
          <span className="est-main">{mainStat}</span>
          <span className="est-main-icon">{mainIcon}</span>
        </div>
        <div className="est-secondary">
          {secondaries
            .filter(s => s.value != null && s.value !== 0)
            .map((s, i) => (
              <span key={i} className="est-sec">{s.value}{s.label}</span>
            ))
          }
        </div>
      </div>
    </div>
  )
}

export default function Estadisticas() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab,     setTab]     = useState('goleadores')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/player-stats.json`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="est-loading">Cargando estadísticas…</div>

  if (!data) return (
    <div className="est-empty">
      <p className="est-empty-title">Datos no disponibles</p>
      <p className="est-empty-sub">Se actualizan automáticamente cada 4 horas</p>
    </div>
  )

  const players = data.players ?? []

  const scorers = players
    .filter(p => p.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || b.shots - a.shots)
    .slice(0, 30)

  const assisters = players
    .filter(p => p.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.key_passes - a.key_passes)
    .slice(0, 30)

  const gks = players
    .filter(p => p.position === 'GK' && p.minutes_played >= 45)
    .sort((a, b) =>
      b.clean_sheets - a.clean_sheets ||
      a.goals_conceded - b.goals_conceded ||
      b.saves - a.saves
    )

  const updatedLabel = new Date(data.updated_at).toLocaleDateString('es', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="est-wrap">
      <div className="est-header">
        <h2 className="est-title">Estadísticas</h2>
        <p className="est-sub">{data.matches_processed} partidos · {updatedLabel}</p>
      </div>

      <div className="est-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`est-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'goleadores' && (
        <div className="est-list">
          {scorers.length === 0
            ? <p className="est-no-data">Sin goles aún</p>
            : scorers.map((p, i) => (
                <PlayerRow
                  key={p.player_id} player={p} rank={i}
                  mainStat={p.goals} mainIcon="⚽"
                  secondaries={[
                    { value: p.assists || null,               label: 'A' },
                    { value: p.shots   || null,               label: ' tiros' },
                    { value: p.xg > 0  ? p.xg  : null,       label: ' xG' },
                  ]}
                />
              ))
          }
        </div>
      )}

      {tab === 'asistencias' && (
        <div className="est-list">
          {assisters.length === 0
            ? <p className="est-no-data">Sin asistencias aún</p>
            : assisters.map((p, i) => (
                <PlayerRow
                  key={p.player_id} player={p} rank={i}
                  mainStat={p.assists} mainIcon="🎯"
                  secondaries={[
                    { value: p.key_passes || null,            label: ' KP' },
                    { value: p.goals      || null,            label: 'G' },
                    { value: p.xa > 0     ? p.xa  : null,    label: ' xA' },
                  ]}
                />
              ))
          }
        </div>
      )}

      {tab === 'porteros' && (
        <div className="est-list">
          {gks.length === 0
            ? <p className="est-no-data">Sin datos de porteros aún</p>
            : gks.map((p, i) => (
                <PlayerRow
                  key={p.player_id} player={p} rank={i}
                  mainStat={p.clean_sheets} mainIcon="🧤"
                  secondaries={[
                    { value: p.goals_conceded || null,        label: ' GC' },
                    { value: p.saves          || null,        label: ' paradas' },
                    { value: p.matches,                       label: ' PJ' },
                  ]}
                />
              ))
          }
        </div>
      )}
    </div>
  )
}
