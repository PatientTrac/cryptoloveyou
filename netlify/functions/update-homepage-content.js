import { writeFile } from 'fs/promises'
import { join } from 'path'
import {
  collectHomepageArticleSpecs,
  pickRelatedHomepagePosts,
  slugDirFromHomepagePath,
  writeHomepageLinkedArticle
} from './utils/write-homepage-article.js'
import { useClaudeArticleBodies } from './utils/claude-article-body.js'
import {
  fetchCoinGeckoMarketsTop,
  fetchTrendingCoinsForHomepage,
  mapMarketRowToTickerCoin
} from './utils/coingecko-homepage.js'

/**
 * Netlify Function: Update Homepage Content
 *
 * This function:
 * 1. Fetches crypto ticker + trending from CoinGecko (markets + search/trending)
 * 2. Fetches stock news from external RSS/APIs
 * 3. Fetches AI news from RSS feeds (MIT News, VentureBeat, The Verge)
 * 4. Uses Claude API to generate homepage JSON (featured, latest, stock, AI card copy + slugs)
 * 5. Writes JSON files to content/homepage/
 * 6. Writes static article pages (Claude long-form + CoinGecko snapshot when HOMEPAGE_CLAUDE_ARTICLES is enabled) + site chrome sliced from index.html
 *    Default: overwrites existing slug pages when Claude is on so old stubs are replaced (HOMEPAGE_ARTICLE_SKIP_IF_EXISTS=true to keep skips).
 * Homepage layout stays the WP-exported index.html + homepage-content-loader.js (this job does not replace index.html).
 */

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

