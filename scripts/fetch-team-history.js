/**
 * scripts/fetch-team-history.js
 *
 * One-time script: fetches last ~20 international matches for each of the 48
 * World Cup 2026 teams from API-Football, calculates goles/partido promedio
 * (used as xG proxy — free plan doesn't include xG), and saves:
 *   - public/data/team_history.json   → read by the frontend
 *   - prints SQL to create/upsert the Supabase `team_history` table
 *
 * Request budget:
 *   - Phase 1 (team search): 48 requests — cached in .team_id_cache.json
 *     so subsequent runs skip this phase
 *   - Phase 2 (fixtures season=2024): 48 requests
 *   - TOTAL: ~96 requests (free tier = 100/day)
 *
 * Usage:
 *   API_FOOTBALL_KEY=xxx node scripts/fetch-team-history.js
 *   # or add API_FOOTBALL_KEY=xxx to .env
 *
 * Required env: API_FOOTBALL_KEY
 * Optional env: SUPABASE_URL, SUPABASE_SERVICE_KEY (to upsert into Supabase)
 */

import fs   from 'fs'
import path from 'path'

// Load .env for local runs
try {
  const env = fs.readFileSync(path.resolve('.env'), 'utf8')
  for (const line of env.split('\n')) {
    const [k, ...v] = line.split('=')
    if (k && v.length) process.env[k.trim()] = v.join('=').trim()
  }
} catch {}

const API_KEY        = process.env.API_FOOTBALL_KEY
const API_BASE       = 'https://v3.football.api-sports.io'
const STANDINGS_PATH = path.resolve('public/data/standings.json')
const OUT_PATH       = path.resolve('public/data/team_history.json')
const CACHE_PATH     = path.resolve('.team_id_cache.json')

if (!API_KEY) {
  console.error(`
❌  API_FOOTBALL_KEY not set.

Add it to your .env file:
  API_FOOTBALL_KEY=your_key_here

And to GitHub Secrets (Settings → Secrets → Actions):
  API_FOOTBALL_KEY=your_key_here

This script runs manually once — it does NOT run in the cron workflow.
Get a free key at https://dashboard.api-football.com/
  `)
  process.exit(1)
}

const DELAY_MS   = 6500   // 10 req/min limit → 6.5s delay = ~9 req/min with margin
const PROGRESS_PATH = path.resolve('.team_history_progress.json')

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function wait(label) {
  process.stdout.write(`  ⏳ ${DELAY_MS / 1000}s...\n`)
  return sleep(DELAY_MS)
}

async function apiGet(endpoint, params = {}) {
  const url = new URL(`${API_BASE}${endpoint}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
  const r = await fetch(url.toString(), {
    headers: { 'x-apisports-key': API_KEY },
    signal: AbortSignal.timeout(15000),
  })
  const data = await r.json()
  const remaining = r.headers.get('x-ratelimit-requests-remaining')
  if (remaining !== null) process.stdout.write(` [quota:${remaining}]`)
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-Football: ${JSON.stringify(data.errors)}`)
  }
  return data.response ?? []
}

