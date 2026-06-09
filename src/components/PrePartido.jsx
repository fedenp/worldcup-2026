import { useState, useEffect } from 'react'
import { flagUrl } from '../teamFlags.js'
import './PrePartido.css'

const BASE = import.meta.env.BASE_URL
const TZ   = Intl.DateTimeFormat().resolvedOptions().timeZone

function teamCrestUrl(teamId) {
  if (!teamId) return null
  return `https://sports.bzzoiro.com/img/team/${teamId}/`
}

function formatTime(dateStr) {
  if (!dateStr) return '--:--'
  return new Date(dateStr).toLocaleTimeString('es', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es', {
    timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short',
  })
}

// ─── TEAM CREST (BSD image, falls back to flag) ───────────────
function Crest({ teamId, teamName, size = 60 }) {
  const [err, setErr] = useState(false)
  const crestUrl = teamCrestUrl(teamId)
  const fallback  = flagUrl(teamName)

  if (!err && crestUrl) {
    return (
      <img
        src={crestUrl} alt={teamName}
        className="pp-crest"
        style={{ width: size, height: size }}
        onError={() => setErr(true)}
      />
    )
  }
  if (fallback) {
    return (
      <img
        src={fallback} alt={teamName}
        className="pp-crest-flag"
        style={{ width: size, height: Math.round(size * 0.67) }}
      />
    )
  }
  return <span style={{ fontSize: size * 0.7 }}>🏳️</span>
}

// ─── CARD ─────────────────────────────────────────────────────
function Card({ title, badge, children }) {
  return (
    <div className="pp-card">
      {title && (
        <div className="pp-card-head">
          <span className="pp-card-title">{title}</span>
          {badge && <span className="pp-card-badge">{badge}</span>}
        </div>
      )}
      {children}
    </div>
  )
}

function Unavailable({ msg = 'Disponible próximamente' }) {
  return <p className="pp-unavailable">{msg}</p>
}

