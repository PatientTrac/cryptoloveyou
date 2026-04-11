import { writeFile } from 'fs/promises'
import { join } from 'path'

/**
 * Netlify Function: Update Homepage Content
 *
 * This function:
 * 1. Fetches trending crypto data from LunarCrush API
 * 2. Fetches stock news from external RSS/APIs
 * 3. Fetches AI news from RSS feeds (MIT News, VentureBeat, The Verge)
 * 4. Uses Claude API to generate content sections
 * 5. Writes JSON files to content/homepage/
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

// Fetch live EUR/USD exchange rate from exchange rate API
async function fetchEURRate() {
  try {
    // Using exchangerate-api.com free tier (1500 requests/month)
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
    if (!res.ok) throw new Error('Exchange rate fetch failed')
    const json = await res.json()
    return json.rates?.EUR || 0.92 // Fallback to reasonable default if API fails
  } catch (error) {
    console.warn('Failed to fetch live EUR rate, using fallback:', error.message)
    return 0.92 // Fallback rate
  }
}

// Fetch top coins from LunarCrush for ticker
async function fetchTickerData() {
  const apiKey = requireEnv('LUNARCRUSH_API_KEY')

  // Use list endpoint with filtering (more efficient, avoids rate limits)
  const url = `https://lunarcrush.com/api4/public/coins/list/v1?key=${encodeURIComponent(apiKey)}&limit=100&sort=market_cap&desc=true`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })

  if (!res.ok) {
    throw new Error(`LunarCrush ticker error: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()
  const allCoins = json?.data || []

  // Filter to top 10 by market cap rank with actual price data
  const topCoins = ['BTC', 'ETH', 'USDT', 'XRP', 'BNB', 'USDC', 'SOL', 'TRX', 'STETH', 'ADA']
  const coinData = allCoins
    .filter(coin =>
      topCoins.includes(coin.symbol) &&
      coin.price &&
      parseFloat(coin.price) > 0
    )
    .slice(0, 10)

  // Get live EUR/USD rate
  const eurRate = await fetchEURRate()
  console.log(`Using EUR rate: ${eurRate}`)

  return coinData.map(coin => ({
    id: coin.id || coin.symbol?.toLowerCase(),
    name: coin.name,
    symbol: coin.symbol,
    price_eur: (parseFloat(coin.price || 0) * eurRate).toFixed(2),
    price_usd: parseFloat(coin.price || 0).toFixed(2),
    change_24h: parseFloat(coin.percent_change_24h || 0).toFixed(2),
    image: coin.image || `https://coin-images.coingecko.com/coins/images/1/thumb/${coin.symbol?.toLowerCase()}.png`
  })).filter(coin => parseFloat(coin.price_usd) > 0) // Only include coins with actual prices
}

// Fetch trending crypto topics from LunarCrush
async function fetchTrendingCryptoTopics() {
  const apiKey = requireEnv('LUNARCRUSH_API_KEY')
  const url = `https://lunarcrush.com/api4/public/coins/list/v1?key=${encodeURIComponent(apiKey)}&limit=10&sort=galaxy_score&desc=true`

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    throw new Error(`LunarCrush trending error: ${res.status} ${res.statusText}`)
  }

  const json = await res.json()
  return json?.data || []
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

// Generate featured article section
async function generateFeaturedSection(trendingCoins) {
  const topCoin = trendingCoins[0]
  if (!topCoin) throw new Error('No trending coins found')

  const prompt = `Generate a featured article entry for the homepage based on this trending cryptocurrency:

Name: ${topCoin.name}
Symbol: ${topCoin.symbol}
Price: $${topCoin.price}
24h Change: ${topCoin.percent_change_24h}%
Galaxy Score: ${topCoin.galaxy_score}
Social Volume: ${topCoin.social_volume}

Requirements:
- Title should be compelling and SEO-optimized
- Excerpt should be 2-3 sentences summarizing the key trend
- Category should be "Bitcoin" if BTC, "Ethereum" if ETH, otherwise "Altcoins"
- Date should be today: ${formatDate(new Date().toISOString())}
- Slug should be URL-friendly version of title starting with /
- Include a realistic image path
`

  const schema = {
    title: "string",
    excerpt: "string",
    category: "string",
    categorySlug: "string",
    date: "string",
    slug: "string",
    imageUrl: "string"
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
        title: "string",
        excerpt: "string",
        category: "string",
        categorySlug: "string",
        date: "string",
        slug: "string",
        imageUrl: "string"
      }
    ]
  }

  return await generateContentWithClaude(prompt, schema)
}

// Generate stock news section
async function generateStockNewsSection(rssItems) {
  const topStories = rssItems.slice(0, 8).map((item, i) =>
    `${i + 1}. ${item.title} (${item.pubDate})`
  ).join('\n')

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
      title: "string",
      category: "string",
      categorySlug: "string",
      date: "string",
      slug: "string",
      imageUrl: "string"
    },
    items: [
      {
        title: "string",
        date: "string",
        slug: "string",
        imageUrl: "string"
      }
    ]
  }

  return await generateContentWithClaude(prompt, schema)
}

// Generate AI news section
async function generateAINewsSection(rssItems) {
  const topStories = rssItems.slice(0, 8).map((item, i) =>
    `${i + 1}. ${item.title} (${item.pubDate})`
  ).join('\n')

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
      title: "string",
      category: "string",
      categorySlug: "string",
      date: "string",
      slug: "string",
      imageUrl: "string"
    },
    items: [
      {
        title: "string",
        category: "string",
        categorySlug: "string",
        slug: "string",
        imageUrl: "string"
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
      results.ticker = { success: true, coins: tickerData.length }
      console.log('✅ Ticker data updated')
    } catch (error) {
      console.error('❌ Ticker update failed:', error.message)
      results.errors.push({ section: 'ticker', error: error.message })
    }

    // Fetch trending crypto topics for content generation
    console.log('📈 Fetching trending crypto topics...')
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
