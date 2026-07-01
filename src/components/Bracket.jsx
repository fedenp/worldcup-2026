import { useState, useEffect } from 'react'
import { flagUrl } from '../teamFlags.js'
import './Bracket.css'

// Match IDs ordered top-to-bottom per the official bracket (M73→M88)
// R32 left half: M73 SA-Canada, M74 GER-PAR, M75 NED-MAR, M76 BRA-JPN,
//                M77 FRA-SWE, M78 CIV-NOR, M79 MEX-ECU, M80 ENG-DRC
// R32 right half: M81 USA-BIH, M82 BEL-SEN, M83 POR-CRO, M84 ESP-AUT,
//                 M85 SUI-ALG, M86 ARG-CPV, M87 COL-GHA, M88 AUS-EGY
const R32_IDS = [8359, 8361, 8362, 8360, 8364, 8363, 8365, 8366,
                 8368, 8367, 8370, 8369, 8371, 8373, 8374, 8372]
// R16 slots map to R32 pairs: W89+W90, W91+W92 (left); W93+W94, W95+W96 (right)
const R16_IDS = [8375, 8376, 8377, 8378, 8380, 8379, 8382, 8381]
// QF: 8383=W97+W98 (left top), 8385=W97+W98 (left bot), 8384=right top, 8386=right bot
const QF_IDS  = [8383, 8385, 8384, 8386]
const SF_IDS  = [8387, 8388]
const FINAL_ID = 8390
const THIRD_ID = 8389

const TOTAL_H  = 1104   // 16 slots × 69px
const LABEL_H  = 24     // height reserved for round label
const COL_W    = 152
const CONN_W   = 24

function resolveTeam(code, standings) {
  if (!code) return { name: 'TBD', tbd: true }

  // "1A", "2B" — position then group letter
  let m = code.match(/^(\d+)([A-L])$/)
  if (m) {
    const pos = parseInt(m[1]) - 1
    const grp = `Group ${m[2]}`
    const t = standings?.groups?.[grp]?.[pos]
    return t
      ? { name: t.team_name, flag: flagUrl(t.team_name, 40) }
      : { name: `${m[1]}° Gr.${m[2]}`, tbd: true }
  }

  // "H1", "G2" — group letter then position
  m = code.match(/^([A-L])(\d+)$/)
  if (m) {
    const pos = parseInt(m[2]) - 1
    const grp = `Group ${m[1]}`
    const t = standings?.groups?.[grp]?.[pos]
    return t
      ? { name: t.team_name, flag: flagUrl(t.team_name, 40) }
      : { name: `${m[2]}° Gr.${m[1]}`, tbd: true }
  }

  // "3D/3E/3I/..." — best third-place finishers (one from listed groups)
  if (/^3[A-L](\/3[A-L])*$/.test(code)) {
    const groups = code.split('/').map(s => s[1]).join('/')
    return { name: `3° ${groups}`, tbd: true }
  }

  // "W85", "L101" — winner/loser of a later match
  if (/^[WL]\d+$/.test(code)) {
    return { name: 'Por definir', tbd: true }
  }

  // Real team name already resolved by BSD
  return { name: code, flag: flagUrl(code, 40) }
}

function TeamRow({ team, score, played, isWinner }) {
  return (
    <div className={`bk-team${isWinner ? ' bk-team--win' : ''}${played && !isWinner ? ' bk-team--loss' : ''}`}>
      {team.flag
        ? <img className="bk-flag" src={team.flag} alt="" loading="lazy" />
        : <span className="bk-flag-ph" />
      }
      <span className={`bk-name${team.tbd ? ' bk-name--tbd' : ''}`}>{team.name}</span>
      {played && <span className="bk-score">{score ?? '?'}</span>}
    </div>
  )
}

function MatchCard({ match, standings }) {
  if (!match) {
    return (
      <div className="bk-card bk-card--empty">
        <div className="bk-team"><span className="bk-flag-ph" /><span className="bk-name bk-name--tbd">TBD</span></div>
        <div className="bk-divider" />
        <div className="bk-team"><span className="bk-flag-ph" /><span className="bk-name bk-name--tbd">TBD</span></div>
      </div>
    )
  }

  const home = resolveTeam(match.home_team, standings)
  const away = resolveTeam(match.away_team, standings)
  const played  = ['FT','AET','PEN'].includes(match.status)
  const homeWin = played && match.home_score > match.away_score
  const awayWin = played && match.away_score > match.home_score

  return (
    <div className={`bk-card${played ? ' bk-card--played' : ''}`}>
      <TeamRow team={home} score={match.home_score} played={played} isWinner={homeWin} />
      <div className="bk-divider" />
      <TeamRow team={away} score={match.away_score} played={played} isWinner={awayWin} />
    </div>
  )
}