// ─── NAME NORMALISATION ───────────────────────────────────────
function norm(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const ALIAS = {
  'cabo verde':          'cape verde',
  'cape verde':          'cabo verde',
  'turkiye':             'turkey',
  'turkey':              'turkiye',
  'cote divoire':        'ivory coast',
  'ivory coast':         'cote divoire',
  'dr congo':            'democratic republic of congo',
  'bosnia herzegovina':  'bosnia and herzegovina',
  'usa':                 'united states',
  'united states':       'usa',
  'south korea':         'korea republic',
}

function nameCandidates(n) {
  const a = norm(n); const b = ALIAS[a]
  return b ? [a, b] : [a]
}

function nameMatches(apiName, bsdName) {
  const av = nameCandidates(apiName)
  const bv = nameCandidates(bsdName)
  return av.some(a => bv.some(b => a === b || a.includes(b) || b.includes(a)))
}

// ─── PHASE 1: FIND API-FOOTBALL TEAM IDS ─────────────────────
async function findApiId(bsdName) {
  const searchName = ALIAS[norm(bsdName)] ?? bsdName
  try {
    const teams = await apiGet('/teams', { search: searchName })
    const nationals = teams.filter(t =>
      t.team?.national === true &&
      !/\b(w|women|feminine|femenino)\b/i.test(t.team.name)
    )
    if (!nationals.length) return null
    // Prefer exact name match
    const exact = nationals.find(t => nameMatches(t.team.name, bsdName))
    return (exact ?? nationals[0]).team.id
  } catch (err) {
    console.warn(`  ⚠ Search error: ${err.message}`)
    return null
  }
}

// ─── PHASE 2: FETCH FIXTURES BY SEASON ───────────────────────
async function fetchFixturesBySeason(apiId, season) {
  try {
    return await apiGet('/fixtures', { team: apiId, season })
  } catch {
    return []
  }
}

function computeStats(fixtures, apiId) {
  const used = []
  for (const f of fixtures) {
    const isHome = f.teams?.home?.id === apiId
    const gFor     = isHome ? f.goals?.home : f.goals?.away
    const gAgainst = isHome ? f.goals?.away : f.goals?.home
    if (gFor == null || gAgainst == null) continue
    used.push({ gFor, gAgainst })
  }
  if (!used.length) return null
  const avg = arr => Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 100) / 100
  return {
    goals_for_avg:     avg(used.map(u => u.gFor)),
    goals_against_avg: avg(used.map(u => u.gAgainst)),
    matches_used:      used.length,
  }
}

