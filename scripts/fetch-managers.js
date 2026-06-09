/**
 * scripts/fetch-managers.js
 * Fetches manager/coach data for all 48 World Cup teams from BSD API.
 * Saves public/data/managers.json keyed by team_id.
 *
 * Required env: BSD_API_TOKEN
 */

import fs   from 'fs'
import path from 'path'

const TOKEN          = process.env.BSD_API_TOKEN
const BASE_URL       = 'https://sports.bzzoiro.com/api/v2'
const STANDINGS_PATH = path.resolve('public/data/standings.json')
const OUT_PATH       = path.resolve('public/data/managers.json')

async function fetchManager(teamId) {
  const url = `${BASE_URL}/managers/?team_id=${teamId}`
  const res = await fetch(url, {
    headers: { Authorization: `Token ${TOKEN}` },
  })
  if (!res.ok) {
    console.warn(`  ⚠ team ${teamId}: HTTP ${res.status}`)
    return null
  }
  const data = await res.json()
  return data.results?.[0] ?? null
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  if (!TOKEN) {
    console.error('❌ BSD_API_TOKEN env variable not set')
    process.exit(1)
  }

  const std = JSON.parse(fs.readFileSync(STANDINGS_PATH, 'utf8'))
  const teams = []
  for (const rows of Object.values(std.groups)) {
    for (const row of rows) {
      teams.push({ id: row.team_id, name: row.team_name })
    }
  }
  console.log(`📋 Fetching managers for ${teams.length} teams…`)

  const managers = {}
  let fetched = 0, missing = 0

  for (const team of teams) {
    try {
      const mgr = await fetchManager(team.id)
      if (mgr) {
        managers[team.id] = mgr
        console.log(`  ✓ ${team.name}: ${mgr.name} (${mgr.preferred_formation ?? '?'}, ${mgr.tactical_profile ?? '?'})`)
        fetched++
      } else {
        console.log(`  - ${team.name}: no data`)
        missing++
      }
    } catch (err) {
      console.warn(`  ⚠ ${team.name}: ${err.message}`)
      missing++
    }
    // Small delay — polite to the API
    await sleep(150)
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify({
    updated_at: new Date().toISOString(),
    managers,
  }, null, 2))

  console.log(`\n✅ ${fetched} fetched, ${missing} missing → public/data/managers.json`)
}

main().catch(err => {
  console.error('❌ Fatal:', err)
  // Write empty file so workflow doesn't fail on missing artefact
  fs.writeFileSync(OUT_PATH, JSON.stringify({
    updated_at: new Date().toISOString(),
    managers: {},
  }, null, 2))
  process.exit(0)
})
