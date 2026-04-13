import { writeFile } from 'fs/promises'
import { join } from 'path'

/**
 * Netlify Function: Update Homepage Content
 *
 * This function:
 * 1. Fetches live crypto price data from CoinGecko API (replaces LunarCrush)
 * 2. Fetches trending coins from CoinGecko /trending endpoint (replaces LunarCrush galaxy_score)
 * 3. Fetches stock news from external RSS/APIs
 * 4. Fetches AI news from RSS feeds (MIT News, VentureBeat, The Verge)
 * 5. Uses Claude API to generate content sections
 * 6. Writes JSON files to content/homepage/
 *
 * Migration note:
 *   LunarCrush → CoinGecko
 *   galaxy_score → price_change_percentage_24h (momentum proxy)
 *   social_volume → total_volume (market activity proxy)
 *   LUNARCRUSH_API_KEY → COINGECKO_API_KEY
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

// CoinGecko Pro API base headers
function cgHeaders() {
  const apiKey = requireEnv('COINGECKO_API_KEY')
  return {
    Accept: 'application/json',
    'x-cg-pro-api-key': apiKey
  }
}

// Fetch live EUR/USD exchange rate
async function fetchEURRate() {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    if (!res.ok) throw new Error('Exchange rate fetch failed')
    const json = await res.json()
    return json.rates?.EUR || 0.92
  } catch (error) {
    console.warn('Failed to fetch live EUR rate, using fallback:', error.message)
    return 0.92
  }
}

/**
 * Fetch top 10 coins by market cap for the price ticker.
 * Replaces: LunarCrush coins/list endpoint.
 * CoinGecko endpoint: /coins/markets
 */
async function fetchTickerData() {
  const TOP_COIN_IDS = [
    'bitcoin',
    'ethereum',
    'tether',
    'ripple',
    'binancecoin',
    'usd-coin',
    'solana',
    'tron',
    'staked-ether',
    'cardano'
  ]

  const url =
    'https://pro-api.coingecko.com/api/v3/coins/markets' +
    `?vs_currency=usd` +
    `&ids=${TOP_COIN_IDS.join(',')}` +
    `&order=market_cap_desc` +
    `&per_page=10` +
    `&page=1` +
    `&price_change_percentage=24h` +
    `&sparkline=false`

  const res = await fetch(url, { headers: cgHeaders() })

  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`CoinGecko ticker error: ${res.status} ${t || res.statusText}`)
  }

  const coins = await res.json()
  if (!Array.isArray(coins)) throw new Error('CoinGecko ticker: unexpected response shape')

  const eurRate = await fetchEURRate()
  console.log(`Using EUR rate: ${eurRate}`)

  return coins
    .filter(coin => coin.current_price && coin.current_price > 0)
    .map(coin => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol?.toUpperCase(),
      price_usd: parseFloat(coin.current_price || 0).toFixed(2),
      price_eur: (parseFloat(coin.current_price || 0) * eurRate).toFixed(2),
      change_24h: parseFloat(coin.price_change_percentage_24h || 0).toFixed(2),
      market_cap_rank: coin.market_cap_rank,
      image: coin.image || `https://coin-images.coingecko.com/coins/images/1/thumb/${coin.symbol?.toLowerCase()}.png`
    }))
}

/**
 * Fetch trending / high-momentum coins for content generation.
 * Replaces: LunarCrush galaxy_score sort.
 *
 * Strategy: combine CoinGecko's /trending endpoint (community-driven) with
 * top gainers from /coins/markets for a richer signal.
 */
