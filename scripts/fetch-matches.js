import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

function loadEnv() {
  try {
    const env = readFileSync(join(rootDir, '.env'), 'utf8')
    for (const line of env.split('\n')) {
      const [key, ...rest] = line.split('=')
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
    }
  } catch {}
}
loadEnv()

const BSD_TOKEN = process.env.BSD_API_TOKEN
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

if (!BSD_TOKEN || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Faltan variables de entorno. Revisá el archivo .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const BSD_BASE = 'https://sports.bzzoiro.com/api/v2'
const LEAGUE_ID = 27
const SEASON_ID = 188

async function bsdGet(path) {
  const url = `${BSD_BASE}${path}`
  const res = await fetch(url, { headers: { Authorization: `Token ${BSD_TOKEN}` } })
  if (!res.ok) throw new Error(`BSD API error ${res.status} — ${url}`)
  return res.json()
}

async function fetchAllPages(path) {
  const first = await bsdGet(path)
  const results = Array.isArray(first) ? first : (first.results ?? [])
  if (!Array.isArray(first) && first.next) {
    let next = first.next
    while (next) {
      const page = await fetch(next, { headers: { Authorization: `Token ${BSD_TOKEN}` } }).then(r => r.json())
      results.push(...(page.results ?? []))
      next = page.next
    }
  }
  return results
}

// Build a map of team_id → { name, flag } from the squads endpoint
async function buildTeamMap() {
  console.log('🔄 Fetching squads para nombres y flags de equipos...')
  try {
    const data = await bsdGet('/worldcup/squads/')
    const map = {}
    const squads = Array.isArray(data) ? data : (data.results ?? data.teams ?? [])
    for (const team of squads) {
      map[team.id] = {
        name: team.name ?? team.team_name ?? null,
        flag: team.flag ?? team.image ?? team.logo ?? null,
      }
    }
    console.log(`✅ ${Object.keys(map).length} equipos cargados`)
    return map
  } catch (e) {
    console.warn('⚠️  No se pudo cargar squads:', e.message)
    return {}
  }
}

function normalizeStatus(status) {
  const map = {
    notstarted: 'NS',
    finished: 'FT',
    inprogress: 'LIVE',
    halftime: 'HT',
    postponed: 'PST',
    cancelled: 'CAN',
  }
  return map[status?.toLowerCase()] ?? status ?? 'NS'
}

function parseMatch(event, teamMap) {
  const homeInfo = teamMap[event.home_team_id] ?? {}
  const awayInfo = teamMap[event.away_team_id] ?? {}

  // home_team/away_team are strings from the API (name or placeholder like "W101")
  const homeName = homeInfo.name ?? (typeof event.home_team === 'string' ? event.home_team : null)
  const awayName = awayInfo.name ?? (typeof event.away_team === 'string' ? event.away_team : null)

  return {
    id: event.id,
    home_team: homeName,
    away_team: awayName,
    home_team_id: event.home_team_id ?? null,
    away_team_id: event.away_team_id ?? null,
    home_flag: homeInfo.flag ?? null,
    away_flag: awayInfo.flag ?? null,
    home_score: event.home_score ?? null,
    away_score: event.away_score ?? null,
    status: normalizeStatus(event.status),
    kickoff_at: event.event_date ?? null,
    venue_id: event.venue_id ?? null,
    group: event.group_name ?? null,
    round: event.round_name ?? null,
    round_number: event.round_number ?? null,
    league_id: LEAGUE_ID,
  }
}

async function main() {
  console.log('🔄 Fetching partidos del Mundial 2026 desde BSD...')

  let events, teamMap
  try {
    ;[events, teamMap] = await Promise.all([
      fetchAllPages(`/events/?league_id=${LEAGUE_ID}&season_id=${SEASON_ID}`),
      buildTeamMap(),
    ])
  } catch (e) {
    console.error('❌ Error llamando a BSD API:', e.message)
    process.exit(1)
  }

  console.log(`✅ ${events.length} partidos recibidos`)

  if (!events.length) {
    console.warn('⚠️  No se recibieron partidos.')
    process.exit(0)
  }

  const matches = events.map(e => parseMatch(e, teamMap))

  // Upsert en Supabase
  const { error } = await supabase.from('matches').upsert(matches, { onConflict: 'id' })
  if (error) {
    console.warn('⚠️  Supabase upsert error:', error.message)
    console.log('ℹ️  Generando JSON igualmente...')
  } else {
    console.log(`✅ ${matches.length} partidos guardados en Supabase`)
  }

  // Generar JSON estático
  const outDir = join(rootDir, 'public', 'data')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'matches.json'), JSON.stringify(matches, null, 2), 'utf8')
  console.log('✅ JSON generado: public/data/matches.json')

  // Resumen
  const withTeams = matches.filter(m => m.home_team && !m.home_team.startsWith('W')).length
  console.log(`ℹ️  Partidos con equipos definidos: ${withTeams}/${matches.length}`)
  console.log('🏁 Listo.')
}

main()
