import { writeFileSync, readFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

function loadEnv() {
  try {
    const env = readFileSync(join(rootDir, '.env'), 'utf8')
    for (const line of env.split('\n')) {
      const [key, ...rest] = line.split('=')
      if (key?.trim() && rest.length) process.env[key.trim()] = rest.join('=').trim()
    }
  } catch {}
}
loadEnv()

const BSD_TOKEN = process.env.BSD_API_TOKEN
const BSD_BASE  = 'https://sports.bzzoiro.com/api/v2'

if (!BSD_TOKEN) { console.error('❌ Falta BSD_API_TOKEN'); process.exit(1) }

async function bsdGet(path) {
  try {
    const r = await fetch(`${BSD_BASE}${path}`, {
      headers: { Authorization: `Token ${BSD_TOKEN}` },
    })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

async function main() {
  const matchesPath = join(rootDir, 'public', 'data', 'matches.json')
  const matches = JSON.parse(readFileSync(matchesPath, 'utf8'))
  console.log(`🔄 Generando pre-partido data para ${matches.length} partidos...`)

  const outDir = join(rootDir, 'public', 'data', 'match')
  mkdirSync(outDir, { recursive: true })

  // Pre-fetch all unique venues in parallel
  const venueIds = [...new Set(matches.map(m => m.venue_id).filter(Boolean))]
  const venueResults = await Promise.all(venueIds.map(id => bsdGet(`/venues/${id}/`)))
  const venueMap = {}
  venueIds.forEach((id, i) => {
    const v = venueResults[i]
    if (v) venueMap[id] = { name: v.name, city: v.city, capacity: v.capacity }
  })
  console.log(`  📍 ${Object.keys(venueMap).length} estadios cargados`)

  // Process matches in batches of 8 (event detail + prediction in parallel per match)
  const BATCH = 8
  let done = 0
  for (let i = 0; i < matches.length; i += BATCH) {
    const batch = matches.slice(i, i + BATCH)
    await Promise.all(batch.map(async match => {
      const [evt, pred] = await Promise.all([
        bsdGet(`/events/${match.id}/`),
        bsdGet(`/events/${match.id}/prediction/`),
      ])

      const out = {
        event_id: match.id,
        venue:    match.venue_id ? (venueMap[match.venue_id] ?? null) : null,
        weather:  evt?.weather ?? null,
        prediction: pred?.markets ? {
          prob_home:         pred.markets.match_result?.prob_home ?? null,
          prob_draw:         pred.markets.match_result?.prob_draw ?? null,
          prob_away:         pred.markets.match_result?.prob_away ?? null,
          predicted:         pred.markets.match_result?.predicted ?? null,
          xg_home:           pred.markets.expected_goals?.home ?? null,
          xg_away:           pred.markets.expected_goals?.away ?? null,
          most_likely_score: pred.markets.score?.most_likely ?? null,
          confidence:        pred.model?.confidence ?? null,
        } : null,
        head_to_head: evt?.head_to_head ?? null,
      }

      writeFileSync(join(outDir, `${match.id}.json`), JSON.stringify(out, null, 2), 'utf8')
      done++
    }))
    process.stdout.write(`\r  ⚡ ${done}/${matches.length} procesados...`)
  }
  console.log(`\n✅ ${done} archivos en public/data/match/`)
  console.log('🏁 Listo.')
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1) })
