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

// ─── IDENTIDAD TÁCTICA ───────────────────────────────────────

const PROFILE_LABELS = {
  attacking: 'Atacante',
  defensive: 'Defensivo',
  balanced:  'Equilibrado',
}

function getStyleTags(m) {
  if (!m) return []
  const tags = []
  if (m.avg_possession > 60)       tags.push('Posesión alta')
  else if (m.avg_possession < 45)  tags.push('Juego directo')
  if (m.clean_sheet_pct > 50)      tags.push('Sólido atrás')
  if (m.avg_goals_scored > 1.8)    tags.push('Potente ofensiva')
  if (m.btts_pct < 30)             tags.push('Bien organizado')
  if (m.over_25_pct > 55)          tags.push('Partido abierto')
  return tags.slice(0, 3)
}

function offenseScore(m) {
  // Normalize avg_goals_scored: 0–3 → 0–100
  return Math.min(100, Math.round((m.avg_goals_scored / 3.0) * 100))
}

function generateSummary(home, away, match) {
  if (!home || !away) return null
  const lp = { attacking: 'ofensivo', defensive: 'defensivo', balanced: 'equilibrado' }
  const hp = lp[home.tactical_profile] ?? home.tactical_profile ?? '—'
  const ap = lp[away.tactical_profile] ?? away.tactical_profile ?? '—'
  const possGap = Math.abs(home.avg_possession - away.avg_possession) > 10
  const dominant = home.avg_possession > away.avg_possession ? match.home_team : match.away_team
  let t = `${match.home_team} (${home.preferred_formation}, ${hp}) frente a ${match.away_team} (${away.preferred_formation}, ${ap}).`
  if (possGap) t += ` ${dominant} domina habitualmente la posesión del balón.`
  else         t += ` Estilos similares en la gestión del balón.`
  return t
}

