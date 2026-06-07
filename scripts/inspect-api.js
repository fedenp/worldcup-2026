import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
function loadEnv() {
  try {
    const env = readFileSync(join(__dirname, '../.env'), 'utf8')
    for (const line of env.split('\n')) {
      const [key, ...rest] = line.split('=')
      if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
    }
  } catch {}
}
loadEnv()

const res = await fetch('https://sports.bzzoiro.com/api/v2/events/?league_id=27', {
  headers: { Authorization: `Token ${process.env.BSD_API_TOKEN}` }
})
const data = await res.json()

// Show top-level structure
console.log('=== TOP LEVEL KEYS ===')
if (Array.isArray(data)) {
  console.log('Response is an array, length:', data.length)
  console.log('\n=== FIRST ITEM KEYS ===')
  console.log(JSON.stringify(Object.keys(data[0]), null, 2))
  console.log('\n=== FIRST ITEM ===')
  console.log(JSON.stringify(data[0], null, 2))
} else {
  console.log(JSON.stringify(Object.keys(data), null, 2))
  const items = data.results ?? data.events ?? data.data ?? []
  console.log('Items count:', items.length)
  if (items.length) {
    console.log('\n=== FIRST ITEM KEYS ===')
    console.log(JSON.stringify(Object.keys(items[0]), null, 2))
    console.log('\n=== FIRST ITEM ===')
    console.log(JSON.stringify(items[0], null, 2))
  }
}
