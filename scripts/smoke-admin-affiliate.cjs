#!/usr/bin/env node
/**
 * Smoke test: admin affiliate API (requires netlify dev or deployed site).
 *
 * Usage:
 *   ADMIN_API_KEY=your_key SMOKE_BASE_URL=http://localhost:8888 node scripts/smoke-admin-affiliate.cjs
 *
 * Requires: migrations 004 + 005 applied in Supabase; SUPABASE_* set for functions; ADMIN_API_KEY in Netlify/.env
 */

require('dotenv').config()

const base = (process.env.SMOKE_BASE_URL || 'http://localhost:8888').replace(/\/$/, '')
const key = process.env.ADMIN_API_KEY

async function main() {
  if (!key || key.length < 16) {
    console.error('Set ADMIN_API_KEY (min 16 chars) in .env or environment.')
    process.exit(1)
  }

  const headers = { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }

  const helpUrl = `${base}/api/admin-affiliate?resource=help`
  console.log('GET', helpUrl)
  const h = await fetch(helpUrl, { headers })
  const hj = await h.json().catch(() => ({}))
  if (!h.ok) {
    console.error('Help failed:', h.status, hj)
    process.exit(1)
  }
  console.log('OK help:', hj.endpoints ? 'endpoints listed' : hj)

  const aggUrl = `${base}/api/admin-affiliate?resource=aggregates&groupBy=platform`
  console.log('GET', aggUrl)
  const a = await fetch(aggUrl, { headers })
  const aj = await a.json().catch(() => ({}))
  if (!a.ok) {
    console.error('Aggregates failed:', a.status, aj)
    process.exit(1)
  }
  console.log('OK aggregates: totalClicks=', aj.totalClicks, 'truncated=', aj.truncated)

  const clicksUrl = `${base}/api/admin-affiliate?resource=clicks&limit=5`
  console.log('GET', clicksUrl)
  const c = await fetch(clicksUrl, { headers })
  const cj = await c.json().catch(() => ({}))
  if (!c.ok) {
    console.error('Clicks failed:', c.status, cj)
    process.exit(1)
  }
  console.log('OK clicks:', cj.count, 'rows')

  const partnersUrl = `${base}/api/admin-affiliate?resource=partners`
  console.log('GET', partnersUrl)
  const p = await fetch(partnersUrl, { headers })
  const pj = await p.json().catch(() => ({}))
  if (!p.ok) {
    console.error('Partners failed:', p.status, pj)
    console.error('If table missing, run supabase/migrations/005_affiliate_partners.sql')
    process.exit(1)
  }
  console.log('OK partners:', (pj.partners || []).length, 'rows')

  console.log('\nSmoke passed. Open', base + '/admin/', 'in a browser (paste ADMIN_API_KEY).')
  console.log('Optional: visit', base + '/aff/binance', 'to test redirect + click row (needs Supabase for inserts).')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
