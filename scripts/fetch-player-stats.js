/**
 * scripts/fetch-player-stats.js
 *
 * Agrega stats de jugadores a partir de:
 *   - GET /api/v2/events/{id}/player-stats/  → para cada partido terminado
 *   - GET /api/v2/worldcup/squads/            → nombres y posiciones
 *
 * Cache incremental en .player-stats-cache.json:
 *   { [matchId]: [playerStat, ...] }
 * Solo fetcha los partidos nuevos, re-agrega todo desde el cache.
 *
 * Output: public/data/player-stats.json
 *
 * Usage: BSD_API_TOKEN=xxx node scripts/fetch-player-stats.js
 * Cron: runs as part of sync-data.yml every 4h
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

const BSD_TOKEN    = process.env.BSD_API_TOKEN
const BASE_URL     = 'https://sports.bzzoiro.com/api/v2'
const MATCHES_PATH = path.resolve('public/data/matches.json')
const STD_PATH     = path.resolve('public/data/standings.json')
const CACHE_PATH   = path.resolve('.player-stats-cache.json')
const OUT_PATH     = path.resolve('public/data/player-stats.json')

if (!BSD_TOKEN) {
  console.error('❌ BSD_API_TOKEN not set')
  process.exit(1)
}

async function bsdGet(endpoint) {
  const r = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Token ${BSD_TOKEN}` },
    signal: AbortSignal.timeout(15000),
  })
  const data = await r.json()
  if (data.error) throw new Error(`BSD ${data.status}: ${data.detail}`)
  return data
}

// Squads: paginated 200 per page, ~8 pages for 1452 players
async function fetchAllSquads() {
  const all = []
  let offset = 0
  while (true) {
    process.stdout.write(`  squads offset=${offset}...`)
    const data = await bsdGet(`/worldcup/squads/?limit=200&offset=${offset}`)
    all.push(...data.results)
    process.stdout.write(` ${data.results.length} players\n`)
    if (!data.next) break
    offset += 200
  }
  return all
}

async function fetchMatchStats(matchId) {
  try {
    const data = await bsdGet(`/events/${matchId}/player-stats/`)
    return data.player_stats ?? []
  } catch {
    return []
  }
}

function initAccum(info) {
  return {
    player_id:      info?.player_id ?? 0,
    name:           info?.name ?? 'Unknown',
    position:       info?.position ?? 'MF',
    team_id:        info?.team_id ?? 0,
    club:           info?.club ?? '',
    matches:        0,
    minutes_played: 0,
    goals:          0,
    assists:        0,
    yellow_cards:   0,
    red_cards:      0,
    shots:          0,
    shots_on_target: 0,
    key_passes:     0,
    xg:             0,
    xa:             0,
    saves:          0,
    goals_conceded: 0,
    clean_sheets:   0,
    rating_sum:     0,
    rating_count:   0,
  }
}

function mergeStats(p, stat) {
  if (!stat.minutes_played) return
  p.matches        += 1
  p.minutes_played += stat.minutes_played
  p.goals          += stat.goals         ?? 0
  p.assists        += stat.goal_assist   ?? 0
  p.yellow_cards   += stat.yellow_card   ?? 0
  p.red_cards      += stat.red_card      ?? 0
  p.shots          += stat.total_shots   ?? 0
  p.shots_on_target += stat.shots_on_target ?? 0
  p.key_passes     += stat.key_pass      ?? 0
  p.xg             += stat.expected_goals   ?? 0
  p.xa             += stat.expected_assists ?? 0
  p.saves          += stat.saves         ?? 0
  p.goals_conceded += stat.goals_conceded ?? 0
  if (p.position === 'GK' && (stat.goals_conceded ?? 0) === 0) p.clean_sheets += 1
  if (stat.rating) { p.rating_sum += stat.rating; p.rating_count += 1 }
}

async function main() {
  // Matches: FT only
  const matches  = JSON.parse(fs.readFileSync(MATCHES_PATH, 'utf8'))
  const ftMatches = matches.filter(m => ['FT','AET','PEN'].includes(m.status))
  console.log(`📋 ${ftMatches.length} partidos terminados`)

  // Team name lookup from standings
  const standings = JSON.parse(fs.readFileSync(STD_PATH, 'utf8'))
  const teamNames = {}
  for (const rows of Object.values(standings.groups))
    for (const t of rows) teamNames[t.team_id] = t.team_name

  // Squads → playerLookup keyed by player_id
  console.log('\n📥 Squads:')
  const squads = await fetchAllSquads()
  const playerLookup = {}
  for (const p of squads) {
    if (p.player_id != null) playerLookup[p.player_id] = p
  }
  console.log(`👥 ${squads.length} jugadores, ${Object.keys(playerLookup).length} con player_id`)

  // Load cache (incremental: only fetch new matches)
  let cache = {}
  if (fs.existsSync(CACHE_PATH)) {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
    console.log(`\n📦 Cache existente: ${Object.keys(cache).length} partidos`)
  }

  // Fetch new FT matches
  const newMatches = ftMatches.filter(m => !(m.id in cache))
  if (newMatches.length === 0) {
    console.log('✅ Cache al día — sin partidos nuevos\n')
  } else {
    console.log(`\n🔄 Fetching stats para ${newMatches.length} partidos nuevos...`)
    const BATCH = 10
    for (let i = 0; i < newMatches.length; i += BATCH) {
      const batch  = newMatches.slice(i, i + BATCH)
      const results = await Promise.all(batch.map(m => fetchMatchStats(m.id)))
      for (let j = 0; j < batch.length; j++) {
        cache[batch[j].id] = results[j]
        console.log(`  [${i+j+1}/${newMatches.length}] match ${batch[j].id}: ${results[j].length} players`)
      }
    }
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache))
    console.log(`💾 Cache guardado (${Object.keys(cache).length} partidos)\n`)
  }

  // Aggregate all cached match stats
  const accum = {}
  for (const stats of Object.values(cache)) {
    for (const stat of stats) {
      const pid  = stat.player_id
      const info = playerLookup[pid]
      if (!accum[pid]) accum[pid] = initAccum(info ?? { player_id: pid })
      mergeStats(accum[pid], stat)
    }
  }

  // Finalize
  const players = Object.values(accum)
    .filter(p => p.matches > 0)
    .map(({ rating_sum, rating_count, ...p }) => ({
      ...p,
      team_name:  teamNames[p.team_id] ?? '',
      rating_avg: rating_count > 0
        ? Math.round((rating_sum / rating_count) * 10) / 10
        : null,
      xg: Math.round(p.xg * 100) / 100,
      xa: Math.round(p.xa * 100) / 100,
    }))
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)

  const output = {
    updated_at:        new Date().toISOString(),
    matches_processed: Object.keys(cache).length,
    players,
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(output))

  // Summary
  const scorers = players.filter(p => p.goals > 0)
    .sort((a,b) => b.goals - a.goals).slice(0, 5)
  const gks = players.filter(p => p.position === 'GK')
    .sort((a,b) => b.clean_sheets - a.clean_sheets || a.goals_conceded - b.goals_conceded)
    .slice(0, 5)

  console.log(`✅ ${players.length} jugadores → public/data/player-stats.json`)
  console.log(`   (${Object.keys(cache).length} partidos procesados)\n`)
  if (scorers.length) {
    console.log('⚽ Top goleadores:')
    scorers.forEach((p,i) => console.log(`   ${i+1}. ${p.name} (${p.team_name}): ${p.goals}G ${p.assists}A`))
  }
  if (gks.length) {
    console.log('\n🧤 Top porteros (vallas):')
    gks.forEach((p,i) => console.log(`   ${i+1}. ${p.name} (${p.team_name}): ${p.clean_sheets} vallas / ${p.goals_conceded} GC`))
  }
}

main().catch(err => {
  console.error('\n❌ Fatal:', err.message)
  process.exit(1)
})