function formatDate(isoDate) {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Real files under /wp-content/uploads (LLM "stock-news-1.jpg" style paths are not on disk)
const HOMEPAGE_SIDEBAR_MEDIA = {
  stockFeatured: '/wp-content/uploads/2025/09/SBET-Quantitative-Stock-Analysis-Nasdaq-450x225.jpg',
  stockSmall: [
    '/wp-content/uploads/2026/03/Stocks-Settle-Sharply-Higher-as-Crude-Oil-Slumps-300x200.jpg',
    '/wp-content/uploads/2026/03/Cocoa-Prices-Settle-Mixed-on-Currency-Fluctuations-450x253.jpg',
    '/wp-content/uploads/2026/03/Crude-Oil-Prices-Rally-as-Iran-War-Disrupts-Global-Supplies-450x299.jpg',
    '/wp-content/uploads/2026/03/2-Bruised-Dividend-Titans-Worth-Buying-on-the-Cheap-300x200.jpg'
  ],
  aiFeatured: '/wp-content/uploads/2026/03/Trustpilot-partners-with-big-model-vendors.webp-1024x683.webp',
  aiList: [
    '/wp-content/uploads/2026/03/Can-AI-help-predict-which-heart-failure-patients-will-worsen-within-450x300.jpg',
    '/wp-content/uploads/2026/03/5-Hacks-To-Use-ChatGPT-So-Well-Its-Almost-Unfair-450x253.jpg',
    '/wp-content/uploads/2026/03/100-Free-AI-Course-by-Anthropic-Learn-AI-in-450x253.jpg',
    '/wp-content/uploads/2026/03/10-Best-FREE-AI-Courses-for-Beginners-450x253.jpg',
    '/wp-content/uploads/2026/03/5-Levels-of-Prompting-to-Create-ANY-AI-Video-450x253.jpg'
  ],
  cryptoFeatured: '/wp-content/uploads/2026/03/Aave-Rift-Bitcoin-Rebound-and-ETF-Inflows-Dominate-the-Crypto-450x300.jpg',
  cryptoList: [
    '/wp-content/uploads/2026/03/Bitcoin-Rally-Stalls-Near-70K-Will-Altcoins-Keep-Going-450x300.jpg',
    '/wp-content/uploads/2026/03/Bitcoin-Trend-Reversal-Possible-If-74K-Holds-Will-Altcoins-Follow-450x300.jpg',
    '/wp-content/uploads/2026/03/Bitcoin-Surges-to-Six-Week-High-as-Bulls-Eye-80K-450x270.jpg',
    '/wp-content/uploads/2026/03/Bitmines-Ether-Holdings-Reach-46M-ETH-About-38-of-Supply-450x300.jpg',
    '/wp-content/uploads/2026/03/Crypto-Exchanges-Emerge-as-TradFi-Venues-amid-Tokenized-Commodities-Boom-450x300.jpg',
    '/wp-content/uploads/2026/03/1inch-and-Ondo-RWA-Volumes-Top-25B-as-RWAs-Climb-450x300.jpg',
    '/wp-content/uploads/2026/03/Bitcoin-Miners-Battle-Rising-Costs-With-New-Survival-Strategies-450x253.png',
    '/wp-content/uploads/2026/03/78-of-Top-Alts-Beating-Bitcoin-ETH-Up-2X-450x270.jpg',
    '/wp-content/uploads/2026/03/Crypto-Funding-Soars-50-But-Most-Startups-Are-Getting-Shut-450x253.jpg',
    '/wp-content/uploads/2026/03/Buterin-Says-Its-Time-To-Revisit-Idea-Simplifying-Ethereum-Node-450x300.jpg'
  ]
}git add netlify/functions/update-homepage-content.js
git commit -m "fix: update crypto/stock/AI image pools with verified real paths"
git push origin main

function assignStockNewsImages(data) {
  if (!data?.featured) return data
  data.featured.imageUrl = HOMEPAGE_SIDEBAR_MEDIA.stockFeatured
  const items = data.items || []
  items.forEach((item, i) => {
    item.imageUrl = HOMEPAGE_SIDEBAR_MEDIA.stockSmall[i % HOMEPAGE_SIDEBAR_MEDIA.stockSmall.length]
  })
  return data
}

function assignAINewsImages(data) {
  if (!data?.featured) return data
  data.featured.imageUrl = HOMEPAGE_SIDEBAR_MEDIA.aiFeatured
  const items = data.items || []
  items.forEach((item, i) => {
    item.imageUrl = HOMEPAGE_SIDEBAR_MEDIA.aiList[i % HOMEPAGE_SIDEBAR_MEDIA.aiList.length]
  })
  return data
}

function assignCryptoFeaturedImage(data) {
  if (!data) return data
  data.imageUrl = HOMEPAGE_SIDEBAR_MEDIA.cryptoFeatured
  return data
}

function assignCryptoLatestNewsImages(data) {
  if (!data?.items) return data
  const items = data.items || []
  items.forEach((item, i) => {
    item.imageUrl = HOMEPAGE_SIDEBAR_MEDIA.cryptoList[i % HOMEPAGE_SIDEBAR_MEDIA.cryptoList.length]
  })
  return data
}

// Fetch live EUR/USD (primary + backup + short retries for flaky networks)
async function fetchEURRate() {
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  const sources = [
    {
      url: 'https://api.exchangerate-api.com/v4/latest/USD',
      parse: j => j.rates?.EUR
    },
    {
      url: 'https://api.frankfurter.app/latest?from=USD&to=EUR',
      parse: j => j.rates?.EUR
    }
  ]
  for (const { url, parse } of sources) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const eur = parse(json)
        if (eur != null && Number.isFinite(Number(eur))) return Number(eur)
      } catch (error) {
        if (attempt < 2) await sleep(600)
        else console.warn(`EUR rate ${url} failed:`, error.message)
      }
    }
  }
  console.warn('Failed to fetch live EUR rate, using fallback 0.92')
  return 0.92
}

// Top coins by market cap (CoinGecko) for homepage ticker
async function fetchTickerData() {
  const eurRate = await fetchEURRate()
  console.log(`Using EUR rate: ${eurRate}`)
  const markets = await fetchCoinGeckoMarketsTop({ perPage: 10 })
  if (!Array.isArray(markets) || markets.length === 0) {
    throw new Error('No ticker data from CoinGecko /coins/markets')
  }
  markets.forEach(m => {
    console.log(`  ✓ ${String(m.symbol || '').toUpperCase()}: $${m.current_price}`)
  })
  return markets.map(m => mapMarketRowToTickerCoin(m, eurRate))
}

