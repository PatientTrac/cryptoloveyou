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
  // Strip accidental surrounding quotes from .env like ANTHROPIC_API_KEY="sk-ant-..."
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1).trim()
  }
  return v
}

function looksLikeJwt(secret) {
  const v = String(secret || '')
  // Typical JWTs (including Supabase keys) start with base64url JSON header: eyJhbGciOi...
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
  // Anthropic keys commonly start with sk-ant- (or sk-ant-api03-)
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

async function lunarCrushTopCoin() {
  const { value: apiKey } = requireEnv('LUNARCRUSH_API_KEY', ['LUNARCRUSH_KEY'])
  const base = 'https://lunarcrush.com/api4/public/coins/list'
  const qs = `key=${encodeURIComponent(apiKey)}&limit=1&sort=galaxy_score&desc=true`

  // LunarCrush v4 endpoints vary by subscription/rollout.
  // Try the versioned path first (matches client docs), then fall back.
  const candidates = [
    `${base}/v1?${qs}`,
    `${base}?${qs}`
  ]

  /** @type {string[]} */
  const errors = []

  for (const url of candidates) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) {
      const t = await res.text().catch(() => '')
      errors.push(`${url} -> ${res.status} ${t || res.statusText}`)
      continue
    }

    const json = await res.json()
    const coin = json?.data?.[0]
    if (!coin) {
      errors.push(`${url} -> missing data[0]`)
      continue
    }
    return coin
  }

  throw new Error(`LunarCrush error: no working endpoint. Tried: ${errors.join(' | ')}`)
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
          `  \"title\": string,\n` +
          `  \"slug\": string,\n` +
          `  \"summary\": string,\n` +
          `  \"content_type\": \"seo_article\",\n` +
          `  \"meta_title\": string,\n` +
          `  \"meta_description\": string,\n` +
          `  \"sections\": {\n` +
          `    \"intro\": string,\n` +
          `    \"trend_analysis\": string,\n` +
          `    \"market_sentiment\": string,\n` +
          `    \"risks\": string,\n` +
          `    \"conclusion\": string\n` +
          `  },\n` +
          `  \"cta\": { \"platform\": \"binance\", \"text\": string },\n` +
          `  \"internal_links\": string[],\n` +
          `  \"coin\": {\n` +
          `    \"name\": string,\n` +
          `    \"symbol\": string,\n` +
          `    \"galaxy_score\": string|number,\n` +
          `    \"social_volume\": string|number,\n` +
          `    \"percent_change_24h\": string|number,\n` +
          `    \"market_cap_rank\": string|number\n` +
          `  }\n` +
          `}\n\n` +
          `Input:\n` +
          `Name: ${coin.name}\n` +
          `Symbol: ${coin.symbol}\n` +
          `Price: ${coin.price}\n` +
          `24h change: ${coin.percent_change_24h}\n` +
          `Galaxy Score: ${coin.galaxy_score}\n` +
          `Social Volume: ${coin.social_volume}\n` +
          `Market Cap Rank: ${coin.market_cap_rank}\n\n` +
          `Rules:\n` +
          `- slug MUST be ${slug}\n` +
          `- title MUST be ${title}\n` +
          `- internal_links MUST include:\n` +
          `  /best-crypto-yield-platforms\n` +
          `  /best-crypto-exchanges-2026\n` +
          `  /best-crypto-wallets-2026\n` +
          `- Don’t invent APYs/fees/TVL.\n` +
          `- Include 1–2 sentences warning trends can reverse quickly.\n` +
          `- CTA text: \"Explore ${coin.symbol} on Binance\".\n\n` +
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

  // Minimal validation
  if (!obj.slug || !obj.title || !obj.sections?.intro) throw new Error('Claude JSON missing required fields')
  if (obj.slug !== slug) throw new Error('Claude slug mismatch')
  if (obj.content_type !== 'seo_article') obj.content_type = 'seo_article'

  // Force internal links to include required paths
  const requiredLinks = [
    '/best-crypto-yield-platforms',
    '/best-crypto-exchanges-2026',
    '/best-crypto-wallets-2026'
  ]
  const links = Array.isArray(obj.internal_links) ? obj.internal_links : []
  obj.internal_links = Array.from(new Set([...requiredLinks, ...links]))

  // Ensure CTA platform is binance
  obj.cta = { platform: 'binance', text: obj.cta?.text || `Explore ${coin.symbol} on Binance` }

  // Attach coin data for template pills
  obj.coin = {
    name: coin.name,
    symbol: coin.symbol,
    galaxy_score: coin.galaxy_score,
    social_volume: coin.social_volume,
    percent_change_24h: coin.percent_change_24h,
    market_cap_rank: coin.market_cap_rank
  }

  return obj
}

export const handler = async () => {
  try {
    const now = new Date()
    const coin = await lunarCrushTopCoin()

    const slug = `${slugify(coin.symbol)}-trending-${monthKey(now)}-${now.getFullYear()}`
    const title = `Why ${coin.name} (${coin.symbol}) Is Trending Today`

    const article = await claudeJsonArticle({ coin, slug, title })

    // Publish by calling the existing generator locally (no Supabase)
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

function debugKey(key) {
  const v = String(key || '')
  return {
    prefix: v.slice(0, 10),
    length: v.length
  }
}

