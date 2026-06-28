import { useState, useEffect, useMemo } from 'react'
import { CaretLeft } from '@phosphor-icons/react'
import { flagUrl } from '../teamFlags.js'
import './Equipos.css'

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L']

const ROUND_ES = {
  'Round of 32':  'Dieciseisavos',
  'Round of 16':  'Octavos',
  'Quarter Final':'Cuartos',
  'Semi Final':   'Semis',
  'Third Place':  '3er Puesto',
  'Final':        'Final',
}

const POS_ORDER  = { GK: 0, DF: 1, MF: 2, FW: 3 }
const POS_LABELS = { GK: 'Porteros', DF: 'Defensas', MF: 'Mediocampistas', FW: 'Delanteros' }

/* ─── helpers ─────────────────────────────────── */

function buildTeamList(standings) {
  const teams = []
  for (const [groupName, rows] of Object.entries(standings.groups)) {
    const g = groupName.replace('Group ', '')
    for (const row of rows) {
      teams.push({ ...row, group: g, groupName })
    }
  }
  return teams.sort((a, b) => a.group.localeCompare(b.group) || a.position - b.position)
}

function getStatus(team) {
  if (team.played < 3) return null
  if (team.position <= 2) return 'qualified'
  if (team.position === 3) return 'maybe'
  return 'eliminated'
}

function teamMatches(matches, teamId, teamName) {
  return matches
    .filter(m =>
      m.home_team_id === teamId || m.away_team_id === teamId ||
      m.home_team === teamName  || m.away_team === teamName
    )
    .sort((a, b) => new Date(a.kickoff_at) - new Date(b.kickoff_at))
}

function matchResult(match, teamId, teamName) {
  if (match.home_score == null || match.away_score == null) return 'NS'
  const isHome = match.home_team_id === teamId || (match.home_team === teamName && match.away_team !== teamName)
  const gf = isHome ? match.home_score : match.away_score
  const ga = isHome ? match.away_score : match.home_score
  if (gf > ga) return 'W'
  if (gf < ga) return 'L'
  return 'D'
}

function matchRound(match) {
  if (match.group) return `Gr.${match.group.replace('Group ','')} · J${match.round_number}`
  return ROUND_ES[match.round] || match.round || ''
}

function fmtDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