// CoinGecko search/trending (+ markets enrichment) for Claude prompts
async function fetchTrendingCryptoTopics() {
  return fetchTrendingCoinsForHomepage(10)
}

// Parse RSS feed to JSON
async function parseRSS(feedUrl) {
  try {
    const res = await fetch(feedUrl)
    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)
    const xml = await res.text()

    // Simple RSS parsing - extract title, link, pubDate
    const items = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1]
      const title = itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[1] || itemContent.match(/<title>(.*?)<\/title>/)?.[1] || ''
      const link = itemContent.match(/<link>(.*?)<\/link>/)?.[1] || ''
      const pubDate = itemContent.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''

      if (title && link) {
        items.push({ title: title.trim(), link: link.trim(), pubDate: pubDate.trim() })
      }
    }

    return items.slice(0, 10) // Return max 10 items
  } catch (error) {
    console.error(`Failed to parse RSS from ${feedUrl}:`, error.message)
    return []
  }
}

// Fetch stock news from Reuters Markets RSS feed (free, no API key needed)
async function fetchStockNews() {
  const rssFeeds = [
    'https://www.reuters.com/rssFeed/businessNews',
    'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US'
  ]

  const allItems = []

  for (const feedUrl of rssFeeds) {
    const items = await parseRSS(feedUrl)
    allItems.push(...items)
  }

  return {
    source: 'stock-market-rss',
    items: allItems.slice(0, 15) // Return top 15 combined
  }
}

// Fetch AI news from MIT News, VentureBeat AI, The Verge AI
async function fetchAINews() {
  const rssFeeds = [
    'https://venturebeat.com/category/ai/feed/',
    'https://news.mit.edu/rss/topic/artificial-intelligence2',
    'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml'
  ]

  const allItems = []

  for (const feedUrl of rssFeeds) {
    const items = await parseRSS(feedUrl)
    allItems.push(...items)
  }

  return {
    source: 'ai-news-rss',
    items: allItems.slice(0, 15) // Return top 15 combined
  }
}

// Call Claude API to generate content section
async function generateContentWithClaude(prompt, schema) {
  const apiKey = requireEnv('ANTHROPIC_API_KEY')

  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: `${prompt}\n\nReturn ONLY valid JSON matching this schema. No markdown, no code fences, no explanation:\n\n${JSON.stringify(schema, null, 2)}`
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
    const text = await res.text().catch(() => '')
    throw new Error(`Claude API error ${res.status}: ${text || res.statusText}`)
  }

  const json = await res.json()
  const text = json?.content?.[0]?.text
  if (!text) throw new Error('Claude response missing content')

  try {
    return JSON.parse(text)
  } catch (e) {
    console.error('Claude response was not valid JSON:', text)
    throw new Error('Claude did not return valid JSON')
  }
}