async function fetchTrendingCryptoTopics() {
  // 1. CoinGecko trending coins (past 24h search volume on CoinGecko)
  const trendRes = await fetch('https://pro-api.coingecko.com/api/v3/search/trending', {
    headers: cgHeaders()
  })

  if (!trendRes.ok) {
    const t = await trendRes.text().catch(() => '')
    throw new Error(`CoinGecko trending error: ${trendRes.status} ${t || trendRes.statusText}`)
  }

  const trendJson = await trendRes.json()
  const trendingIds = (trendJson?.coins || [])
    .slice(0, 10)
    .map(c => c.item?.id)
    .filter(Boolean)

  if (trendingIds.length === 0) throw new Error('CoinGecko trending: no coins returned')

  // 2. Enrich with market data so we have price / change fields
  const marketsUrl =
    'https://pro-api.coingecko.com/api/v3/coins/markets' +
    `?vs_currency=usd` +
    `&ids=${trendingIds.join(',')}` +
    `&order=market_cap_desc` +
    `&per_page=10` +
    `&page=1` +
    `&price_change_percentage=24h` +
    `&sparkline=false`

  const marketsRes = await fetch(marketsUrl, { headers: cgHeaders() })

  if (!marketsRes.ok) {
    const t = await marketsRes.text().catch(() => '')
    throw new Error(`CoinGecko markets error: ${marketsRes.status} ${t || marketsRes.statusText}`)
  }

  const markets = await marketsRes.json()

  // Normalize to shape used by content generation functions below
  return markets.map(coin => ({
    id: coin.id,
    name: coin.name,
    symbol: coin.symbol?.toUpperCase(),
    price: coin.current_price,
    percent_change_24h: parseFloat(coin.price_change_percentage_24h || 0).toFixed(2),
    market_cap_rank: coin.market_cap_rank,
    // Proxy replacements for LunarCrush-only fields:
    galaxy_score: parseFloat(coin.price_change_percentage_24h || 0).toFixed(2), // momentum proxy
    social_volume: coin.total_volume,                                            // market activity proxy
    volume_24h: coin.total_volume,
    image: coin.image
  }))
}

// Parse RSS feed to JSON
async function parseRSS(feedUrl) {
  try {
    const res = await fetch(feedUrl)
    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)
    const xml = await res.text()

    const items = []
    const itemRegex = /<item>([\s\S]*?)<\/item>/g
    let match

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemContent = match[1]
      const title =
        itemContent.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] ||
        itemContent.match(/<title>(.*?)<\/title>/)?.[1] ||
        ''
      const link = itemContent.match(/<link>(.*?)<\/link>/)?.[1] || ''
      const pubDate = itemContent.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || ''

      if (title && link) {
        items.push({ title: title.trim(), link: link.trim(), pubDate: pubDate.trim() })
      }
    }

    return items.slice(0, 10)
  } catch (error) {
    console.error(`Failed to parse RSS from ${feedUrl}:`, error.message)
    return []
  }
}

// Fetch stock news from Reuters Markets RSS feed
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

  return { source: 'stock-market-rss', items: allItems.slice(0, 15) }
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

  return { source: 'ai-news-rss', items: allItems.slice(0, 15) }
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

