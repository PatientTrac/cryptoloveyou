#!/usr/bin/env node
/**
 * One-shot: which URLs used by homepage update fail from this machine.
 * Usage: node scripts/diagnose-fetch-endpoints.mjs
 */
import 'dotenv/config'

const timeoutMs = Math.max(5000, parseInt(process.env.DIAGNOSE_FETCH_TIMEOUT_MS || '20000', 10) || 20000)
const signal = () => AbortSignal.timeout(timeoutMs)

function fmtErr(err) {
  const c = err?.cause
  return {
    name: err?.name,
    message: err?.message,
    causeCode: c?.code,
    causeMessage: c?.message,
    errno: err?.errno,
    syscall: err?.syscall,
    hostname: c?.hostname || err?.hostname
  }
}

async function probe(label, url, init = {}) {
  const started = Date.now()
  try {
    const res = await fetch(url, { ...init, signal: signal() })
    const text = await res.text()
    const ms = Date.now() - started
    const preview = text.length > 120 ? `${text.slice(0, 120)}…` : text
    return { label, url, ok: true, status: res.status, ms, preview }
  } catch (err) {
    const ms = Date.now() - started
    return { label, url, ok: false, ms, error: fmtErr(err) }
  }
}

const key = String(process.env.COINGECKO_API_KEY || '').trim()
const usePro = String(process.env.COINGECKO_USE_PRO || '').toLowerCase() === 'true'

const rows = []

rows.push(
  await probe('EUR/USD (exchangerate-api)', 'https://api.exchangerate-api.com/v4/latest/USD', {
    headers: { Accept: 'application/json' }
  })
)

rows.push(
  await probe(
    'CoinGecko Pro /ping (with x-cg-pro-api-key)',
    'https://pro-api.coingecko.com/api/v3/ping',
    {
      headers: {
        Accept: 'application/json',
        ...(key ? { 'x-cg-pro-api-key': key } : {})
      }
    }
  )
)

rows.push(
  await probe(
    'CoinGecko Pro /coins/markets (1 row)',
    'https://pro-api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=1&page=1&sparkline=false',
    {
      headers: {
        Accept: 'application/json',
        ...(key ? { 'x-cg-pro-api-key': key } : {})
      }
    }
  )
)

rows.push(
  await probe(
    'CoinGecko Pro /search/trending',
    'https://pro-api.coingecko.com/api/v3/search/trending',
    {
      headers: {
        Accept: 'application/json',
        ...(key ? { 'x-cg-pro-api-key': key } : {})
      }
    }
  )
)

rows.push(
  await probe(
    'CoinGecko public /coins/markets (no key, anon limits)',
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=1&page=1&sparkline=false',
    { headers: { Accept: 'application/json' } }
  )
)

// RSS samples (same as update-homepage-content.js)
const rssUrls = [
  ['Reuters business RSS', 'https://www.reuters.com/rssFeed/businessNews'],
  ['Yahoo finance headline RSS', 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US'],
  ['VentureBeat AI feed', 'https://venturebeat.com/category/ai/feed/']
]
for (const [label, url] of rssUrls) {
  rows.push(await probe(label, url, { headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' } }))
}

console.log(`Timeout per request: ${timeoutMs}ms`)
console.log(`COINGECKO_API_KEY set: ${Boolean(key)} | COINGECKO_USE_PRO: ${usePro}`)
console.log('')

for (const r of rows) {
  console.log('---')
  console.log(r.label)
  console.log('  URL:', r.url)
  console.log('  timeMs:', r.ms)
  if (r.ok) {
    console.log('  status:', r.status)
    console.log('  bodyPreview:', r.preview.replace(/\s+/g, ' ').trim())
  } else {
    console.log('  FAILED')
    console.log('  error:', JSON.stringify(r.error, null, 2))
  }
}

console.log('')
console.log('--- summary ---')
const netFailed = rows.filter(r => !r.ok)
const httpBad = rows.filter(r => r.ok && (r.status < 200 || r.status >= 300))
for (const r of netFailed) {
  console.log(`NETWORK FAIL: ${r.label} → ${r.error?.causeCode || r.error?.name}: ${r.error?.message}`)
}
for (const r of httpBad) {
  console.log(`HTTP ${r.status}: ${r.label}`)
}
if (!netFailed.length && !httpBad.length) console.log('All probes: HTTP 2xx within timeout.')