function AttrBar({ label, value }) {
  const pct = Math.min(100, Math.max(0, Math.round(value ?? 0)))
  return (
    <div className="pp-attr-bar">
      <div className="pp-attr-row">
        <span className="pp-attr-label">{label}</span>
        <span className="pp-attr-val">{pct}%</span>
      </div>
      <div className="pp-attr-track">
        <div className="pp-attr-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function TeamTactics({ team, teamId, manager }) {
  const tags      = getStyleTags(manager)
  const formation = manager?.preferred_formation ?? '—'
  const profile   = PROFILE_LABELS[manager?.tactical_profile] ?? manager?.tactical_profile ?? null

  return (
    <div className="pp-tactics-col">
      {/* Header: crest + team name + formation */}
      <div className="pp-tactics-header">
        <Crest teamId={teamId} teamName={team} size={32} />
        <div className="pp-tactics-team-info">
          <div className="pp-tactics-team-name">{team}</div>
          <div className="pp-tactics-meta">
            <span className="pp-tactics-formation">{formation}</span>
            {manager && (
              <span className="pp-tactics-manager-name">{manager.name}</span>
            )}
          </div>
        </div>
      </div>

      {manager ? (
        <>
          {/* Tactical profile badge */}
          {profile && (
            <span
              className="pp-tactics-profile-badge"
              data-profile={manager.tactical_profile}
            >
              {profile}
            </span>
          )}

          {/* Style tags */}
          {tags.length > 0 && (
            <div className="pp-tactics-tags">
              {tags.map(t => (
                <span key={t} className="pp-tactics-tag">{t}</span>
              ))}
            </div>
          )}

          {/* Attribute bars */}
          <div className="pp-tactics-bars">
            <AttrBar label="Poder ofensivo"      value={offenseScore(manager)} />
            <AttrBar label="Solidez defensiva"   value={manager.clean_sheet_pct} />
            <AttrBar label="Posesión media"      value={manager.avg_possession} />
            <AttrBar label="Efectividad"         value={manager.win_pct} />
          </div>

          {/* Win record chip */}
          <div className="pp-tactics-record">
            <span className="pp-tactics-record-chip pp-tactics-w">{manager.wins}G</span>
            <span className="pp-tactics-record-chip pp-tactics-d">{manager.draws}E</span>
            <span className="pp-tactics-record-chip pp-tactics-l">{manager.losses}P</span>
            <span className="pp-tactics-record-note">últimos {manager.matches_total} partidos</span>
          </div>
        </>
      ) : (
        <div className="pp-tactics-empty">Sin datos disponibles</div>
      )}
    </div>
  )
}

function IdentidadTactica({ match, managersData }) {
  const hm = managersData?.[String(match.home_team_id)] ?? null
  const am = managersData?.[String(match.away_team_id)] ?? null

  if (!hm && !am) {
    return (
      <Card title="Identidad Táctica" badge="Perfil de juego">
        <div className="pp-card-body">
          <Unavailable msg="Datos disponibles cuando empiece el torneo" />
        </div>
      </Card>
    )
  }

  const summary = generateSummary(hm, am, match)

  return (
    <Card title="Identidad Táctica" badge="Perfil de juego">
      <div className="pp-tactics-grid">
        <TeamTactics
          team={match.home_team}
          teamId={match.home_team_id}
          manager={hm}
        />
        <div className="pp-tactics-divider" />
        <TeamTactics
          team={match.away_team}
          teamId={match.away_team_id}
          manager={am}
        />
      </div>
      {summary && (
        <div className="pp-tactics-summary">{summary}</div>
      )}
    </Card>
  )
}

// ─── MATRIZ ATAQUE / DEFENSA ──────────────────────────────────

function median(arr) {
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2
}

function MatrizAtaqueDefensa({ match, teamHistory }) {
  const teams = teamHistory ? Object.values(teamHistory.teams ?? {}) : []

  const homeD = teamHistory?.teams?.[String(match.home_team_id)] ?? null
  const awayD = teamHistory?.teams?.[String(match.away_team_id)] ?? null

  if (!teams.length || (!homeD && !awayD)) {
    return (
      <Card title="Matriz Ataque / Defensa" badge="Contexto del torneo">
        <div className="pp-card-body">
          <Unavailable msg="Ejecutá scripts/fetch-team-history.js para generar los datos" />
        </div>
      </Card>
    )
  }

  // ─── axes ────────────────────────────────────────────────
  const allX = teams.map(t => t.xg_against_avg ?? t.goals_against_avg).filter(v => v != null)
  const allY = teams.map(t => t.xg_for_avg     ?? t.goals_for_avg).filter(v => v != null)

  const xMax = Math.max(2.5, Math.ceil(Math.max(...allX) * 4) / 4)
  const yMax = Math.max(2.5, Math.ceil(Math.max(...allY) * 4) / 4)

  const medX = median(allX)
  const medY = median(allY)

  // ─── SVG layout ──────────────────────────────────────────
  const W = 340, H = 220
  const pL = 38, pR = 10, pT = 12, pB = 28
  const pw = W - pL - pR   // plot width
  const ph = H - pT - pB   // plot height

  const sx = v => pL + (v / xMax) * pw
  const sy = v => pT + ((yMax - v) / yMax) * ph

  const msx = sx(medX)
  const msy = sy(medY)

  const xTicks = [0, 1, 2, xMax].filter((v, i, a) => a.indexOf(v) === i)
  const yTicks = [0, 1, 2, yMax].filter((v, i, a) => a.indexOf(v) === i)

  const dataLabel = teamHistory?.data_type === 'xg' ? 'xG histórico' : 'Goles históricos'
  const sources   = teams[0]?.source === 'bsd_managers' ? 'Datos pre-torneo BSD' : `Datos pre-torneo · ${teams.length} equipos`

  return (
    <Card title="Matriz Ataque / Defensa" badge={dataLabel}>
      <div className="pp-matrix-wrap">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="pp-matrix-svg"
          aria-label="Scatter plot ataque vs defensa"
        >
          {/* Quadrant shading */}
          <rect x={pL} y={pT} width={msx - pL} height={msy - pT} fill="var(--green)" opacity="0.04" />
          <rect x={msx} y={pT} width={pL + pw - msx} height={msy - pT} fill="var(--amber)" opacity="0.04" />
          <rect x={pL} y={msy} width={msx - pL} height={pT + ph - msy} fill="var(--blue)" opacity="0.04" />
          <rect x={msx} y={msy} width={pL + pw - msx} height={pT + ph - msy} fill="var(--red)" opacity="0.03" />

          {/* Median lines */}
          <line x1={msx} y1={pT} x2={msx} y2={pT + ph} stroke="var(--border2)" strokeDasharray="3 3" strokeWidth="1" />
          <line x1={pL} y1={msy} x2={pL + pw} y2={msy} stroke="var(--border2)" strokeDasharray="3 3" strokeWidth="1" />

          {/* Quadrant labels */}
          <text x={pL + 4} y={pT + 10} className="pp-mq-label">Élite</text>
          <text x={pL + pw - 4} y={pT + 10} textAnchor="end" className="pp-mq-label">Ariete</text>
          <text x={pL + 4} y={pT + ph - 4} className="pp-mq-label">Bunker</text>
          <text x={pL + pw - 4} y={pT + ph - 4} textAnchor="end" className="pp-mq-label">Desarrollo</text>

          {/* X axis ticks */}
          {xTicks.map(v => (
            <g key={v}>
              <line x1={sx(v)} y1={pT + ph} x2={sx(v)} y2={pT + ph + 3} stroke="var(--border2)" strokeWidth="1" />
              <text x={sx(v)} y={H - 5} textAnchor="middle" className="pp-m-tick">{v}</text>
            </g>
          ))}

          {/* Y axis ticks */}
          {yTicks.map(v => (
            <g key={v}>
              <line x1={pL - 3} y1={sy(v)} x2={pL} y2={sy(v)} stroke="var(--border2)" strokeWidth="1" />
              <text x={pL - 5} y={sy(v) + 3} textAnchor="end" className="pp-m-tick">{v}</text>
            </g>
          ))}

          {/* All 48 teams (background dots) */}
          {teams.map(t => {
            const xv = t.xg_against_avg ?? t.goals_against_avg
            const yv = t.xg_for_avg     ?? t.goals_for_avg
            if (xv == null || yv == null) return null
            const isHome = t.team_id === match.home_team_id
            const isAway = t.team_id === match.away_team_id
            if (isHome || isAway) return null
            return (
              <circle
                key={t.team_id}
                cx={sx(xv)} cy={sy(yv)}
                r="3"
                fill="var(--ink3)"
                opacity="0.5"
              />
            )
          })}

          {/* Away team (draw first so home overlaps if same position) */}
          {awayD && (() => {
            const xv = awayD.xg_against_avg ?? awayD.goals_against_avg
            const yv = awayD.xg_for_avg     ?? awayD.goals_for_avg
            const cx = sx(xv), cy = sy(yv)
            const labelY = cy > pT + 20 ? cy - 10 : cy + 18
            return (
              <g>
                <circle cx={cx} cy={cy} r="7" fill="var(--red)" opacity="0.85" />
                <text x={cx} y={labelY} textAnchor="middle" className="pp-m-team-label pp-m-away">
                  {match.away_team.split(' ')[0]}
                </text>
              </g>
            )
          })()}

          {/* Home team */}
          {homeD && (() => {
            const xv = homeD.xg_against_avg ?? homeD.goals_against_avg
            const yv = homeD.xg_for_avg     ?? homeD.goals_for_avg
            const cx = sx(xv), cy = sy(yv)
            const labelY = cy > pT + 20 ? cy - 10 : cy + 18
            return (
              <g>
                <circle cx={cx} cy={cy} r="7" fill="var(--blue)" opacity="0.85" />
                <text x={cx} y={labelY} textAnchor="middle" className="pp-m-team-label pp-m-home">
                  {match.home_team.split(' ')[0]}
                </text>
              </g>
            )
          })()}

          {/* Axis labels */}
          <text x={pL + pw / 2} y={H - 1} textAnchor="middle" className="pp-m-axis">
            ← Mejor defensa · Goles concedidos/partido · Peor →
          </text>
        </svg>

        {/* Legend */}
        <div className="pp-matrix-legend">
          <span className="pp-matrix-dot" style={{ background: 'var(--blue)' }} />
          <span className="pp-matrix-legend-name">{match.home_team}</span>
          <span className="pp-matrix-dot" style={{ background: 'var(--red)' }} />
          <span className="pp-matrix-legend-name">{match.away_team}</span>
          <span className="pp-matrix-dot" style={{ background: 'var(--ink3)', opacity: 0.5 }} />
          <span className="pp-matrix-legend-name" style={{ color: 'var(--ink3)' }}>Resto del torneo</span>
        </div>

        <div className="pp-matrix-note">{sources}</div>
      </div>
    </Card>
  )
}

// ─── RED DE PASES ────────────────────────────────────────────

const POS_COLORS = {
  G: '#F59E0B',
  D: '#60A5FA',
  M: '#34D399',
  F: '#F87171',
}

function buildConnections(players) {
  const byPos = {}
  for (const p of players) (byPos[p.pos] = byPos[p.pos] || []).push(p)

  const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2
  const seen = new Set()
  const conns = []

  const add = (a, b) => {
    const key = [a.player_id, b.player_id].sort().join('|')
    if (!seen.has(key)) {
      seen.add(key)
      conns.push({ a, b, d: Math.sqrt(dist2(a, b)) })
    }
  }

  const order = ['G', 'D', 'M', 'F']
  for (let i = 0; i < order.length - 1; i++) {
    const from = byPos[order[i]] ?? []
    const to   = byPos[order[i + 1]] ?? []
    for (const a of from) {
      to.slice().sort((x, y) => dist2(a, x) - dist2(a, y)).slice(0, 2).forEach(b => add(a, b))
    }
  }
  for (const pos of ['D', 'M', 'F']) {
    const g = (byPos[pos] ?? []).slice().sort((a, b) => a.y - b.y)
    for (let i = 0; i < g.length - 1; i++) add(g[i], g[i + 1])
  }
  return conns
}

function PitchSVG({ players, isSynthetic }) {
  const W = 280, H = 420
  const pL = 20, pR = 20, pT = 20, pB = 20
  const pw = W - pL - pR
  const ph = H - pT - pB

  const toX = y => pL + (y / 100) * pw
  const toY = x => pT + (1 - x / 100) * ph

  const conns = buildConnections(players)
  const maxD  = Math.max(...conns.map(c => c.d), 1)
  const minD  = Math.min(...conns.map(c => c.d), 0)

  const ns   = players.map(p => p.n ?? 50)
  const minN = Math.min(...ns)
  const maxN = Math.max(...ns)
  const nodeR = n => isSynthetic ? 8 : Math.round(6 + ((n - minN) / Math.max(1, maxN - minN)) * 7)

  const ls = 'rgba(255,255,255,0.18)'
  const midY = pT + ph / 2
  const midX = pL + pw / 2
  const paW = pw * 0.593, paH = ph * 0.157, paL = pL + (pw - pw * 0.593) / 2
  const gaW = pw * 0.269, gaH = ph * 0.052, gaL = pL + (pw - pw * 0.269) / 2
  const cR = pw * 0.135

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="pp-pn-svg">
      {/* Pitch markings */}
      <rect x={pL} y={pT} width={pw} height={ph} fill="#1a4f32" />
      <rect x={pL} y={pT} width={pw} height={ph} fill="none" stroke={ls} strokeWidth="1" />
      <line x1={pL} y1={midY} x2={pL + pw} y2={midY} stroke={ls} strokeWidth="1" />
      <circle cx={midX} cy={midY} r={cR} fill="none" stroke={ls} strokeWidth="1" />
      <circle cx={midX} cy={midY} r="2" fill={ls} />
      <rect x={paL} y={pT}        width={paW} height={paH} fill="none" stroke={ls} strokeWidth="1" />
      <rect x={paL} y={pT+ph-paH} width={paW} height={paH} fill="none" stroke={ls} strokeWidth="1" />
      <rect x={gaL} y={pT}        width={gaW} height={gaH} fill="none" stroke={ls} strokeWidth="1" />
      <rect x={gaL} y={pT+ph-gaH} width={gaW} height={gaH} fill="none" stroke={ls} strokeWidth="1" />

      {/* Connection lines */}
      {conns.map((c, i) => {
        const norm = 1 - (c.d - minD) / (maxD - minD + 0.01)
        return (
          <line key={i}
            x1={toX(c.a.y)} y1={toY(c.a.x)}
            x2={toX(c.b.y)} y2={toY(c.b.x)}
            stroke="white"
            strokeWidth={0.5 + norm * 1.8}
            opacity={0.1 + norm * 0.28}
          />
        )
      })}

      {/* Player nodes */}
      {players.map(p => {
        const cx  = toX(p.y)
        const cy  = toY(p.x)
        const pr  = nodeR(p.n ?? 50)
        const col = POS_COLORS[p.pos] ?? '#94A3B8'
        const raw = p.name ?? ''
        const lbl = isSynthetic ? p.pos : raw.split(' ').pop().slice(0, 9)
        return (
          <g key={p.player_id ?? `p-${p.x}-${p.y}`}>
            <circle cx={cx} cy={cy} r={pr} fill={col} opacity="0.9" />
            <circle cx={cx} cy={cy} r={pr} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="0.8" />
            <text x={cx} y={cy - pr - 3} textAnchor="middle" className="pp-pn-label">{lbl}</text>
          </g>
        )
      })}
    </svg>
  )
}

