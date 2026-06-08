import { useState, useEffect } from 'react'
import { flagUrl } from '../teamFlags.js'
import './Grupos.css'

function TeamCell({ name }) {
  const url = flagUrl(name)
  return (
    <div className="team-cell">
      {url
        ? <img src={url} alt={name} className="team-flag" />
        : <span className="team-flag-fallback">🏳️</span>}
      <span className="team-name">{name}</span>
    </div>
  )
}

function GdCell({ value }) {
  if (value > 0) return <span className="gd-pos">+{value}</span>
  if (value < 0) return <span className="gd-neg">{value}</span>
  return <span>{value}</span>
}

function GroupTable({ name, teams }) {
  return (
    <div className="group-card">
      <div className="group-header">{name}</div>
      <div className="group-table-wrap">
        <table className="group-table">
          <thead>
            <tr>
              <th className="th-pos">#</th>
              <th className="th-team">Equipo</th>
              <th>PJ</th>
              <th>G</th>
              <th>E</th>
              <th>P</th>
              <th>GF</th>
              <th>GC</th>
              <th>DG</th>
              <th className="th-pts">Pts</th>
              <th className="th-xg">xG</th>
            </tr>
          </thead>
          <tbody>
            {teams.map(team => (
              <tr key={team.team_id} className={team.position <= 2 ? 'qualified' : ''}>
                <td className="td-pos">{team.position}</td>
                <td className="td-team"><TeamCell name={team.team_name} /></td>
                <td>{team.played}</td>
                <td>{team.won}</td>
                <td>{team.drawn}</td>
                <td>{team.lost}</td>
                <td>{team.gf}</td>
                <td>{team.ga}</td>
                <td><GdCell value={team.gd} /></td>
                <td className="td-pts">{team.pts}</td>
                <td className="td-xg">{Number(team.xg).toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Grupos() {
  const [groups, setGroups] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/standings.json`)
      .then(r => {
        if (!r.ok) throw new Error('No se encontró standings.json')
        return r.json()
      })
      .then(data => { setGroups(data.groups); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <div className="grupos-state">Cargando grupos…</div>
  if (error) return (
    <div className="grupos-state error">
      <p>⚠️ {error}</p>
      <p className="hint">Ejecutá el script de fetch para generar standings.json</p>
    </div>
  )

  return (
    <div className="grupos">
      {Object.entries(groups).map(([name, teams]) => (
        <GroupTable key={name} name={name} teams={teams} />
      ))}
      <div className="grupos-legend">
        <span className="legend-bar qualified" />
        <span>Clasificados (Top 2)</span>
      </div>
    </div>
  )
}
