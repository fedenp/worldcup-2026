/**
 * scripts/fetch-odds.js
 * Fetches World Cup 1X2 odds from the-odds-api.com, maps them to BSD event IDs,
 * averages across all available bookmakers, and saves public/data/odds.json.
 *
 * Required env: ODDS_API_KEY
 */

import fs   from 'fs'
import path from 'path'

const ODDS_KEY     = process.env.ODDS_API_KEY
const SPORT        = 'soccer_fifa_world_cup'
const ODDS_URL     = `https://api.the-odds-api.com/v4/sports/${SPORT}/odds/?apiKey=${ODDS_KEY}&regions=eu&markets=h2h&oddsFormat=decimal`
const MATCHES_PATH = path.resolve('public/data/matches.json')
const OUT_PATH     = path.resolve('public/data/odds.json')

// ─── NAME NORMALISATION ───────────────────────────────────────
function normalize(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9 ]/g, '')                       // strip punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

// Bidirectional aliases: odds-api name <-> BSD name (both normalized)
const ALIAS_MAP = {
  'ivory coast':           'cote divoire',
  'cote divoire':          'ivory coast',
  'usa':                   'united states',
  'united states':         'usa',
  'south korea':           'korea republic',
  'korea republic':        'south korea',
  'bosnia and herzegovina':'bosnia herzegovina',
  'bosnia herzegovina':    'bosnia and herzegovina',
  'dr congo':              'congo dr',
  'congo dr':              'dr congo',
  'democratic republic of congo': 'congo dr',
  'cape verde islands':    'cape verde',
  'cape verde':            'cape verde islands',
  'trinidad and tobago':   'trinidad tobago',
  'trinidad tobago':       'trinidad and tobago',
  'north korea':           'korea dpr',
  'korea dpr':             'north korea',
  'czech republic':        'czechia',
  'czechia':               'czech republic',
  'republic of ireland':   'ireland',
  'iran':                  'iran ir',
  'iran ir':               'iran',
}

function normVariants(name) {
  const n = normalize(name)
  const alt = ALIAS_MAP[n]
  return alt ? [n, alt] : [n]
}

function namesMatch(oddsName, bsdName) {
  const ov = normVariants(oddsName)
  const bv = normVariants(bsdName)
  // Check all variant combinations for any overlap
  return ov.some(o => bv.some(b => o === b || o.includes(b) || b.includes(o)))
}

// ─── MATCH BSD EVENT ─────────────────────────────────────────
function findBsdMatch(oddsEvent, bsdMatches) {
  const oddsTime = new Date(oddsEvent.commence_time).getTime()

  for (const m of bsdMatches) {
    // Skip knockout TBD placeholders (W101, L102 etc.)
    if (!m.home_team || /^[WL]\d+$/.test(m.home_team)) continue

    const bsdTime = new Date(m.kickoff_at).getTime()
    if (Math.abs(oddsTime - bsdTime) > 24 * 60 * 60 * 1000) continue // >24h apart

    if (
      namesMatch(oddsEvent.home_team, m.home_team) &&
      namesMatch(oddsEvent.away_team, m.away_team)
    ) return m

    // Also try reversed (some APIs flip home/away for neutral venues)
    if (
      namesMatch(oddsEvent.home_team, m.away_team) &&
      namesMatch(oddsEvent.away_team, m.home_team)
    ) return m
  }
  return null
}

