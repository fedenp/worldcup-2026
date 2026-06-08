import { useState, useEffect } from 'react'
import { flagUrl } from '../teamFlags.js'
import './PrePartido.css'

const BASE = import.meta.env.BASE_URL
const TZ   = Intl.DateTimeFormat().resolvedOptions().timeZone

function Flag({ name, size = 48 }) {
  const url = flagUrl(name)
  if (!url) return <span className="pp-flag-emoji">🏳️</span>
  return (
    <img
      src={url} alt={name}
      className="pp-flag-img"
      style={{ width: size, height: Math.round(size * 0.67) }}
    />
  )
}

function formatTime(dateStr) {
  if (!dateStr) return '--:--'
  return new Date(dateStr).toLocaleTimeString('es', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es', {
    timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long',
  })
}

// ─── SECTION CARD ────────────────────────────────────────────
function Card({ title, children }) {
  return (
    <div className="pp-card">
      {title && <div className="pp-card-title">{title}</div>}
      <div className="pp-card-body">{children}</div>
    </div>
  )
}

function Unavailable() {
  return <p className="pp-unavailable">Disponible próximamente</p>
}

// ─── HERO ─────────────────────────────────────────────────────
function Hero({ match, venue, weather }) {
  const live     = ['LIVE', '1H', '2H', 'HT'].includes(match.status)
  const finished = match.status === 'FT'
  const showScore = live || finished

  return (
    <div className="pp-hero">
      <div className="pp-hero-meta">
        {match.group && <span className="pp-hero-pill">{match.group}</span>}
        {match.round  && !match.group && <span className="pp-hero-pill">{match.round}</span>}
        <span className="pp-hero-date">{formatDate(match.kickoff_at)}</span>
      </div>

      <div className="pp-hero-teams">
        <div className="pp-hero-team">
          <Flag name={match.home_team} size={56} />
          <span className="pp-hero-name">{match.home_team}</span>
        </div>

        <div className="pp-hero-center">
          {showScore ? (
            <div className="pp-hero-score">
              {match.home_score ?? 0}
              <span className="pp-score-sep">–</span>
              {match.away_score ?? 0}
            </div>
          ) : (
            <div className="pp-hero-time">{formatTime(match.kickoff_at)}</div>
          )}
          {live && (
            <span className="pp-live-badge">
              <span className="live-dot" />En vivo
            </span>
          )}
        </div>

        <div className="pp-hero-team">
          <Flag name={match.away_team} size={56} />
          <span className="pp-hero-name">{match.away_team}</span>
        </div>
      </div>

      {(venue || weather?.temperature_c != null) && (
        <div className="pp-hero-footer">
          {venue && (
            <span className="pp-venue-tag">
              🏟 {venue.name}, {venue.city}
              {venue.capacity && <> · {venue.capacity.toLocaleString()} esp.</>}
            </span>
          )}
          {weather?.temperature_c != null && (
            <span className="pp-weather-tag">
              🌡 {weather.temperature_c}°C · 💨 {weather.wind_speed} km/h
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PROBABILIDADES ───────────────────────────────────────────
function Probabilidades({ match, pred }) {
  if (!pred?.prob_home) return (
    <Card title="Probabilidades">
      <Unavailable />
    </Card>
  )

  const { prob_home, prob_draw, prob_away, xg_home, xg_away, most_likely_score } = pred

  return (
    <Card title="Probabilidades">
      <div className="pp-proba-bar">
        <div className="pp-seg pp-seg-home" style={{ width: `${prob_home}%` }} />
        <div className="pp-seg pp-seg-draw" style={{ width: `${prob_draw}%` }} />
        <div className="pp-seg pp-seg-away" style={{ width: `${prob_away}%` }} />
      </div>
      <div className="pp-proba-labels">
        <div className="pp-proba-col home">
          <span className="pp-proba-pct">{prob_home}%</span>
          <span className="pp-proba-team">{match.home_team}</span>
        </div>
        <div className="pp-proba-col draw">
          <span className="pp-proba-pct">{prob_draw}%</span>
          <span className="pp-proba-team">Empate</span>
        </div>
        <div className="pp-proba-col away">
          <span className="pp-proba-pct">{prob_away}%</span>
          <span className="pp-proba-team">{match.away_team}</span>
        </div>
      </div>
      {(xg_home != null || most_likely_score) && (
        <div className="pp-proba-extras">
          {xg_home != null && (
            <span className="pp-extra-chip">
              xG <strong>{xg_home}</strong> – <strong>{xg_away}</strong>
            </span>
          )}
          {most_likely_score && (
            <span className="pp-extra-chip">
              Score probable <strong>{most_likely_score}</strong>
            </span>
          )}
        </div>
      )}
    </Card>
  )
}

// ─── FORMA RECIENTE ───────────────────────────────────────────
const FORM_META = {
  W: { cls: 'win',  label: 'G' },
  D: { cls: 'draw', label: 'E' },
  L: { cls: 'loss', label: 'P' },
}

function FormRow({ name, form }) {
  const letters = (form || '').slice(-5).split('').filter(l => l in FORM_META)
  return (
    <div className="pp-form-row">
      <span className="pp-form-name">{name}</span>
      <div className="pp-form-dots">
        {letters.length > 0
          ? letters.map((l, i) => (
              <span key={i} className={`pp-form-dot ${FORM_META[l].cls}`}>
                {FORM_META[l].label}
              </span>
            ))
          : <span className="pp-form-empty">Sin datos</span>}
      </div>
    </div>
  )
}

function findForm(groups, teamId) {
  if (!groups) return ''
  for (const teams of Object.values(groups)) {
    const t = teams.find(t => t.team_id === teamId)
    if (t) return t.form || ''
  }
  return ''
}

function FormaReciente({ match, groups }) {
  return (
    <Card title="Forma reciente">
      <FormRow name={match.home_team} form={findForm(groups, match.home_team_id)} />
      <FormRow name={match.away_team} form={findForm(groups, match.away_team_id)} />
    </Card>
  )
}

// ─── H2H ──────────────────────────────────────────────────────
function H2H({ data }) {
  return (
    <Card title="Historial H2H">
      {data ? <div>{/* se expande en Capa 4 */}</div> : <Unavailable />}
    </Card>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function PrePartido({ match }) {
  const [extra,  setExtra]  = useState(null)
  const [groups, setGroups] = useState(null)
  const [ready,  setReady]  = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}data/match/${match.id}.json`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${BASE}data/standings.json`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([ext, std]) => {
      setExtra(ext)
      setGroups(std?.groups ?? null)
      setReady(true)
    })
  }, [match.id])

  return (
    <div className="pp-container">
      <Hero match={match} venue={extra?.venue} weather={extra?.weather} />

      {!ready ? (
        <div className="pp-loading">Cargando datos…</div>
      ) : (
        <>
          <Probabilidades match={match} pred={extra?.prediction} />
          <FormaReciente  match={match} groups={groups} />
          <H2H data={extra?.head_to_head} />
        </>
      )}
    </div>
  )
}
