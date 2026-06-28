/**
 * scripts/fetch-squads.js
 *
 * Fetches all 1452 World Cup 2026 squad players from BSD /worldcup/squads/
 * (paginated 200 per page, ~8 pages) and saves to:
 *   public/data/squads.json  →  { by_team: { [team_id]: [player, ...] } }
 *
 * Run once (or re-run to pick up late call-ups / status changes).
 * No rate limit on BSD API → pages fetched in parallel.
 *
 * Usage: BSD_API_TOKEN=xxx node scripts/fetch-squads.js
 */

import fs   from 'fs'
import path from 'path'

try {
  const env = fs.readFileSync(path.resolve('.env'), 'utf8')
  for (const line of env.split('\n')) {
    const [k, ...v] = line.split('=')
    if (k?.trim() && v.length) process.env[k.trim()] = v.join('=').trim()
  }
} catch {}

const BSD_TOKEN = process.env.BSD_API_TOKEN
const BASE_URL  = 'https://sports.bzzoiro.com/api/v2'
const OUT_PATH  = path.resolve('public/data/squads.json')

if (!BSD_TOKEN) {
  console.error('❌ BSD_API_TOKEN not set')
  process.exit(1)
}

async function bsdGet(path) {
  const r = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Token ${BSD_TOKEN}` },
    signal: AbortSignal.timeout(15000),
  })
  const data = await r.json()
  if (data.error) throw new Error(`BSD ${data.status}: ${data.detail}`)
  return data
}

async function main() {
  // First page to get total count
  console.log('📥 Fetching squads...')
  const first = await bsdGet('/worldcup/squads/?limit=200&offset=0')
  const total     = first.count
  const totalPages = Math.ceil(total / 200)
  console.log(`   ${total} players · ${totalPages} pages`)

  // Remaining pages in parallel
  const remaining = Array.from({ length: totalPages - 1 }, (_, i) =>
    bsdGet(`/worldcup/squads/?limit=200&offset=${(i + 1) * 200}`)
  )
  const pages = [first, ...(await Promise.all(remaining))]
  const all   = pages.flatMap(p => p.results)
  console.log(`✓  ${all.length} players fetched`)

  // Organize by team_id; sort by position order then jersey number
  const POS_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 }
  const byTeam = {}
  for (const p of all) {
    const tid = String(p.team_id)
    if (!byTeam[tid]) byTeam[tid] = []
    byTeam[tid].push({
      player_id:     p.player_id,
      name:          p.name,
      position:      p.position,
      jersey_number: p.jersey_number,
      club:          p.club,
      club_country:  p.club_country,
      age:           p.age,
      caps:          p.caps,
      goals:         p.goals,
      date_of_birth: p.date_of_birth,
      status:        p.status,
    })
  }

  for (const players of Object.values(byTeam)) {
    players.sort((a, b) =>
      (POS_ORDER[a.position] ?? 9) - (POS_ORDER[b.position] ?? 9) ||
      (a.jersey_number ?? 99) - (b.jersey_number ?? 99)
    )
  }

  const output = {
    updated_at: new Date().toISOString(),
    count:      all.length,
    by_team:    byTeam,
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(output))
  console.log(`\n✅ ${all.length} players → public/data/squads.json`)
  console.log(`   ${Object.keys(byTeam).length} teams`)

  // Sample
  const sample = Object.values(byTeam)[0]
  console.log(`   Sample team (${Object.keys(byTeam)[0]}): ${sample?.length} players, first = ${sample?.[0]?.name}`)
}

main().catch(err => {
  console.error('❌ Fatal:', err.message)
  process.exit(1)
})
