import { handler as generateArticle } from './generate-article.js'

function requireEnv(name, fallbacks = []) {
  const candidates = [name, ...fallbacks]
  for (const key of candidates) {
    const raw = process.env[key]
    const v = normalizeSecret(raw)
    if (v) return { value: v, from: key }
  }
  throw new Error(`Missing env var: ${candidates.join(' or ')}`)
}

function normalizeSecret(raw) {
  if (!raw) return ''
  let v = String(raw).trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim()
  }
  return v
}

function looksLikeJwt(secret) {
  const v = String(secret || '')
  return v.startsWith('eyJ') && v.includes('.') && v.split('.').length >= 3
}

function assertAnthropicApiKey(value, fromEnvName) {
  const v = String(value || '')
  if (!v) throw new Error(`Missing env var: ${fromEnvName}`)
  if (looksLikeJwt(v)) {
    throw new Error(
      `ANTHROPIC_API_KEY looks like a JWT (prefix=${v.slice(0, 10)}..., len=${v.length}). ` +
        `This usually means your Supabase key is accidentally set/overriding ANTHROPIC_API_KEY.`
    )
  }
  if (!v.startsWith('sk-ant-')) {
    throw new Error(
      `ANTHROPIC_API_KEY has unexpected format (prefix=${v.slice(0, 10)}..., len=${v.length}). ` +
        `Expected it to start with sk-ant-.`
    )
  }
}

function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function monthKey(date) {
  return date.toLocaleString('en-US', { month: 'long' }).toLowerCase()
}

function debugKey(key) {
  const v = String(key || '')
  return { prefix: v.slice(0, 10), length: v.length }
}

/**
 * Fetch the top trending coin from CoinGecko.
 * Uses /coins/markets sorted by 24h change to find the most momentum coin,
 * filtered to top 100 by market cap for quality results.
 *
 * Replaces: lunarCrushTopCoin() which used galaxy_score from LunarCrush.
 * CoinGecko equivalent: sort by price_change_percentage_24h within top 100 market cap coins.
 */
async function coinGeckoTopCoin() {
  const { value: apiKey } = requireEnv('COINGECKO_API_KEY', ['COINGECKO_KEY'])

  const url =
    'https://pro-api.coingecko.com/api/v3/coins/markets' +
    '?vs_currency=usd' +
    '&order=market_cap_desc' +
    '&per_page=100' +
    '&page=1' +
    '&price_change_percentage=24h' +
    '&sparkline=false'

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'x-cg-pro-api-key': apiKey
    }
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`CoinGecko error: ${res.status} ${t || res.statusText}`)
  }

  const coins = await res.json()
  if (!Array.isArray(coins) || coins.length === 0) {
    throw new Error('CoinGecko returned no coins')
  }

  // Pick the coin with the highest positive 24h price change (most trending)
  const sorted = [...coins].sort(
    (a, b) =>
      (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)
  )

  const top = sorted[0]

  // Normalize to the same shape the rest of the function expects
  return {
    id: top.id,
    name: top.name,
    symbol: top.symbol?.toUpperCase(),
    price: top.current_price,
    percent_change_24h: top.price_change_percentage_24h?.toFixed(2),
    market_cap_rank: top.market_cap_rank,
    // galaxy_score / social_volume no longer available — replaced with CoinGecko equivalents
    galaxy_score: null,       // not available on CoinGecko
    social_volume: null,      // not available on CoinGecko
    market_cap: top.market_cap,
    volume_24h: top.total_volume,
    image: top.image
  }
}