function trendingUsdPriceLabel(c) {
  const p = c?.price
  if (p == null || !Number.isFinite(Number(p))) return 'N/A'
  const n = Number(p)
  if (n > 0 && n < 0.01) return `~$${n.toPrecision(5)}`
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: n < 1 ? 6 : 2 })}`
}

function pctLabel(v) {
  if (v == null || !Number.isFinite(Number(v))) return 'N/A'
  return `${Number(v).toFixed(2)}`
}

// Generate featured article section (slug becomes a new static article URL on this site)
async function generateFeaturedSection(trendingCoins) {
  const topCoin = trendingCoins[0]
  if (!topCoin) throw new Error('No trending coins found')

  const rank =
    topCoin.market_cap_rank != null && Number.isFinite(Number(topCoin.market_cap_rank))
      ? `#${topCoin.market_cap_rank}`
      : 'N/A'
  const trendScore =
    topCoin.coingecko_trend_score != null ? String(topCoin.coingecko_trend_score) : 'N/A'

  const prompt = `Generate a featured homepage article entry based on this trending cryptocurrency:

Name: ${topCoin.name}
Symbol: ${topCoin.symbol}
Price (USD): ${trendingUsdPriceLabel(topCoin)}
24h Change: ${pctLabel(topCoin.percent_change_24h)}%
Market cap rank: ${rank}
CoinGecko trending score (relative): ${trendScore}

Requirements:
- Title: compelling, SEO-oriented.
- Excerpt: 2-3 sentences.
- Category: "Bitcoin" if BTC, "Ethereum" if ETH, otherwise "Altcoins" | "Blockchain" | "DeFi" as fits.
- categorySlug: WordPress-style path: crypto-news/bitcoin, crypto-news/ethereum, crypto-news/altcoins, crypto-news/blockchain, or crypto-news/defi
- date: ${formatDate(new Date().toISOString())}
- slug: URL path for a NEW article on this site: start with /, end with /, lowercase kebab-case only (e.g. /bitcoin-volatility-update-april-2026/). Must be unique and filesystem-safe (letters, numbers, hyphens only between slashes).
- imageUrl: "" or a real /wp-content/uploads/... path if you output one
`

  const schema = {
    title: 'string',
    excerpt: 'string',
    category: 'string',
    categorySlug: 'string',
    date: 'string',
    slug: 'string',
    imageUrl: 'string'
  }

  return await generateContentWithClaude(prompt, schema)
}

// Generate latest news section (each slug gets a new static article page)
async function generateLatestNewsSection(trendingCoins) {
  const prompt = `Generate 6 crypto news entries for the homepage "Latest News" section from these trending coins:

${trendingCoins
    .slice(0, 6)
    .map(
      (c, i) =>
        `${i + 1}. ${c.name} (${c.symbol}): ${trendingUsdPriceLabel(c)}, 24h: ${pctLabel(c.percent_change_24h)}%`
    )
    .join('\n')}

Requirements:
- Mix categories: Bitcoin, Ethereum, Altcoins, Blockchain, DeFi with matching categorySlug crypto-news/bitcoin … crypto-news/defi
- Each item: title, excerpt (1-2 sentences), category, categorySlug, date ${formatDate(new Date().toISOString())}, imageUrl ""
- slug: NEW on-site article path: /kebab-case/ only, lowercase, unique across all 6, filesystem-safe
`

  const schema = {
    items: [
      {
        title: 'string',
        excerpt: 'string',
        category: 'string',
        categorySlug: 'string',
        date: 'string',
        slug: 'string',
        imageUrl: 'string'
      }
    ]
  }

  return await generateContentWithClaude(prompt, schema)
}

// Generate stock news section (headlines from RSS; slugs point to new pages on this site)
async function generateStockNewsSection(rssItems) {
  const topStories = rssItems.slice(0, 8).map((item, i) =>
    `${i + 1}. Title: ${item.title}\n   URL (reference only): ${item.link}`
  ).join('\n\n')

  const prompt = `Create homepage Stock News entries from these headlines (use the REAL headline text; links stay on this site).

${topStories}

Requirements:
- 1 featured + 3 smaller items; titles must follow the RSS headlines closely (you may shorten slightly for space).
- For each entry choose a NEW on-site slug path: /kebab-case/ lowercase, unique, filesystem-safe. Do not use external URLs as slug.
- category "Stock News", categorySlug "stock-news", date ${formatDate(new Date().toISOString())}, imageUrl ""
`

  const schema = {
    featured: {
      title: 'string',
      category: 'string',
      categorySlug: 'string',
      date: 'string',
      slug: 'string',
      imageUrl: 'string'
    },
    items: [
      {
        title: 'string',
        date: 'string',
        slug: 'string',
        imageUrl: 'string'
      }
    ]
  }

  return await generateContentWithClaude(prompt, schema)
}