// ─── AVERAGE ODDS ACROSS BOOKMAKERS ──────────────────────────
function computeAvgOdds(bookmakers, oddsHomeTeam, oddsAwayTeam) {
  const homeArr = [], drawArr = [], awayArr = []

  for (const bm of bookmakers) {
    const h2h = bm.markets?.find(m => m.key === 'h2h')
    if (!h2h?.outcomes?.length) continue

    let bmHome = null, bmDraw = null, bmAway = null

    for (const o of h2h.outcomes) {
      const n = normalize(o.name)
      if (n === 'draw') {
        bmDraw = o.price
      } else if (namesMatch(o.name, oddsHomeTeam)) {
        bmHome = o.price
      } else if (namesMatch(o.name, oddsAwayTeam)) {
        bmAway = o.price
      }
    }

    if (bmHome && bmAway) {
      homeArr.push(bmHome)
      awayArr.push(bmAway)
      if (bmDraw) drawArr.push(bmDraw)
    }
  }

  if (!homeArr.length) return null

  const mean     = arr => arr.reduce((a, b) => a + b, 0) / arr.length
  const round2   = x   => Math.round(x * 100) / 100
  const implied  = o   => Math.round((1 / o) * 1000) / 10  // one decimal

  const avgHome = round2(mean(homeArr))
  const avgDraw = drawArr.length ? round2(mean(drawArr)) : null
  const avgAway = round2(mean(awayArr))

  return {
    avg_home:         avgHome,
    avg_draw:         avgDraw,
    avg_away:         avgAway,
    implied_home:     implied(avgHome),
    implied_draw:     avgDraw ? implied(avgDraw) : null,
    implied_away:     implied(avgAway),
    bookmakers_count: homeArr.length,
  }
}

// ─── MAIN ─────────────────────────────────────────────────────
async function main() {
  if (!ODDS_KEY) {
    console.error('❌ ODDS_API_KEY env variable not set')
    process.exit(1)
  }

  const bsdMatches = JSON.parse(fs.readFileSync(MATCHES_PATH, 'utf8'))
  console.log(`📋 Loaded ${bsdMatches.length} BSD matches`)

  console.log('🔍 Fetching odds from the-odds-api.com…')
  let oddsData

  try {
    const res = await fetch(ODDS_URL)
    const remaining = res.headers.get('x-requests-remaining')
    const used      = res.headers.get('x-requests-used')
    console.log(`   API quota: used=${used}  remaining=${remaining}`)

    if (!res.ok) {
      const body = await res.text()
      console.warn(`⚠️  Odds API ${res.status}: ${body}`)
      fs.writeFileSync(OUT_PATH, JSON.stringify({ updated_at: new Date().toISOString(), events: {} }, null, 2))
      console.log('   Saved empty odds.json — no data available yet.')
      return
    }

    oddsData = await res.json()
    console.log(`✅ Received ${oddsData.length} odds events`)
  } catch (err) {
    console.warn('⚠️  Network error:', err.message)
    fs.writeFileSync(OUT_PATH, JSON.stringify({ updated_at: new Date().toISOString(), events: {} }, null, 2))
    return
  }

  if (!Array.isArray(oddsData) || oddsData.length === 0) {
    console.log('⚠️  No odds available yet (too early before tournament)')
    fs.writeFileSync(OUT_PATH, JSON.stringify({ updated_at: new Date().toISOString(), events: {} }, null, 2))
    return
  }

  const events = {}
  let matched = 0, unmatched = 0

  for (const ev of oddsData) {
    const bsd = findBsdMatch(ev, bsdMatches)

    if (!bsd) {
      console.log(`  ⚠ No BSD match: ${ev.home_team} vs ${ev.away_team} (${ev.commence_time})`)
      unmatched++
      continue
    }

    const odds = computeAvgOdds(ev.bookmakers, ev.home_team, ev.away_team)
    if (!odds) {
      console.log(`  ⚠ No usable odds: ${bsd.home_team} vs ${bsd.away_team}`)
      continue
    }

    events[bsd.id] = {
      event_id: bsd.id,
      home_team: bsd.home_team,
      away_team: bsd.away_team,
      commence_time: ev.commence_time,
      ...odds,
    }

    console.log(`  ✓ ${bsd.home_team} vs ${bsd.away_team} → 1:${odds.avg_home}  X:${odds.avg_draw}  2:${odds.avg_away}  (${odds.bookmakers_count} books)`)
    matched++
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify({
    updated_at: new Date().toISOString(),
    events,
  }, null, 2))

  console.log(`\n✅ ${matched} matched, ${unmatched} unmatched → public/data/odds.json`)
}

main().catch(err => {
  console.error('❌ Unexpected error:', err)
  // Save empty file so the workflow doesn't fail due to missing file
  fs.writeFileSync(OUT_PATH, JSON.stringify({ updated_at: new Date().toISOString(), events: {} }, null, 2))
  process.exit(0)  // exit 0 so workflow continues
})