// ─── HERO ─────────────────────────────────────────────────────
function Hero({ match, venue, weather }) {
  const live      = ['LIVE', '1H', '2H', 'HT'].includes(match.status)
  const finished  = match.status === 'FT'
  const showScore = live || finished
  const tag       = match.group || match.round

  return (
    <div className="pp-hero">
      {tag && <div className="pp-hero-tag">Mundial 2026 · {tag}</div>}

      <div className="pp-hero-teams">
        <div className="pp-hero-team">
          <Crest teamId={match.home_team_id} teamName={match.home_team} size={64} />
          <div className="pp-hero-name">{match.home_team}</div>
        </div>

        <div className="pp-hero-center">
          <span className="pp-hero-vs">VS</span>
          {showScore ? (
            <div className="pp-hero-score-big">
              {match.home_score ?? 0}
              <span className="pp-score-dash">–</span>
              {match.away_score ?? 0}
            </div>
          ) : (
            <div className="pp-hero-time-big">{formatTime(match.kickoff_at)}</div>
          )}
          <div className="pp-hero-date-sub">{formatDateShort(match.kickoff_at)}</div>
          {venue?.name && <div className="pp-hero-venue-sub">{venue.name}</div>}
          {live && (
            <span className="pp-live-badge"><span className="pp-live-dot" />En vivo</span>
          )}
        </div>

        <div className="pp-hero-team">
          <Crest teamId={match.away_team_id} teamName={match.away_team} size={64} />
          <div className="pp-hero-name">{match.away_team}</div>
        </div>
      </div>

      {(venue?.city || venue?.capacity || weather?.temperature_c != null) && (
        <div className="pp-hero-strip">
          {venue?.city && (
            <>
              <div className="pp-strip-item">
                <div className="pp-strip-val">{venue.city}</div>
                <div className="pp-strip-lbl">Ciudad</div>
              </div>
              <div className="pp-strip-sep" />
            </>
          )}
          {venue?.capacity && (
            <>
              <div className="pp-strip-item">
                <div className="pp-strip-val">{venue.capacity.toLocaleString()}</div>
                <div className="pp-strip-lbl">Aforo</div>
              </div>
              <div className="pp-strip-sep" />
            </>
          )}
          <div className="pp-strip-item">
            <div className="pp-strip-val">{formatTime(match.kickoff_at)}</div>
            <div className="pp-strip-lbl">Hora local</div>
          </div>
          {weather?.temperature_c != null && (
            <>
              <div className="pp-strip-sep" />
              <div className="pp-strip-item">
                <div className="pp-strip-val">{weather.temperature_c}°C</div>
                <div className="pp-strip-lbl">Temp.</div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PROBABILIDADES ───────────────────────────────────────────
function Probabilidades({ match, pred }) {
  if (!pred?.prob_home) {
    return (
      <Card title="Probabilidades" badge="Modelo estadístico">
        <div className="pp-card-body">
          <Unavailable msg="Disponible 48h antes del partido" />
        </div>
      </Card>
    )
  }

  const { prob_home, prob_draw, prob_away, xg_home, xg_away, most_likely_score } = pred

  return (
    <Card title="Probabilidades" badge="Modelo estadístico">
      <div className="pp-prob-hero">
        <div className="pp-prob-teams-row">
          <div>
            <div className="pp-prob-team-label">{match.home_team}</div>
            <div className="pp-prob-pct pp-prob-home">{prob_home}%</div>
          </div>
          <div className="pp-prob-draw-col">
            <div className="pp-prob-draw-pct">{prob_draw}%</div>
            <div className="pp-prob-draw-lbl">Empate</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="pp-prob-team-label">{match.away_team}</div>
            <div className="pp-prob-pct pp-prob-away">{prob_away}%</div>
          </div>
        </div>

        <div className="pp-prob-bar-track">
          <div className="pp-prob-bar-home" style={{ width: `${prob_home}%` }} />
          <div className="pp-prob-bar-draw" style={{ width: `${prob_draw}%` }} />
          <div className="pp-prob-bar-away" style={{ width: `${prob_away}%` }} />
        </div>
        <div className="pp-prob-labels">
          <span>{match.home_team} gana</span>
          <span>Empate</span>
          <span>{match.away_team} gana</span>
        </div>

        {(xg_home != null || most_likely_score) && (
          <div className="pp-prob-extras">
            {xg_home != null && (
              <span className="pp-extra-chip">xG <strong>{xg_home}</strong> – <strong>{xg_away}</strong></span>
            )}
            {most_likely_score && (
              <span className="pp-extra-chip">Score probable <strong>{most_likely_score}</strong></span>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

// ─── FORMA RECIENTE ───────────────────────────────────────────
const FORM_MAP = {
  W: { cls: 'w', label: 'G' },
  D: { cls: 'd', label: 'E' },
  L: { cls: 'l', label: 'P' },
}

function findForm(groups, teamId) {
  if (!groups || !teamId) return ''
  for (const teams of Object.values(groups)) {
    const t = teams.find(t => t.team_id === teamId)
    if (t) return t.form || ''
  }
  return ''
}

function FormaRow({ name, form }) {
  const letters = (form || '').slice(-5).split('').filter(l => l in FORM_MAP)
  const wins    = letters.filter(l => l === 'W').length
  const draws   = letters.filter(l => l === 'D').length
  const losses  = letters.filter(l => l === 'L').length

  return (
    <div className="pp-forma-row">
      <div className="pp-forma-info">
        <div className="pp-forma-name">{name}</div>
        {letters.length > 0 && (
          <div className="pp-forma-record">{wins}G {draws}E {losses}P</div>
        )}
      </div>
      <div className="pp-forma-dots">
        {letters.length > 0
          ? letters.map((l, i) => (
              <div key={i} className={`pp-fd ${FORM_MAP[l].cls}`}>{FORM_MAP[l].label}</div>
            ))
          : <span className="pp-form-empty">Sin datos</span>}
      </div>
    </div>
  )
}

function FormaReciente({ match, groups }) {
  return (
    <Card title="Forma reciente" badge="Últimos 5">
      <FormaRow name={match.home_team} form={findForm(groups, match.home_team_id)} />
      <FormaRow name={match.away_team} form={findForm(groups, match.away_team_id)} />
    </Card>
  )
}

// ─── H2H ──────────────────────────────────────────────────────
function H2H({ match, data }) {
  if (!data) {
    return (
      <Card title="Historial" badge="H2H">
        <div className="pp-card-body">
          <Unavailable />
        </div>
      </Card>
    )
  }

  const { home_wins = 0, draws = 0, away_wins = 0, matches = [] } = data

  return (
    <Card title="Historial" badge={`Últimos ${matches.length} encuentros`}>
      <div className="pp-h2h-summary">
        <div>
          <div className="pp-h2h-num pp-h2h-home">{home_wins}</div>
          <div className="pp-h2h-lbl">{match.home_team}</div>
        </div>
        <div>
          <div className="pp-h2h-num pp-h2h-draw">{draws}</div>
          <div className="pp-h2h-lbl">Empates</div>
        </div>
        <div>
          <div className="pp-h2h-num pp-h2h-away">{away_wins}</div>
          <div className="pp-h2h-lbl">{match.away_team}</div>
        </div>
      </div>
      {matches.slice(0, 5).map((m, i) => (
        <div key={i} className="pp-h2h-match">
          <div className="pp-h2h-year">{(m.year || m.date || '').toString().slice(0, 4)}</div>
          <div className="pp-h2h-comp">{m.competition || m.league}</div>
          <div className="pp-h2h-score">{m.home_score} – {m.away_score}</div>
          <div className={`pp-h2h-winner ${m.winner === 'home' ? 'home' : m.winner === 'away' ? 'away' : 'draw'}`}>
            {m.winner === 'home' ? (m.home_abbr || 'LOC') : m.winner === 'away' ? (m.away_abbr || 'VIS') : 'EMP'}
          </div>
        </div>
      ))}
    </Card>
  )
}

// ─── LÍNEAS DE APUESTA ───────────────────────────────────────
const VALUE_THRESHOLD = 3  // minimum edge (pp) to show "Valor" badge

function buildValueNote(match, odds, pred) {
  if (!pred || !odds) return null
  const candidates = [
    { label: match.home_team, modelPct: pred.prob_home, impliedPct: odds.implied_home, odd: odds.avg_home },
    { label: 'Empate',        modelPct: pred.prob_draw, impliedPct: odds.implied_draw, odd: odds.avg_draw },
    { label: match.away_team, modelPct: pred.prob_away, impliedPct: odds.implied_away, odd: odds.avg_away },
  ]
    .filter(c => c.odd && c.modelPct != null && c.impliedPct != null)
    .map(c => ({ ...c, edge: c.modelPct - c.impliedPct }))
    .filter(c => c.edge > VALUE_THRESHOLD)

  if (!candidates.length) return null
  const best = candidates.reduce((a, b) => (a.edge > b.edge ? a : b))
  return (
    <>
      <strong>{best.label}</strong> a {best.odd.toFixed(2)}: nuestro modelo le asigna {best.modelPct}% —
      {best.edge.toFixed(1)}pp por encima del {best.impliedPct}% implícito de la cuota.
    </>
  )
}

function OddsCell({ label, odd, implied, value }) {
  return (
    <div className="pp-odds-cell">
      <div className="pp-odds-label">{label}</div>
      {odd != null ? (
        <>
          <div className="pp-odds-val">{odd.toFixed(2)}</div>
          <div className="pp-odds-implied">Implícita: {implied}%</div>
          {value && <div className="pp-odds-value-badge">⚡ Valor</div>}
        </>
      ) : (
        <div className="pp-odds-val">—</div>
      )}
    </div>
  )
}

function LineasApuesta({ match, odds, pred }) {
  if (!odds) {
    return (
      <Card title="Líneas de apuesta" badge="Cuotas decimales">
        <div className="pp-card-body">
          <Unavailable msg="Disponible próximo al partido" />
        </div>
      </Card>
    )
  }

  const isValue = {
    home: pred?.prob_home != null && odds.implied_home != null && (pred.prob_home - odds.implied_home) > VALUE_THRESHOLD,
    draw: pred?.prob_draw != null && odds.implied_draw != null && (pred.prob_draw - odds.implied_draw) > VALUE_THRESHOLD,
    away: pred?.prob_away != null && odds.implied_away != null && (pred.prob_away - odds.implied_away) > VALUE_THRESHOLD,
  }

  const note = buildValueNote(match, odds, pred)

  return (
    <Card title="Líneas de apuesta" badge={`${odds.bookmakers_count} casas · Promedio`}>
      <div className="pp-odds-grid">
        <OddsCell label={match.home_team}  odd={odds.avg_home} implied={odds.implied_home} value={isValue.home} />
        <OddsCell label="Empate"           odd={odds.avg_draw} implied={odds.implied_draw} value={isValue.draw} />
        <OddsCell label={match.away_team}  odd={odds.avg_away} implied={odds.implied_away} value={isValue.away} />
      </div>
      {note && (
        <div className="pp-odds-note">
          💡 <strong>Apuesta de valor:</strong> {note}
        </div>
      )}
    </Card>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function PrePartido({ match }) {
  const [extra,  setExtra]  = useState(null)
  const [groups, setGroups] = useState(null)
  const [odds,   setOdds]   = useState(null)
  const [ready,  setReady]  = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}data/match/${match.id}.json`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${BASE}data/standings.json`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${BASE}data/odds.json`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([ext, std, oddsFile]) => {
      setExtra(ext)
      setGroups(std?.groups ?? null)
      setOdds(oddsFile?.events?.[String(match.id)] ?? null)
      setReady(true)
    })
  }, [match.id])

  return (
    <div className="pp-container">
      <Hero match={match} venue={extra?.venue} weather={extra?.weather} />

      {!ready ? (
        <div className="pp-loading">Cargando datos…</div>
      ) : (
        <div className="pp-sections">
          <Probabilidades match={match} pred={extra?.prediction} />
          <FormaReciente  match={match} groups={groups} />
          <LineasApuesta  match={match} odds={odds} pred={extra?.prediction} />
          <H2H            match={match} data={extra?.head_to_head} />
        </div>
      )}
    </div>
  )
}
