import { useState, useEffect } from 'react'
import { flagUrl } from '../teamFlags.js'
import './Calendario.css'

const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone

function formatDayHeader(dateKey) {
  return new Date(dateKey + 'T12:00:00Z').toLocaleDateString('es', {
    timeZone: userTZ,
    weekday: 'short', day: 'numeric', month: 'short',
  }).toUpperCase()
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('es', {
    timeZone: userTZ,
    hour: '2-digit', minute: '2-digit',
  })
}

function localDateKey(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-CA', { timeZone: userTZ })
}

function isToday(dateKey) {
  return dateKey === new Date().toLocaleDateString('en-CA', { timeZone: userTZ })
}

function StatusBadge({ status }) {
  const live = ['LIVE', '1H', '2H', 'HT'].includes(status)
  if (live) return <span className="badge badge-live"><span className="live-dot" />En vivo</span>
  if (status === 'FT') return <span className="badge badge-done">Final</span>
  if (status === 'NS') return <span className="badge badge-next">· · ·</span>
  return <span className="badge badge-next">{status}</span>
}

function Flag({ name }) {
  const url = flagUrl(name)
  if (!url) return <span className="fix-flag">🏳️</span>
  return <img src={url} alt={name} className="fix-flag-img" />
}

function FixtureRow({ match }) {
  const isLive = ['LIVE', '1H', '2H', 'HT'].includes(match.status)
  const isFinished = match.status === 'FT'
  const showScore = isLive || isFinished

  return (
    <div className="fixture-row">
      <div className="fix-meta">
        <div className="fix-time">
          {isLive ? <><span className="live-dot" />Live</> : formatTime(match.kickoff_at)}
        </div>
        {match.group && <div className="fix-venue">Grp {match.group.replace('Group ', '')}</div>}
      </div>

      <div className="fix-teams">
        <div className="fix-team-row">
          <Flag name={match.home_team} />
          <span className="fix-name">{match.home_team}</span>
        </div>
        <div className="fix-team-row">
          <Flag name={match.away_team} />
          <span className="fix-name">{match.away_team}</span>
        </div>
      </div>

      <div className="fix-score">
        {showScore ? (
          <div className="score-lines">
            <span className="score-val">{match.home_score ?? 0}</span>
            <span className="score-val">{match.away_score ?? 0}</span>
          </div>
        ) : (
          <div className="score-lines">
            <StatusBadge status={match.status} />
          </div>
        )}
      </div>

      <div className="fix-arrow">›</div>
    </div>
  )
}

function groupByDate(matches) {
  const groups = {}
  for (const m of matches) {
    const day = m.kickoff_at ? localDateKey(m.kickoff_at) : 'Sin fecha'
    if (!groups[day]) groups[day] = []
    groups[day].push(m)
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, ms]) => [date, ms.sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at))])
}

export default function Calendario() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/WorldCup/data/matches.json')
      .then(r => {
        if (!r.ok) throw new Error('No se encontró matches.json')
        return r.json()
      })
      .then(data => { setMatches(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="cal-state">Cargando partidos…</div>
  if (error) return (
    <div className="cal-state error">
      <p>⚠️ {error}</p>
      <p className="hint">Ejecutá el script de fetch para generar matches.json</p>
    </div>
  )
  if (!matches.length) return <div className="cal-state">Sin partidos disponibles.</div>

  const grouped = groupByDate(matches)

  return (
    <div className="calendario">
      {grouped.map(([date, dayMatches]) => (
        <div key={date} className="fixture-group">
          <div className={`fixture-date-head${isToday(date) ? ' today' : ''}`}>
            {formatDayHeader(date)}
            {isToday(date) && <span style={{ marginLeft: 8, color: 'var(--blue)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>Hoy</span>}
          </div>
          {dayMatches.map(m => <FixtureRow key={m.id} match={m} />)}
        </div>
      ))}
    </div>
  )
}