// Generate featured article section
async function generateFeaturedSection(trendingCoins) {
  const topCoin = trendingCoins[0]
  if (!topCoin) throw new Error('No trending coins found')

  const prompt = `Generate a featured article entry for the homepage based on this trending cryptocurrency:

Name: ${topCoin.name}
Symbol: ${topCoin.symbol}
Price: $${topCoin.price}
24h Change: ${topCoin.percent_change_24h}%
Market Cap Rank: #${topCoin.market_cap_rank}
24h Volume: $${topCoin.volume_24h?.toLocaleString() || 'N/A'}

Requirements:
- Title should be compelling and SEO-optimized
- Excerpt should be 2-3 sentences summarizing the key trend
- Category should be "Bitcoin" if BTC, "Ethereum" if ETH, otherwise "Altcoins"
- Date should be today: ${formatDate(new Date().toISOString())}
- Slug should be URL-friendly version of title starting with /
- Include a realistic image path
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

// Generate latest news section
async function generateLatestNewsSection(trendingCoins) {
  const prompt = `Generate 6 crypto news article entries for the "Latest News" section based on these trending coins:

${trendingCoins.slice(0, 6).map((c, i) => `${i + 1}. ${c.name} (${c.symbol}): $${c.price}, 24h: ${c.percent_change_24h}%`).join('\n')}

Requirements:
- Mix of categories: Bitcoin, Ethereum, Altcoins, Blockchain, DeFi
- Each item needs: title, excerpt (1-2 sentences), category, categorySlug, date (today: ${formatDate(new Date().toISOString())}), slug, imageUrl
- Titles should be newsworthy and compelling
- Slugs should be URL-friendly and start with /
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

// Generate stock news section
async function generateStockNewsSection(rssItems) {
  const topStories = rssItems
    .slice(0, 8)
    .map((item, i) => `${i + 1}. ${item.title} (${item.pubDate})`)
    .join('\n')

  const prompt = `Based on these real stock market headlines from Reuters and Yahoo Finance:

${topStories}

Generate stock news articles for the homepage sidebar:

Requirements:
- 1 featured article: Pick the most compelling headline, create a URL-friendly slug starting with /
- 3 smaller news items: Pick 3 other interesting headlines, create slugs starting with /
- Category: "Stock News", categorySlug: "stock-news"
- Date: today (${formatDate(new Date().toISOString())})
- Image URLs: use placeholder paths like "/wp-content/uploads/2026/03/stock-news-1.jpg"
- Slugs must be URL-friendly (lowercase, hyphens, no special chars)
- Use the ACTUAL headlines from the list above, don't make up new ones
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
    items: [{ title: 'string', date: 'string', slug: 'string', imageUrl: 'string' }]
  }

  return await generateContentWithClaude(prompt, schema)
}

// Generate AI news section
async function generateAINewsSection(rssItems) {
  const topStories = rssItems
    .slice(0, 8)
    .map((item, i) => `${i + 1}. ${item.title} (${item.pubDate})`)
    .join('\n')

  const prompt = `Based on these real AI news headlines from VentureBeat, MIT News, and The Verge:

${topStories}

Generate AI news articles for the homepage:

Requirements:
- 1 featured article: Pick the most compelling AI headline, create a URL-friendly slug starting with /
- 4 related AI news items: Pick 4 other interesting headlines, create slugs starting with /
- Category: "AI News", categorySlug: "ai-news"
- Date: today (${formatDate(new Date().toISOString())})
- Image URLs: use placeholder paths like "/wp-content/uploads/2026/03/ai-news-1.jpg"
- Slugs must be URL-friendly (lowercase, hyphens, no special chars)
- Use the ACTUAL headlines from the list above, don't make up new ones
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
    errors: []
  }

  try {
    console.log('🚀 Starting homepage content update...')

    // Fetch ticker data (CoinGecko /coins/markets — no Claude, direct API)
    try {
      console.log('📊 Fetching ticker data from CoinGecko...')
      const tickerData = await fetchTickerData()
      const tickerContent = { coins: tickerData }
      await writeFile(
        join(process.cwd(), 'content', 'homepage', 'ticker.json'),
        JSON.stringify(tickerContent, null, 2),
        'utf-8'
      )
      results.ticker = { success: true, coins: tickerData.length }
      console.log('✅ Ticker data updated')
    } catch (error) {
      console.error('❌ Ticker update failed:', error.message)
      results.errors.push({ section: 'ticker', error: error.message })
    }

    // Fetch trending crypto topics for content generation (CoinGecko /search/trending)
    console.log('📈 Fetching trending crypto topics from CoinGecko...')
    const trendingCoins = await fetchTrendingCryptoTopics()

    // Generate featured section
    try {
      console.log('🎯 Generating featured article...')
      const featured = await generateFeaturedSection(trendingCoins)
      await writeFile(
        join(process.cwd(), 'content', 'homepage', 'featured.json'),
        JSON.stringify(featured, null, 2),
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
      const latestNews = await generateLatestNewsSection(trendingCoins)
      await writeFile(
        join(process.cwd(), 'content', 'homepage', 'latest-news.json'),
        JSON.stringify(latestNews, null, 2),
        'utf-8'
      )
      results.latestNews = { success: true, items: latestNews.items?.length || 0 }
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
      const stockNews = await generateStockNewsSection(stockNewsRSS.items)
      await writeFile(
        join(process.cwd(), 'content', 'homepage', 'stock-news.json'),
        JSON.stringify(stockNews, null, 2),
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
      const aiNews = await generateAINewsSection(aiNewsRSS.items)
      await writeFile(
        join(process.cwd(), 'content', 'homepage', 'ai-news.json'),
        JSON.stringify(aiNews, null, 2),
        'utf-8'
      )
      results.aiNews = { success: true, rssItems: aiNewsRSS.items.length }
      console.log('✅ AI news updated')
    } catch (error) {
      console.error('❌ AI news failed:', error.message)
      results.errors.push({ section: 'ai-news', error: error.message })
    }

    const successCount = Object.values(results).filter(r => r && r.success).length
    const hasErrors = results.errors.length > 0

    return {
      statusCode: hasErrors ? 207 : 200,
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