// ─── MAIN ─────────────────────────────────────────────────────
async function main() {
  const std = JSON.parse(fs.readFileSync(STANDINGS_PATH, 'utf8'))
  const bsdTeams = []
  for (const rows of Object.values(std.groups)) {
    for (const row of rows) bsdTeams.push({ id: row.team_id, name: row.team_name })
  }
  console.log(`📋 ${bsdTeams.length} teams to process\n`)
  console.log('⚠️  Free plan budget: ~96 req needed (48 search + 48 fixture fetch)\n')

  // Load ID cache — may be partial if Phase 1 was interrupted previously
  let idCache = {}
  if (fs.existsSync(CACHE_PATH)) {
    idCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'))
  }

  // Only search teams not yet in cache (null = searched but not found; undefined = not searched yet)
  const needsSearch = bsdTeams.filter(t => !(t.id in idCache))

  if (needsSearch.length === 0) {
    const hits = Object.values(idCache).filter(Boolean).length
    console.log(`📦 Phase 1 completa: ${hits}/${bsdTeams.length} IDs encontrados — saltando\n`)
  } else {
    const already = Object.keys(idCache).length
    console.log(`🔍 Phase 1: ${needsSearch.length} equipos pendientes (${already} ya cacheados)…`)
    for (const team of needsSearch) {
      const idx = bsdTeams.findIndex(t => t.id === team.id) + 1
      process.stdout.write(`  [${idx}/${bsdTeams.length}] ${team.name}`)
      const apiId = await findApiId(team.name)
      if (apiId) {
        idCache[team.id] = apiId
        process.stdout.write(` → ${apiId}\n`)
      } else {
        idCache[team.id] = null  // mark as searched+not-found to avoid re-searching on resume
        process.stdout.write(' → ✗ not found\n')
      }
      // Save after every single team — survives Ctrl+C
      fs.writeFileSync(CACHE_PATH, JSON.stringify(idCache, null, 2))
      await wait()
    }
    const hits = Object.values(idCache).filter(Boolean).length
    console.log(`\n💾 Phase 1 lista: ${hits}/${bsdTeams.length} IDs encontrados\n`)
  }

  // Phase 2: fetch fixtures — with resume support
  const SEASONS = [2024, 2023, 2022]

  // Load progress (allows Ctrl+C and resume)
  let progress = {}
  if (fs.existsSync(PROGRESS_PATH)) {
    progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'))
    console.log(`🔄 Retomando: ${Object.keys(progress).length} equipos ya procesados\n`)
  }

  console.log(`📊 Phase 2: Fixtures (seasons: ${SEASONS.join(', ')}) — ${DELAY_MS / 1000}s entre requests\n`)

  let done = 0

  for (let i = 0; i < bsdTeams.length; i++) {
    const bsdTeam = bsdTeams[i]
    const tag = `[${i + 1}/${bsdTeams.length}] ${bsdTeam.name}`

    // Skip already processed teams
    if (progress[bsdTeam.id]) {
      const p = progress[bsdTeam.id]
      console.log(`  ⏭  ${tag}: ya procesado (${p.goals_for_avg} GF/p · ${p.goals_against_avg} GA/p · n=${p.matches_used})`)
      done++
      continue
    }

    const apiId = idCache[bsdTeam.id]
    if (!apiId) {
      console.log(`  ✗  ${tag}: sin ID API-Football`)
      continue
    }

    let combinedFixtures = []
    for (const season of SEASONS) {
      process.stdout.write(`  ${tag} (s${season})`)
      const fixtures = await fetchFixturesBySeason(apiId, season)
      combinedFixtures = combinedFixtures.concat(fixtures)
      process.stdout.write(` → ${fixtures.length} partidos\n`)
      await wait()
      if (combinedFixtures.length >= 15) break
    }

    const stats = computeStats(combinedFixtures, apiId)
    if (!stats) {
      console.log(`  ✗  ${tag}: sin datos de fixture`)
      continue
    }

    const record = {
      team_id:           bsdTeam.id,
      team_name:         bsdTeam.name,
      api_football_id:   apiId,
      xg_for_avg:        stats.goals_for_avg,
      xg_against_avg:    stats.goals_against_avg,
      goals_for_avg:     stats.goals_for_avg,
      goals_against_avg: stats.goals_against_avg,
      matches_used:      stats.matches_used,
    }

    // Save to progress immediately (survives Ctrl+C)
    progress[bsdTeam.id] = record
    fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2))

    console.log(`  ✓  ${tag}: ${stats.goals_for_avg} GF/p · ${stats.goals_against_avg} GA/p · n=${stats.matches_used}`)
    done++
  }

  // Build final output from progress
  const teams = {}
  for (const bsdTeam of bsdTeams) {
    if (progress[bsdTeam.id]) teams[bsdTeam.id] = progress[bsdTeam.id]
  }

  const output = {
    updated_at: new Date().toISOString(),
    data_type:  'goals',
    note:       'Goles promedio históricos (proxy de xG). Plan free de API-Football no incluye xG.',
    seasons_used: SEASONS,
    teams,
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2))
  console.log(`\n✅ ${done}/${bsdTeams.length} equipos → public/data/team_history.json`)

  if (done < bsdTeams.length) {
    console.log(`\n💡 Para retomar: volvé a correr el script. El progreso se guardó en .team_history_progress.json`)
  } else {
    // Clean up progress file when fully done
    if (fs.existsSync(PROGRESS_PATH)) fs.unlinkSync(PROGRESS_PATH)
    console.log('🧹 Progreso limpiado (.team_history_progress.json eliminado)')
  }

  // ─── SUPABASE SQL ──────────────────────────────────────────
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊  SQL para Supabase (ejecutar en SQL Editor una sola vez):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS team_history (
  team_id           INTEGER PRIMARY KEY,
  team_name         TEXT    NOT NULL,
  api_football_id   INTEGER,
  xg_for_avg        FLOAT,
  xg_against_avg    FLOAT,
  goals_for_avg     FLOAT,
  goals_against_avg FLOAT,
  matches_used      INTEGER,
  fetched_at        TIMESTAMPTZ DEFAULT NOW()
);

${Object.values(teams).length ? `-- Upsert data:
INSERT INTO team_history (team_id, team_name, api_football_id, xg_for_avg, xg_against_avg, goals_for_avg, goals_against_avg, matches_used)
VALUES
${Object.values(teams).map(t =>
  `  (${t.team_id}, '${t.team_name.replace(/'/g, "''")}', ${t.api_football_id}, ${t.xg_for_avg}, ${t.xg_against_avg}, ${t.goals_for_avg}, ${t.goals_against_avg}, ${t.matches_used})`
).join(',\n')}
ON CONFLICT (team_id) DO UPDATE SET
  xg_for_avg = EXCLUDED.xg_for_avg,
  xg_against_avg = EXCLUDED.xg_against_avg,
  goals_for_avg = EXCLUDED.goals_for_avg,
  goals_against_avg = EXCLUDED.goals_against_avg,
  matches_used = EXCLUDED.matches_used,
  fetched_at = NOW();` : '-- No data to insert yet.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message)
  process.exit(1)
})