async function claudeJsonArticle({ coin, slug, title }) {
  const { value: apiKey, from: apiKeyFrom } = requireEnv('ANTHROPIC_API_KEY', ['CLAUDE_API_KEY', 'ANTHROPIC_KEY'])
  assertAnthropicApiKey(apiKey, apiKeyFrom)
  const apiKeyDebug = debugKey(apiKey)

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1400,
    temperature: 0.6,
    messages: [
      {
        role: 'user',
        content:
          `Return ONLY valid JSON. No markdown. No code fences.\n\n` +
          `Schema:\n` +
          `{\n` +
          `  "title": string,\n` +
          `  "slug": string,\n` +
          `  "summary": string,\n` +
          `  "content_type": "seo_article",\n` +
          `  "meta_title": string,\n` +
          `  "meta_description": string,\n` +
          `  "sections": {\n` +
          `    "intro": string,\n` +
          `    "trend_analysis": string,\n` +
          `    "market_sentiment": string,\n` +
          `    "risks": string,\n` +
          `    "conclusion": string\n` +
          `  },\n` +
          `  "cta": { "platform": "binance", "text": string },\n` +
          `  "internal_links": string[],\n` +
          `  "coin": {\n` +
          `    "name": string,\n` +
          `    "symbol": string,\n` +
          `    "trend_score": string|number,\n` +
          `    "volume_24h": string|number,\n` +
          `    "percent_change_24h": string|number,\n` +
          `    "market_cap_rank": string|number\n` +
          `  }\n` +
          `}\n\n` +
          `Input:\n` +
          `Name: ${coin.name}\n` +
          `Symbol: ${coin.symbol}\n` +
          `Price: $${coin.price}\n` +
          `24h change: ${coin.percent_change_24h}%\n` +
          `Market Cap Rank: #${coin.market_cap_rank}\n` +
          `24h Volume: $${coin.volume_24h?.toLocaleString() || 'N/A'}\n` +
          `Market Cap: $${coin.market_cap?.toLocaleString() || 'N/A'}\n\n` +
          `Rules:\n` +
          `- slug MUST be ${slug}\n` +
          `- title MUST be ${title}\n` +
          `- internal_links MUST include:\n` +
          `  /best-crypto-yield-platforms\n` +
          `  /best-crypto-exchanges-2026\n` +
          `  /best-crypto-wallets-2026\n` +
          `- Don't invent APYs/fees/TVL.\n` +
          `- Include 1–2 sentences warning trends can reverse quickly.\n` +
          `- CTA text: "Explore ${coin.symbol} on Binance".\n` +
          `- For trend_score, use the 24h price change percentage as a proxy.\n\n` +
          `Return JSON now.`
      }
    ]
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    const debug =
      String(process.env.NODE_ENV || '').toLowerCase() === 'development'
        ? ` (key_from=${apiKeyFrom}, key_prefix=${apiKeyDebug.prefix}, key_len=${apiKeyDebug.length})`
        : ''
    throw new Error(`Claude error ${res.status}: ${t || res.statusText}${debug}`)
  }

  const json = await res.json()
  const text = json?.content?.[0]?.text
  if (!text) throw new Error('Claude response missing content[0].text')

  let obj
  try {
    obj = JSON.parse(text)
  } catch {
    throw new Error('Claude did not return valid JSON')
  }

  if (!obj.slug || !obj.title || !obj.sections?.intro) throw new Error('Claude JSON missing required fields')
  if (obj.slug !== slug) throw new Error('Claude slug mismatch')
  if (obj.content_type !== 'seo_article') obj.content_type = 'seo_article'

  const requiredLinks = [
    '/best-crypto-yield-platforms',
    '/best-crypto-exchanges-2026',
    '/best-crypto-wallets-2026'
  ]
  const links = Array.isArray(obj.internal_links) ? obj.internal_links : []
  obj.internal_links = Array.from(new Set([...requiredLinks, ...links]))

  obj.cta = { platform: 'binance', text: obj.cta?.text || `Explore ${coin.symbol} on Binance` }

  // Attach coin data for template pills
  obj.coin = {
    name: coin.name,
    symbol: coin.symbol,
    trend_score: coin.percent_change_24h,   // replaces galaxy_score
    volume_24h: coin.volume_24h,            // replaces social_volume
    percent_change_24h: coin.percent_change_24h,
    market_cap_rank: coin.market_cap_rank
  }

  return obj
}

export const handler = async () => {
  try {
    const now = new Date()
    const coin = await coinGeckoTopCoin()

    const slug = `${slugify(coin.symbol)}-trending-${monthKey(now)}-${now.getFullYear()}`
    const title = `Why ${coin.name} (${coin.symbol}) Is Trending Today`

    const article = await claudeJsonArticle({ coin, slug, title })

    const publishEvent = {
      httpMethod: 'POST',
      body: JSON.stringify({
        apiKey: requireEnv('ARTICLE_GENERATION_API_KEY').value,
        article
      })
    }

    const res = await generateArticle(publishEvent)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Scheduled SEO article generated',
        slug,
        coin: coin.name,
        generateArticleResult: safeJson(res?.body)
      })
    }
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message
      })
    }
  }
}

function safeJson(body) {
  try {
    return JSON.parse(body || '{}')
  } catch {
    return { body }
  }
}
