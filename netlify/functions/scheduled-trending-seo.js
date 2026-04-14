const slug = `${slugify(coin.symbol)}-trending-${monthKey(now)}-${now.getFullYear()}`import { handler as generateArticle } from './generate-article.js'
import { fetchCoinGeckoTrendingTopCoin } from './utils/coingecko-homepage.js'

function requireEnv(name, fallbacks = []) {
  const candidates = [name, ...fallbacks]git add netlify/functions/scheduled-trending-seo.js
git commit -m "fix: unique daily slugs and category assignment for trending articles"
git push origin main
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

function assignCategory(symbol) {
  const sym = String(symbol || '').toUpperCase()
  if (sym === 'BTC') return { category: 'Bitcoin', categorySlug: 'crypto-news/bitcoin' }
  if (sym === 'ETH') return { category: 'Ethereum', categorySlug: 'crypto-news/ethereum' }
  // DeFi tokens
  const defi = ['UNI', 'AAVE', 'MKR', 'COMP', 'CRV', 'SNX', 'YFI', 'SUSHI', 'BAL', 'RUNE']
  if (defi.includes(sym)) return { category: 'DeFi', categorySlug: 'crypto-news/defi' }
  // Default to altcoins
  return { category: 'Altcoins', categorySlug: 'crypto-news/altcoins' }
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
          `    \"percent_change_24h\": string|number,\n` +
          `    \"market_cap_rank\": string|number,\n` +
          `    \"total_volume_24h_usd\": string\n` +
          `  }\n` +
          `}\n\n` +
          `Input:\n` +
          `Name: ${coin.name}\n` +
          `Symbol: ${coin.symbol}\n` +
          `Price (USD): ${coin.price}\n` +
          `24h change (%): ${coin.percent_change_24h}\n` +
          `Market cap rank: ${coin.market_cap_rank}\n` +
          `24h volume (USD, compact): ${coin.total_volume_24h_label || 'N/A'}\n\n` +
          `Rules:\n` +
          `- slug MUST be ${slug}\n` +
          `- title MUST be ${title}\n` +
          `- internal_links MUST include:\n` +
          `  /best-crypto-yield-platforms\n` +
          `  /best-crypto-exchanges-2026\n` +
          `  /best-crypto-wallets-2026\n` +
          `- Don't invent APYs/fees/TVL.\n` +
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
    percent_change_24h:
      coin.percent_change_24h != null && Number.isFinite(Number(coin.percent_change_24h))
        ? Number(coin.percent_change_24h).toFixed(2)
        : '',
    market_cap_rank: coin.market_cap_rank != null ? String(coin.market_cap_rank) : '',
    total_volume_24h_usd: coin.total_volume_24h_label || ''
  }

  return obj
}

export const handler = async () => {
  try {
    const now = new Date()
    const coin = await fetchCoinGeckoTrendingTopCoin()

    // Unique slug per day (not per month) so every daily run commits a new file
    const day = String(now.getDate()).padStart(2, '0')
    const slug = `${slugify(coin.symbol)}-trending-${monthKey(now)}-${day}-${now.getFullYear()}`
    const title = `Why ${coin.name} (${coin.symbol}) Is Trending Today`

    // Assign category based on coin symbol
    const { category, categorySlug } = assignCategory(coin.symbol)

    const article = await claudeJsonArticle({ coin, slug, title })

    // Attach category so generate-article.js can use it in templates
    article.category = category
    article.categorySlug = categorySlug

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
        category,
        categorySlug,
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
