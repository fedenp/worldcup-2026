import { writeFileSync, mkdirSync, readFileSync } from 'fs'
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
const BSD_BASE = 'https://sports.bzzoiro.com/api/v2'
const LEAGUE_ID = 27
const SEASON_ID = 188

if (!BSD_TOKEN) {
  console.error('❌ Falta BSD_API_TOKEN')
  process.exit(1)
}

async function main() {
  console.log('🔄 Fetching standings del Mundial 2026 desde BSD...')

  const url = `${BSD_BASE}/leagues/${LEAGUE_ID}/standings/?season_id=${SEASON_ID}`
  const res = await fetch(url, { headers: { Authorization: `Token ${BSD_TOKEN}` } })
  if (!res.ok) throw new Error(`BSD API error ${res.status} — ${url}`)
  const data = await res.json()

  if (!data.groups || typeof data.groups !== 'object') {
    console.error('❌ Respuesta inesperada:', JSON.stringify(data).slice(0, 200))
    process.exit(1)
  }

  const groups = {}
  for (const [groupName, teams] of Object.entries(data.groups)) {
    groups[groupName] = teams.map(t => ({
      position:  t.position,
      team_id:   t.team_id,
      team_name: t.team_name,
      played:    t.played,
      won:       t.won,
      drawn:     t.drawn,
      lost:      t.lost,
      gf:        t.gf,
      ga:        t.ga,
      gd:        t.gd,
      pts:       t.pts,
      xg:        t.xgf ?? 0,
      form:      t.form ?? '',
      live:      t.live ?? false,
    }))
  }

  const out = { updated_at: new Date().toISOString(), groups }

  const outDir = join(rootDir, 'public', 'data')
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'standings.json'), JSON.stringify(out, null, 2), 'utf8')
  console.log('✅ JSON generado: public/data/standings.json')

  const totalTeams = Object.values(groups).reduce((n, t) => n + t.length, 0)
  console.log(`ℹ️  ${Object.keys(groups).length} grupos, ${totalTeams} equipos`)
  console.log('🏁 Listo.')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
