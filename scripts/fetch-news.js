import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir   = join(__dirname, '..')

const FEED_URL = 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/category/deportes/'
const OUTPUT   = join(rootDir, 'public', 'data', 'news.json')
const MAX_ITEMS = 20
const TIMEOUT_MS = 8000

function extractImage(html) {
  if (!html) return null
  const m = html.match(/<img[^>]+src="([^"]+)"/i)
  return m ? m[1] : null
}

function cdata(str) {
  if (!str) return ''
  return str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim()
}

function parseItems(xml) {
  const rawItems = xml.match(/<item>[\s\S]*?<\/item>/g) || []
  return rawItems.map(item => {
    const title       = cdata(item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '')
    const link        = (item.match(/<link>([\s\S]*?)<\/link>/) || item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/))?.[1]?.trim() || ''
    const description = cdata(item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '')
    const pubDateStr  = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/))?.[1]?.trim() || ''
    const contentHtml = (item.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/))?.[1] || ''
    const imageUrl    = extractImage(cdata(contentHtml)) || extractImage(contentHtml)

    return {
      title:       title.slice(0, 200),
      description: description.replace(/<[^>]+>/g, '').slice(0, 300),
      link,
      publishedAt: pubDateStr ? new Date(pubDateStr).toISOString() : null,
      imageUrl:    imageUrl || null,
      source:      'La Nación Deportes',
    }
  }).filter(item => item.title && item.link)
}

async function run() {
  console.log('📰 Fetching news from La Nación Deportes…')

  let items = []
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    const res = await fetch(FEED_URL, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 WorldCup-App/1.0' },
    })
    clearTimeout(timer)

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const xml = await res.text()
    items = parseItems(xml).slice(0, MAX_ITEMS)
    console.log(`✅ ${items.length} noticias obtenidas`)
  } catch (err) {
    console.warn(`⚠️  Feed falló (${err.message}) — guardando array vacío`)
  }

  const output = {
    updatedAt: new Date().toISOString(),
    items,
  }

  mkdirSync(join(rootDir, 'public', 'data'), { recursive: true })
  writeFileSync(OUTPUT, JSON.stringify(output, null, 2))
  console.log(`💾 Guardado en ${OUTPUT}`)
}

run().catch(err => {
  console.error('❌ Error fatal:', err.message)
  process.exit(1)
})