const NOTE_BY_SOURCE = {
  current: 'Tamaño del nodo = toques con el balón',
  wc:      'Posiciones del último partido Mundial · Referencia',
  intl:    'Último partido internacional · Referencia pre-partido',
}

function RedDePases({ match, positions, fallbackPositions }) {
  const [side, setSide] = useState('home')

  // Resolve per-side data objects: { positions, source } | null
  const homeData = positions?.home
    ? { positions: positions.home, source: 'current' }
    : fallbackPositions?.home ?? null

  const awayData = positions?.away
    ? { positions: positions.away, source: 'current' }
    : fallbackPositions?.away ?? null

  const curData = side === 'home' ? homeData : awayData
  const curPos  = curData?.positions ?? null
  const noteText = curData ? (NOTE_BY_SOURCE[curData.source] ?? null) : null

  const POS_LEGEND = [
    { col: POS_COLORS.G, lbl: 'Portero' },
    { col: POS_COLORS.D, lbl: 'Defensa' },
    { col: POS_COLORS.M, lbl: 'Mediocampista' },
    { col: POS_COLORS.F, lbl: 'Delantero' },
  ]

  return (
    <Card title="Red de Pases" badge="Posiciones promedio">
      <div className="pp-pn-tabs">
        <button className={`pp-pn-tab${side === 'home' ? ' active' : ''}`} onClick={() => setSide('home')}>
          {match.home_team}
        </button>
        <button className={`pp-pn-tab${side === 'away' ? ' active' : ''}`} onClick={() => setSide('away')}>
          {match.away_team}
        </button>
      </div>

      {curPos ? (
        <PitchSVG players={curPos} isSynthetic={false} />
      ) : (
        <div className="pp-card-body" style={{ paddingBottom: 28 }}>
          <Unavailable msg="Disponible tras el primer partido" />
        </div>
      )}

      {(homeData || awayData) && (
        <>
          <div className="pp-pn-legend">
            {POS_LEGEND.map(({ col, lbl }) => (
              <span key={lbl} className="pp-pn-legend-item">
                <span className="pp-pn-dot" style={{ background: col }} />
                <span className="pp-pn-dot-label">{lbl}</span>
              </span>
            ))}
          </div>
          {noteText && <div className="pp-pn-note">{noteText}</div>}
        </>
      )}
    </Card>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────
export default function PrePartido({ match }) {
  const [extra,             setExtra]             = useState(null)
  const [groups,            setGroups]            = useState(null)
  const [odds,              setOdds]              = useState(null)
  const [managers,          setManagers]          = useState(null)
  const [teamHistory,       setTeamHistory]       = useState(null)
  const [fallbackPositions, setFallbackPositions] = useState({ home: null, away: null })
  const [ready,             setReady]             = useState(false)

  useEffect(() => {
    async function load() {
      const safe = p => p.then(r => r.ok ? r.json() : null).catch(() => null)
      const [ext, std, oddsFile, mgrFile, histFile, allMatches] = await Promise.all([
        safe(fetch(`${BASE}data/match/${match.id}.json`)),
        safe(fetch(`${BASE}data/standings.json`)),
        safe(fetch(`${BASE}data/odds.json`)),
        safe(fetch(`${BASE}data/managers.json`)),
        safe(fetch(`${BASE}data/team_history.json`)),
        safe(fetch(`${BASE}data/matches.json`)),
      ])

      setExtra(ext)
      setGroups(std?.groups ?? null)
      setOdds(oddsFile?.events?.[String(match.id)] ?? null)
      setManagers(mgrFile?.managers ?? null)
      setTeamHistory(histFile)

      // fallbackPositions shape: { home: { positions, source } | null, away: ... }
      const fbPos = { home: null, away: null }

      // Phase 2: last WC match positions for future matches
      if (!ext?.average_positions && Array.isArray(allMatches)) {
        const ftMatches = allMatches.filter(m => m.status === 'FT' && m.id !== match.id)
        const byDate = (a, b) => new Date(b.kickoff_at) - new Date(a.kickoff_at)

        const lastHome = ftMatches
          .filter(m => m.home_team_id === match.home_team_id || m.away_team_id === match.home_team_id)
          .sort(byDate)[0] ?? null

        const lastAway = ftMatches
          .filter(m => m.home_team_id === match.away_team_id || m.away_team_id === match.away_team_id)
          .sort(byDate)[0] ?? null

        const ids = [...new Set([lastHome?.id, lastAway?.id].filter(Boolean))]
        const fetched = await Promise.all(ids.map(id => safe(fetch(`${BASE}data/match/${id}.json`))))
        const cache = Object.fromEntries(ids.map((id, i) => [id, fetched[i]]))

        if (lastHome && cache[lastHome.id]?.average_positions) {
          const side = lastHome.home_team_id === match.home_team_id ? 'home' : 'away'
          fbPos.home = { positions: cache[lastHome.id].average_positions[side], source: 'wc' }
        }
        if (lastAway && cache[lastAway.id]?.average_positions) {
          const side = lastAway.home_team_id === match.away_team_id ? 'home' : 'away'
          fbPos.away = { positions: cache[lastAway.id].average_positions[side], source: 'wc' }
        }
      }

      // Phase 3: last international match from last-positions.json
      const lastPos = await safe(fetch(`${BASE}data/last-positions.json`))
      if (lastPos?.teams) {
        if (!fbPos.home) {
          const t = lastPos.teams[String(match.home_team_id)]
          if (t?.positions?.length) fbPos.home = { positions: t.positions, source: 'intl' }
        }
        if (!fbPos.away) {
          const t = lastPos.teams[String(match.away_team_id)]
          if (t?.positions?.length) fbPos.away = { positions: t.positions, source: 'intl' }
        }
      }

      setFallbackPositions(fbPos)
      setReady(true)
    }

    load()
  }, [match.id])

  return (
    <div className="pp-container">
      <Hero match={match} venue={extra?.venue} weather={extra?.weather} />

      {!ready ? (
        <div className="pp-loading">Cargando datos…</div>
      ) : (
        <div className="pp-sections">
          <Probabilidades       match={match} pred={extra?.prediction} />
          <FormaReciente        match={match} groups={groups} />
          <LineasApuesta        match={match} odds={odds} pred={extra?.prediction} />
          <IdentidadTactica     match={match} managersData={managers} />
          <MatrizAtaqueDefensa  match={match} teamHistory={teamHistory} />
          <RedDePases           match={match} positions={extra?.average_positions} fallbackPositions={fallbackPositions} />
          <H2H                  match={match} data={extra?.head_to_head} />
        </div>
      )}
    </div>
  )
}