// SVG connector lines between adjacent rounds
// leftN = cards in left round, rightN = cards in right round (= leftN/2)
function Connector({ leftN, rightN }) {
  const leftSlot  = TOTAL_H / leftN
  const rightSlot = TOTAL_H / rightN
  const midX = CONN_W / 2
  const paths = []

  for (let i = 0; i < rightN; i++) {
    const topY   = (2 * i + 0.5) * leftSlot
    const botY   = (2 * i + 1.5) * leftSlot
    const midY   = (i + 0.5) * rightSlot  // = (2i+1)*leftSlot — center of right slot
    paths.push(
      <g key={i}>
        <line x1={0}    y1={topY} x2={midX} y2={topY} />
        <line x1={0}    y1={botY} x2={midX} y2={botY} />
        <line x1={midX} y1={topY} x2={midX} y2={botY} />
        <line x1={midX} y1={midY} x2={CONN_W} y2={midY} />
      </g>
    )
  }

  return (
    <svg
      className="bk-connector"
      width={CONN_W}
      height={TOTAL_H}
      viewBox={`0 0 ${CONN_W} ${TOTAL_H}`}
      style={{ marginTop: LABEL_H }}
    >
      <g stroke="var(--border2)" strokeWidth="1.5" fill="none" strokeLinecap="round">
        {paths}
      </g>
    </svg>
  )
}

function RoundCol({ ids, matchMap, standings, label, slotH }) {
  return (
    <div className="bk-round" style={{ width: COL_W }}>
      <div className="bk-round-label" style={{ height: LABEL_H }}>{label}</div>
      <div className="bk-slots">
        {ids.map((id, i) => (
          <div key={i} className="bk-slot" style={{ height: slotH }}>
            <MatchCard match={matchMap[id]} standings={standings} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Bracket() {
  const [matchMap,  setMatchMap]  = useState({})
  const [standings, setStandings] = useState(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    const base = import.meta.env.BASE_URL
    Promise.all([
      fetch(`${base}data/matches.json`).then(r => r.json()),
      fetch(`${base}data/standings.json`).then(r => r.json()),
    ]).then(([matches, std]) => {
      const map = {}
      for (const m of matches) map[m.id] = m
      setMatchMap(map)
      setStandings(std)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="bk-loading">Cargando bracket…</div>

  const slotPerRound = [
    TOTAL_H / 16,   // R32  = 69
    TOTAL_H / 8,    // R16  = 138
    TOTAL_H / 4,    // QF   = 276
    TOTAL_H / 2,    // SF   = 552
    TOTAL_H,        // Final = 1104
  ]

  return (
    <div className="bk-wrap">
      <div className="bk-header">
        <h2 className="bk-title">Fase Eliminatoria</h2>
        <p className="bk-sub">Mundial 2026 · 32 selecciones</p>
      </div>

      <div className="bk-scroll">
        <RoundCol ids={R32_IDS} matchMap={matchMap} standings={standings}
          label="Dieciseisavos" slotH={slotPerRound[0]} />
        <Connector leftN={16} rightN={8} />

        <RoundCol ids={R16_IDS} matchMap={matchMap} standings={standings}
          label="Octavos" slotH={slotPerRound[1]} />
        <Connector leftN={8} rightN={4} />

        <RoundCol ids={QF_IDS} matchMap={matchMap} standings={standings}
          label="Cuartos" slotH={slotPerRound[2]} />
        <Connector leftN={4} rightN={2} />

        <RoundCol ids={SF_IDS} matchMap={matchMap} standings={standings}
          label="Semis" slotH={slotPerRound[3]} />
        <Connector leftN={2} rightN={1} />

        <div className="bk-round bk-round--final" style={{ width: COL_W }}>
          <div className="bk-round-label" style={{ height: LABEL_H }}>Final</div>
          <div className="bk-slots">
            <div className="bk-slot" style={{ height: TOTAL_H }}>
              <MatchCard match={matchMap[FINAL_ID]} standings={standings} />
            </div>
          </div>
        </div>
      </div>

      <div className="bk-third">
        <div className="bk-third-label">Tercer puesto</div>
        <MatchCard match={matchMap[THIRD_ID]} standings={standings} />
      </div>
    </div>
  )
}
