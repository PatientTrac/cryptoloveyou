/**
 * CoinGecko-only market data for homepage ticker, trending context, and scheduled SEO.
 * Public API works without a key (tight limits). Optional COINGECKO_API_KEY + COINGECKO_USE_PRO.
 */

export function coingeckoClient() {
  const pro = String(process.env.COINGECKO_USE_PRO || '').toLowerCase() === 'true'
  const key = String(process.env.COINGECKO_API_KEY || '').trim()
  const headers = { Accept: 'application/json' }
  if (key) {
    if (pro) {
      headers['x-cg-pro-api-key'] = key
      return { baseUrl: 'https://pro-api.coingecko.com/api/v3', headers }
    }
    headers['x-cg-demo-api-key'] = key
  }
  return { baseUrl: 'https://api.coingecko.com/api/v3', headers }
}

function isRetryableNetworkError(err) {
  const code = err?.cause?.code || err?.code
  if (
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    code === 'UND_ERR_HEADERS_TIMEOUT' ||
    code === 'UND_ERR_BODY_TIMEOUT'
  ) {
    return true
  }
  if (code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return true
  }
  if (code === 'ECONNREFUSED') return true
  if (err?.name === 'TypeError' && /fetch failed/i.test(String(err?.message || ''))) return true
  return false
}

function anonFallbackEnabled() {
  return String(process.env.COINGECKO_ANON_FALLBACK || '').toLowerCase() === 'true'
}

function maxFetchAttempts() {
  const n = parseInt(process.env.COINGECKO_FETCH_MAX_ATTEMPTS || '4', 10)
  return Math.min(8, Math.max(2, Number.isFinite(n) ? n : 4))
}

/**
 * Fetch JSON from CoinGecko with 429 + network retries. Optional anon fallback when Pro host is unreachable.
 */
async function coingeckoJson(path, params = {}) {
  const client = coingeckoClient()
  const qs = new URLSearchParams(params)
  const pathWithQuery = qs.toString() ? `${path}?${qs}` : path
  const maxAttempts = maxFetchAttempts()

  async function requestJson(baseUrl, headers, tag) {
    const url = `${baseUrl}${pathWithQuery}`
    let lastHttpErr = null
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let res
      try {
        res = await fetch(url, { headers })
      } catch (e) {
        if (isRetryableNetworkError(e) && attempt < maxAttempts) {
          const waitMs = 2000 * attempt
          console.warn(
            `CoinGecko network ${tag} ${path}: ${e.cause?.code || e.message}, retry in ${waitMs / 1000}s (${attempt}/${maxAttempts})`
          )
          await new Promise(r => setTimeout(r, waitMs))
          continue
        }
        throw e
      }

      if (res.ok) return res.json()
      if (res.status === 429 && attempt < maxAttempts) {
        const waitMs = 2000 * attempt
        console.warn(`CoinGecko 429 ${tag} ${path}, retry in ${waitMs / 1000}s (${attempt}/${maxAttempts})`)
        await new Promise(r => setTimeout(r, waitMs))
        continue
      }
      const t = await res.text().catch(() => '')
      lastHttpErr = new Error(`CoinGecko ${tag} ${path} ${res.status}: ${(t || res.statusText).slice(0, 240)}`)
      throw lastHttpErr
    }
    throw lastHttpErr || new Error(`CoinGecko ${tag} ${path}: exhausted retries`)
  }

  try {
    return await requestJson(client.baseUrl, client.headers, 'primary')
  } catch (e) {
    const proHost = client.baseUrl.includes('pro-api.coingecko.com')
    if (anonFallbackEnabled() && proHost && isRetryableNetworkError(e)) {
      console.warn(
        '[CoinGecko] COINGECKO_ANON_FALLBACK=true: using https://api.coingecko.com/api/v3 without API key (public rate limits).'
      )
      return await requestJson('https://api.coingecko.com/api/v3', { Accept: 'application/json' }, 'anon')
    }
    throw e
  }
}

/**
 * Top coins by market cap for homepage ticker.
 * @param {{ perPage?: number, vs?: string }} opts
 * @returns {Promise<any[]>} raw /coins/markets rows
 */
export async function fetchCoinGeckoMarketsTop(opts = {}) {
  const perPage = opts.perPage ?? 10
  const vs = opts.vs || 'usd'
  return coingeckoJson('/coins/markets', {
    vs_currency: vs,
    order: 'market_cap_desc',
    per_page: String(perPage),
    page: '1',
    sparkline: 'false',
    price_change_percentage: '24h'
  })
}