// Generate AI news section (RSS headlines; new on-site slugs)
async function generateAINewsSection(rssItems) {
  const topStories = rssItems.slice(0, 8).map((item, i) =>
    `${i + 1}. Title: ${item.title}\n   URL (reference only): ${item.link}`
  ).join('\n\n')

  const prompt = `Create homepage AI News entries from these headlines (use REAL headline text; links are on this site only).

${topStories}

Requirements:
- 1 featured + 4 list items; titles follow RSS closely.
- Each entry: NEW slug /kebab-case/ unique, filesystem-safe, lowercase.
- category "AI News", categorySlug "ai-news", date ${formatDate(new Date().toISOString())}, imageUrl ""
`

  const schema = {
    featured: {
      title: 'string',
      category: 'string',
      categorySlug: 'string',
      date: 'string',
      slug: 'string',
      imageUrl: 'string'
    },
    items: [
      {
        title: 'string',
        category: 'string',
        categorySlug: 'string',
        slug: 'string',
        imageUrl: 'string'
      }
    ]
  }

  return await generateContentWithClaude(prompt, schema)
}

// Main handler
export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  const results = {
    ticker: null,
    featured: null,
    latestNews: null,
    stockNews: null,
    aiNews: null,
    homepageArticles: null,
    errors: []
  }

  let featuredPayload = null
  let latestNewsPayload = null
  let stockNewsPayload = null
  let aiNewsPayload = null
  let tickerPayload = null

  try {
    console.log('🚀 Starting homepage content update...')

    // Fetch ticker data (no Claude, direct API)
    try {
      console.log('📊 Fetching ticker data...')
      const tickerData = await fetchTickerData()
      const tickerContent = { coins: tickerData }
      await writeFile(
        join(process.cwd(), 'content', 'homepage', 'ticker.json'),
        JSON.stringify(tickerContent, null, 2),
        'utf-8'
      )
      tickerPayload = tickerContent
      results.ticker = { success: true, coins: tickerData.length }
      console.log('✅ Ticker data updated')
    } catch (error) {
      console.error('❌ Ticker update failed:', error.message)
      results.errors.push({ section: 'ticker', error: error.message })
    }

    // Fetch trending crypto topics for content generation (CoinGecko)
    console.log('📈 Fetching trending crypto topics...')
    const trendingCoins = await fetchTrendingCryptoTopics()

    // Generate featured section
    try {
      console.log('🎯 Generating featured article...')
      featuredPayload = assignCryptoFeaturedImage(await generateFeaturedSection(trendingCoins))
      await writeFile(
        join(process.cwd(), 'content', 'homepage', 'featured.json'),
        JSON.stringify(featuredPayload, null, 2),
        'utf-8'
      )
      results.featured = { success: true }
      console.log('✅ Featured article updated')
    } catch (error) {
      console.error('❌ Featured article failed:', error.message)
      results.errors.push({ section: 'featured', error: error.message })
    }

    // Generate latest news section
    try {
      console.log('📰 Generating latest news...')
      latestNewsPayload = assignCryptoLatestNewsImages(await generateLatestNewsSection(trendingCoins))
      await writeFile(
        join(process.cwd(), 'content', 'homepage', 'latest-news.json'),
        JSON.stringify(latestNewsPayload, null, 2),
        'utf-8'
      )
      results.latestNews = { success: true, items: latestNewsPayload.items?.length || 0 }
      console.log('✅ Latest news updated')
    } catch (error) {
      console.error('❌ Latest news failed:', error.message)
      results.errors.push({ section: 'latest-news', error: error.message })
    }

    // Fetch stock news RSS
    console.log('📈 Fetching stock news RSS...')
    const stockNewsRSS = await fetchStockNews()

    // Generate stock news section
    try {
      console.log('📈 Generating stock news from RSS data...')
      stockNewsPayload = assignStockNewsImages(await generateStockNewsSection(stockNewsRSS.items))
      await writeFile(
        join(process.cwd(), 'content', 'homepage', 'stock-news.json'),
        JSON.stringify(stockNewsPayload, null, 2),
        'utf-8'
      )
      results.stockNews = { success: true, rssItems: stockNewsRSS.items.length }
      console.log('✅ Stock news updated')
    } catch (error) {
      console.error('❌ Stock news failed:', error.message)
      results.errors.push({ section: 'stock-news', error: error.message })
    }

    // Fetch AI news RSS
    console.log('🤖 Fetching AI news RSS...')
    const aiNewsRSS = await fetchAINews()

    // Generate AI news section
    try {
      console.log('🤖 Generating AI news from RSS data...')
      aiNewsPayload = assignAINewsImages(await generateAINewsSection(aiNewsRSS.items))
      await writeFile(
        join(process.cwd(), 'content', 'homepage', 'ai-news.json'),
        JSON.stringify(aiNewsPayload, null, 2),
        'utf-8'
      )
      results.aiNews = { success: true, rssItems: aiNewsRSS.items.length }
      console.log('✅ AI news updated')
    } catch (error) {
      console.error('❌ AI news failed:', error.message)
      results.errors.push({ section: 'ai-news', error: error.message })
    }

    // Static HTML for each homepage slug (so /slug/ resolves like other articles)
    try {
      const specs = collectHomepageArticleSpecs(
        featuredPayload,
        latestNewsPayload,
        stockNewsPayload,
        aiNewsPayload
      )
      const forceEnv = String(process.env.HOMEPAGE_ARTICLE_OVERWRITE || '').toLowerCase() === 'true'
      const skipIfExists = String(process.env.HOMEPAGE_ARTICLE_SKIP_IF_EXISTS || '').toLowerCase() === 'true'
      /** With Claude bodies on, re-write existing pages by default so stubs are replaced (opt out with HOMEPAGE_ARTICLE_SKIP_IF_EXISTS=true). */
      const force = forceEnv || (useClaudeArticleBodies() && !skipIfExists)
      if (useClaudeArticleBodies() && force && !forceEnv) {
        console.log('📄 Regenerating article HTML (Claude bodies; existing files overwritten — set HOMEPAGE_ARTICLE_SKIP_IF_EXISTS=true to skip)')
      }
      let created = 0
      let skipped = 0
      let failed = 0
      const articleBatchIso = new Date().toISOString()
      for (const spec of specs) {
        try {
          const slugDir = slugDirFromHomepagePath(spec.slug)
          const pool = pickRelatedHomepagePosts(specs, slugDir, 10, articleBatchIso)
          const relatedPosts = pool.slice(0, 4)
          const sidebarLatestPosts = pool.slice(0, 6)
          const r = await writeHomepageLinkedArticle(spec, {
            force,
            trendingCoins,
            relatedPosts,
            sidebarLatestPosts
          })
          if (r.skipped) skipped += 1
          else created += 1
        } catch (e) {
          failed += 1
          console.warn(`  ⚠️ Article write failed (${spec.slug}):`, e.message)
        }
      }
      results.homepageArticles = {
        success: failed === 0,
        created,
        skipped,
        failed,
        planned: specs.length
      }
      console.log(`📄 Homepage-linked static articles: ${created} written, ${skipped} skipped (exists)`)
    } catch (error) {
      console.error('❌ Homepage article pages failed:', error.message)
      results.errors.push({ section: 'homepage-articles', error: error.message })
      results.homepageArticles = { success: false, error: error.message }
    }

    const successCount = Object.values(results).filter(r => r && r.success).length
    const hasErrors = results.errors.length > 0

    return {
      statusCode: hasErrors ? 207 : 200, // 207 Multi-Status if some sections failed
      headers,
      body: JSON.stringify({
        success: successCount > 0,
        message: `Updated ${successCount} sections${hasErrors ? ` (${results.errors.length} failed)` : ''}`,
        results,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('❌ Fatal error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Homepage content update failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}