function shortName(name) {
  if (!name) return ''
  const parts = name.trim().split(' ')
  if (parts.length === 1) return name
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

/* ─── TeamCard ─────────────────────────────────── */

function TeamCard({ team, onClick }) {
  const flag = flagUrl(team.team_name, 80)
  const status = getStatus(team)
  return (
    <div className="eq-card" onClick={onClick}>
      {flag
        ? <img className="eq-card-flag" src={flag} alt={team.team_name} loading="lazy" />
        : <div className="eq-card-flag-ph" />
      }
      <div className="eq-card-name">{team.team_name}</div>
      <div className="eq-card-meta">{team.position}° · Gr.{team.group}</div>
      <div className="eq-card-pts">{team.pts} pts</div>
      {status === 'qualified'  && <div className="eq-badge eq-badge--qualified" style={{fontSize:9}}>✓ Clasificado</div>}
      {status === 'eliminated' && <div className="eq-badge eq-badge--eliminated" style={{fontSize:9}}>× Eliminado</div>}
    </div>
  )
}

/* ─── S1 Hero ──────────────────────────────────── */

function HeroSection({ team }) {
  const flag   = flagUrl(team.team_name, 80)
  const status = getStatus(team)
  return (
    <div className="eq-hero">
      {flag
        ? <img className="eq-hero-flag" src={flag} alt={team.team_name} />
        : <div className="eq-hero-flag-ph" />
      }
      <div className="eq-hero-info">
        <div className="eq-hero-name">{team.team_name}</div>
        <div className="eq-hero-group">{team.position}° Grupo {team.group} · {team.played} partidos</div>
        <div className="eq-hero-badges">
          <span className="eq-badge eq-badge--pts">{team.pts} pts</span>
          {status === 'qualified'  && <span className="eq-badge eq-badge--qualified">✓ Clasificado</span>}
          {status === 'maybe'      && <span className="eq-badge eq-badge--maybe">? Tercer lugar</span>}
          {status === 'eliminated' && <span className="eq-badge eq-badge--eliminated">× Eliminado</span>}
        </div>
      </div>
    </div>
  )
}

/* ─── S2 Group table ────────────────────────────── */

function GroupTable({ groupName, groups, teamId }) {
  const rows = groups[groupName] || []
  return (
    <div className="eq-gtable">
      <div className="eq-gtable-head">
        <span>#</span><span>Equipo</span>
        <span>PJ</span><span>G</span><span>E</span><span>P</span>
        <span>GD</span><span>Pts</span>
      </div>
      {rows.map(row => (
        <div key={row.team_id} className={`eq-gtable-row${row.team_id === teamId ? ' current' : ''}`}>
          <span className="eq-gtable-pos">{row.position}</span>
          <div className="eq-gtable-team">
            {flagUrl(row.team_name, 40)
              ? <img className="eq-gtable-flag" src={flagUrl(row.team_name, 40)} alt={row.team_name} />
              : <div className="eq-gtable-flag-ph" />
            }
            <span className="eq-gtable-name">{row.team_name}</span>
          </div>
          <span>{row.played}</span>
          <span>{row.won}</span>
          <span>{row.drawn}</span>
          <span>{row.lost}</span>
          <span>{row.gd > 0 ? `+${row.gd}` : row.gd}</span>
          <span className="eq-gtable-pts">{row.pts}</span>
        </div>
      ))}
    </div>
  )
}

/* ─── S3 Manager ────────────────────────────────── */

function ManagerSection({ manager }) {
  if (!manager) return <div className="eq-no-data">Sin datos del entrenador</div>

  const profileKey  = manager.tactical_profile?.toLowerCase()?.includes('atac') ? 'attacking'
                    : manager.tactical_profile?.toLowerCase()?.includes('defen') ? 'defensive'
                    : manager.tactical_profile ? 'balanced' : null

  return (
    <div className="eq-manager">
      <div className="eq-manager-top">
        <div>
          <div className="eq-manager-name">{manager.name}</div>
          <div className="eq-manager-country">{manager.country}</div>
        </div>
        <div className="eq-manager-badges">
          {manager.preferred_formation && (
            <span className="eq-m-badge eq-m-badge--formation">{manager.preferred_formation}</span>
          )}
          {profileKey && (
            <span className={`eq-m-badge eq-m-badge--${profileKey}`}>
              {profileKey === 'attacking' ? 'Ofensivo' : profileKey === 'defensive' ? 'Defensivo' : 'Equilibrado'}
            </span>
          )}
        </div>
      </div>
      <div className="eq-manager-stats">
        <div className="eq-mstat">
          <div className="eq-mstat-val">
            {manager.win_pct != null ? `${Math.round(manager.win_pct)}%` : '—'}
          </div>
          <div className="eq-mstat-lbl">% Victorias</div>
        </div>
        <div className="eq-mstat">
          <div className="eq-mstat-val">
            {manager.avg_goals_scored != null ? manager.avg_goals_scored.toFixed(1) : '—'}
          </div>
          <div className="eq-mstat-lbl">Goles/partido</div>
        </div>
        <div className="eq-mstat">
          <div className="eq-mstat-val">
            {manager.avg_possession != null ? `${Math.round(manager.avg_possession)}%` : '—'}
          </div>
          <div className="eq-mstat-lbl">% Posesión</div>
        </div>
        <div className="eq-mstat">
          <div className="eq-mstat-val">
            {manager.clean_sheet_pct != null ? `${Math.round(manager.clean_sheet_pct)}%` : '—'}
          </div>
          <div className="eq-mstat-lbl">Vallas invictas</div>
        </div>
      </div>
    </div>
  )
}

/* ─── S4 Matches ────────────────────────────────── */

function MatchesSection({ matches, teamId, teamName }) {
  const relevant = useMemo(
    () => teamMatches(matches, teamId, teamName),
    [matches, teamId, teamName]
  )

  if (!relevant.length) return <div className="eq-no-data">Sin partidos registrados</div>

  return (
    <div className="eq-matches">
      {relevant.map(m => {
        const res    = matchResult(m, teamId, teamName)
        const isHome = m.home_team_id === teamId || m.home_team === teamName
        const opp    = isHome ? m.away_team : m.home_team
        const score  = m.home_score != null ? `${m.home_score}–${m.away_score}` : null
        const oppFlag = flagUrl(opp, 40)
        return (
          <div key={m.id} className="eq-match">
            <div className={`eq-match-result ${res}`}>
              {res === 'NS' ? '—' : res}
            </div>
            <div className="eq-match-opp">
              {oppFlag
                ? <img className="eq-match-opp-flag" src={oppFlag} alt={opp} />
                : <div className="eq-match-opp-flag-ph" />
              }
              <span className="eq-match-opp-name">{opp || 'Por definir'}</span>
            </div>
            <div className="eq-match-right">
              {score && <div className="eq-match-score">{score}</div>}
              <div className="eq-match-meta">{fmtDate(m.kickoff_at)} · {matchRound(m)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── S5 Top Players ────────────────────────────── */

function TopPlayersSection({ playerStats, teamId }) {
  if (!playerStats?.players) return <div className="eq-no-data">Estadísticas no disponibles aún</div>

  const teamPlayers = playerStats.players.filter(p => p.team_id === teamId)
  if (!teamPlayers.length) return <div className="eq-no-data">Sin estadísticas de jugadores</div>

  const topScorer   = [...teamPlayers].sort((a,b) => b.goals - a.goals || b.shots_on_target - a.shots_on_target)[0]
  const topAssister = [...teamPlayers].sort((a,b) => b.assists - a.assists || b.key_passes - a.key_passes)[0]
  const gk          = [...teamPlayers].filter(p => p.position === 'GK')
    .sort((a,b) => b.clean_sheets - a.clean_sheets || a.goals_conceded - b.goals_conceded)[0]

  return (
    <div className="eq-topplayers">
      {topScorer?.goals > 0 && (
        <div className="eq-toplayer">
          <div className="eq-toplayer-icon">⚽</div>
          <div className="eq-toplayer-info">
            <div className="eq-toplayer-name">{shortName(topScorer.name)}</div>
            <div className="eq-toplayer-label">Goleador · {topScorer.matches} partidos</div>
          </div>
          <div className="eq-toplayer-val">{topScorer.goals}G</div>
        </div>
      )}
      {topAssister?.assists > 0 && topAssister.player_id !== topScorer?.player_id && (
        <div className="eq-toplayer">
          <div className="eq-toplayer-icon">🎯</div>
          <div className="eq-toplayer-info">
            <div className="eq-toplayer-name">{shortName(topAssister.name)}</div>
            <div className="eq-toplayer-label">Asistidor · {topAssister.key_passes} pases clave</div>
          </div>
          <div className="eq-toplayer-val">{topAssister.assists}A</div>
        </div>
      )}
      {topAssister?.assists > 0 && topAssister.player_id === topScorer?.player_id && (
        <div className="eq-toplayer">
          <div className="eq-toplayer-icon">🎯</div>
          <div className="eq-toplayer-info">
            <div className="eq-toplayer-name">{shortName(topAssister.name)}</div>
            <div className="eq-toplayer-label">Asistencias</div>
          </div>
          <div className="eq-toplayer-val">{topAssister.assists}A</div>
        </div>
      )}
      {gk && (
        <div className="eq-toplayer">
          <div className="eq-toplayer-icon">🧤</div>
          <div className="eq-toplayer-info">
            <div className="eq-toplayer-name">{shortName(gk.name)}</div>
            <div className="eq-toplayer-label">
              Portero · {gk.goals_conceded} goles recibidos · {gk.saves} atajadas
            </div>
          </div>
          <div className="eq-toplayer-val">{gk.clean_sheets}CS</div>
        </div>
      )}
      {!topScorer?.goals && !topAssister?.assists && !gk && (
        <div className="eq-no-data">Sin estadísticas de gol aún</div>
      )}
    </div>
  )
}

/* ─── S6 History ────────────────────────────────── */

function HistorySection({ history, seasons }) {
  if (!history) return <div className="eq-no-data">Sin datos históricos</div>
  const seasonsLabel = (seasons || []).join('-')
  return (
    <div>
      <div className="eq-history">
        <div className="eq-hist-card">
          <div className="eq-hist-val">
            {history.goals_for_avg != null ? history.goals_for_avg.toFixed(2) : '—'}
          </div>
          <div className="eq-hist-lbl">Goles anotados por partido</div>
        </div>
        <div className="eq-hist-card">
          <div className="eq-hist-val">
            {history.goals_against_avg != null ? history.goals_against_avg.toFixed(2) : '—'}
          </div>
          <div className="eq-hist-lbl">Goles recibidos por partido</div>
        </div>
      </div>
      {history.matches_used && (
        <div className="eq-hist-meta">
          Promedio histórico · temporadas {seasonsLabel} · {history.matches_used} partidos
        </div>
      )}
    </div>
  )
}

/* ─── S7 Squad ──────────────────────────────────── */

function SquadSection({ squads, teamId }) {
  if (!squads?.by_team) return <div className="eq-no-data">Nómina no disponible</div>

  const all      = (squads.by_team[String(teamId)] || []).filter(p => p.status === 'official')
  const byPos    = {}
  for (const p of all) {
    if (!byPos[p.position]) byPos[p.position] = []
    byPos[p.position].push(p)
  }

  const posGroups = POS_ORDER
    ? Object.entries(byPos).sort((a, b) => (POS_ORDER[a[0]] ?? 9) - (POS_ORDER[b[0]] ?? 9))
    : Object.entries(byPos)

  if (!all.length) return <div className="eq-no-data">Nómina no disponible</div>

  return (
    <div className="eq-squad">
      {posGroups.map(([pos, players]) => (
        <div key={pos} className="eq-pos-group">
          <div className="eq-pos-label">{POS_LABELS[pos] || pos} ({players.length})</div>
          {players.map(p => (
            <div key={p.player_id} className="eq-player">
              <div className="eq-player-num">{p.jersey_number ?? '—'}</div>
              <div className="eq-player-info">
                <div className="eq-player-name">{p.name}</div>
                <div className="eq-player-club">
                  {p.club || '—'}{p.club_country ? ` · ${p.club_country}` : ''}
                </div>
              </div>
              <div className="eq-player-meta">
                {p.age != null ? `${p.age}a` : ''}
                {p.caps != null ? <> · <span className="eq-player-caps">{p.caps}</span> caps</> : ''}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/* ─── TeamDetail panel ──────────────────────────── */

function TeamDetail({ team, data, onBack }) {
  const flag    = flagUrl(team.team_name, 80)
  const manager = data.managers?.managers?.[String(team.team_id)]
  const history = data.history?.teams?.[String(team.team_id)]

  return (
    <div className="eq-detail">
      {/* Topbar */}
      <header className="eq-d-topbar">
        <button className="eq-d-back" onClick={onBack}>
          <CaretLeft size={15} weight="bold" />
          Equipos
        </button>
        {flag && <img className="eq-d-topbar-flag" src={flag} alt={team.team_name} />}
        <span className="eq-d-topbar-name">{team.team_name}</span>
      </header>

      <div className="eq-d-body">
        {/* S1 — Hero */}
        <HeroSection team={team} />

        {/* S2 — Tabla del grupo */}
        <div className="eq-section">
          <div className="eq-section-title">Tabla · Grupo {team.group}</div>
          <GroupTable groupName={team.groupName} groups={data.standings.groups} teamId={team.team_id} />
        </div>

        {/* S3 — Entrenador */}
        <div className="eq-section">
          <div className="eq-section-title">Entrenador</div>
          <ManagerSection manager={manager} />
        </div>

        {/* S4 — Partidos en el torneo */}
        <div className="eq-section">
          <div className="eq-section-title">Partidos en el torneo</div>
          <MatchesSection
            matches={data.matches}
            teamId={team.team_id}
            teamName={team.team_name}
          />
        </div>

        {/* S5 — Jugadores destacados */}
        <div className="eq-section">
          <div className="eq-section-title">Jugadores destacados</div>
          <TopPlayersSection playerStats={data.playerStats} teamId={team.team_id} />
        </div>

        {/* S6 — Historial pre-torneo */}
        <div className="eq-section">
          <div className="eq-section-title">Promedio histórico</div>
          <HistorySection history={history} seasons={data.history?.seasons_used} />
        </div>

        {/* S7 — Nómina */}
        <div className="eq-section">
          <div className="eq-section-title">Nómina oficial</div>
          <SquadSection squads={data.squads} teamId={team.team_id} />
        </div>
      </div>
    </div>
  )
}

/* ─── Main Equipos component ────────────────────── */

export default function Equipos() {
  const [data,         setData]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [groupFilter,  setGroupFilter]  = useState('all')
  const [selectedTeam, setSelectedTeam] = useState(null)

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    Promise.all([
      fetch(`${base}data/standings.json`).then(r => r.json()),
      fetch(`${base}data/managers.json`).then(r => r.json()).catch(() => null),
      fetch(`${base}data/team_history.json`).then(r => r.json()).catch(() => null),
      fetch(`${base}data/player-stats.json`).then(r => r.json()).catch(() => null),
      fetch(`${base}data/matches.json`).then(r => r.json()),
      fetch(`${base}data/squads.json`).then(r => r.json()).catch(() => null),
    ]).then(([standings, managers, history, playerStats, matchesRaw, squads]) => {
      // matches.json is a plain array
      const matches = Array.isArray(matchesRaw) ? matchesRaw : (matchesRaw?.matches || [])
      setData({ standings, managers, history, playerStats, matches, squads })
      setLoading(false)
    })
  }, [])

  const teams = useMemo(() => data ? buildTeamList(data.standings) : [], [data])

  const filtered = useMemo(() =>
    groupFilter === 'all' ? teams : teams.filter(t => t.group === groupFilter),
    [teams, groupFilter]
  )

  if (loading) return <div className="eq-loading">Cargando equipos...</div>

  if (selectedTeam) {
    return (
      <TeamDetail
        team={selectedTeam}
        data={data}
        onBack={() => setSelectedTeam(null)}
      />
    )
  }

  return (
    <div className="eq-wrap">
      <div className="eq-header">
        <div className="eq-title">Equipos</div>
        <div className="eq-sub">{teams.length} selecciones · 12 grupos</div>
      </div>

      {/* Group filter */}
      <div className="eq-filters">
        <button
          className={`eq-chip ${groupFilter === 'all' ? 'active' : ''}`}
          onClick={() => setGroupFilter('all')}
        >
          Todos
        </button>
        {GROUPS.map(g => (
          <button
            key={g}
            className={`eq-chip ${groupFilter === g ? 'active' : ''}`}
            onClick={() => setGroupFilter(g)}
          >
            Gr. {g}
          </button>
        ))}
      </div>

      {/* Team grid */}
      <div className="eq-grid">
        {filtered.map(team => (
          <TeamCard key={team.team_id} team={team} onClick={() => setSelectedTeam(team)} />
        ))}
      </div>
    </div>
  )
}