/**
 * @param {any} m market row
 * @param {number} eurRate
 */
export function mapMarketRowToTickerCoin(m, eurRate) {
  const priceUsd = parseFloat(m.current_price || 0)
  const ch = parseFloat(m.price_change_percentage_24h || 0)
  const row = {
    id: m.id,
    name: m.name,
    symbol: String(m.symbol || '').toUpperCase(),
    price_eur: (priceUsd * eurRate).toFixed(2),
    price_usd: priceUsd.toFixed(2),
    change_24h: (Number.isFinite(ch) ? ch : 0).toFixed(2),
    image: m.image || ''
  }
  if (m.market_cap != null && Number.isFinite(Number(m.market_cap))) {
    row.market_cap_usd = Math.round(Number(m.market_cap))
  }
  if (m.total_volume != null && Number.isFinite(Number(m.total_volume))) {
    row.volume_24h_usd = Math.round(Number(m.total_volume))
  }
  return row
}

async function fetchMarketsByIds(ids) {
  const uniq = [...new Set((ids || []).filter(Boolean))]
  if (!uniq.length) return []
  try {
    return await coingeckoJson('/coins/markets', {
      vs_currency: 'usd',
      ids: uniq.join(','),
      sparkline: 'false',
      price_change_percentage: '24h',
      per_page: String(Math.min(250, uniq.length)),
      page: '1'
    })
  } catch (e) {
    console.warn('[CoinGecko] markets by ids failed:', e.message)
    return []
  }
}

/**
 * CoinGecko search/trending + /coins/markets merge for stable USD, %, volume.
 * @param {number} limit default 10
 */
export async function fetchTrendingCoinsForHomepage(limit = 10) {
  const trending = await coingeckoJson('/search/trending')
  const wrapped = (trending.coins || []).slice(0, limit)
  const ids = wrapped.map(w => w?.item?.id).filter(Boolean)
  const markets = await fetchMarketsByIds(ids)
  const byId = Object.fromEntries(markets.map(m => [m.id, m]))

  return wrapped.map(w => {
    const item = w.item || {}
    const m = byId[item.id]
    const data = item.data || {}
    const price =
      m?.current_price != null
        ? Number(m.current_price)
        : data.price != null
          ? Number(data.price)
          : null
    let pch =
      m?.price_change_percentage_24h != null
        ? Number(m.price_change_percentage_24h)
        : data.price_change_percentage_24h?.usd != null
          ? Number(data.price_change_percentage_24h.usd)
          : null
    if (pch != null && !Number.isFinite(pch)) pch = null

    const rank = m?.market_cap_rank ?? item.market_cap_rank ?? null
    const mcap = m?.market_cap != null ? Number(m.market_cap) : null
    const vol = m?.total_volume != null ? Number(m.total_volume) : null

    return {
      id: item.id,
      name: item.name,
      symbol: String(item.symbol || '').toUpperCase(),
      price,
      percent_change_24h: pch,
      market_cap_rank: rank,
      coingecko_market_cap_usd: mcap != null && Number.isFinite(mcap) ? mcap : undefined,
      coingecko_volume_24h_usd: vol != null && Number.isFinite(vol) ? vol : undefined,
      coingecko_trend_score: typeof w.score === 'number' ? w.score : item.score,
      image: item.large || item.small || item.thumb || ''
    }
  })
}

function fmtUsdCompact(n) {
  if (n == null || !Number.isFinite(Number(n))) return ''
  const v = Number(n)
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

/**
 * First CoinGecko trending coin, enriched for scheduled SEO + Claude.
 */
export async function fetchCoinGeckoTrendingTopCoin() {
  const list = await fetchTrendingCoinsForHomepage(1)
  const c = list[0]
  if (!c) throw new Error('CoinGecko trending returned no coins')
  const priceStr =
    c.price != null && Number.isFinite(Number(c.price))
      ? Number(c.price) < 1
        ? Number(c.price).toPrecision(6)
        : Number(c.price).toLocaleString('en-US', { maximumFractionDigits: 2 })
      : 'N/A'
  return {
    name: c.name,
    symbol: c.symbol,
    price: priceStr,
    percent_change_24h:
      c.percent_change_24h != null && Number.isFinite(Number(c.percent_change_24h))
        ? Number(c.percent_change_24h)
        : null,
    market_cap_rank: c.market_cap_rank,
    total_volume_24h_usd: c.coingecko_volume_24h_usd,
    total_volume_24h_label: fmtUsdCompact(c.coingecko_volume_24h_usd),
    coingecko_id: c.id,
    image: c.image
  }
}
