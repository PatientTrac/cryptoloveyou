import 'dotenv/config'
import Handlebars from 'handlebars'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

function requireEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

function slugify(input) {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function fmtPct(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return 'N/A'
  const x = Number(n)
  const s = x > 0 ? `+${x.toFixed(2)}` : x.toFixed(2)
  return s
}

async function fetchTopTrendingCoin() {
  const apiKey = requireEnv('LUNARCRUSH_API_KEY')
  const url = `https://lunarcrush.com/api4/public/coins/list?key=${encodeURIComponent(apiKey)}&limit=1&sort=galaxy_score&desc=true`

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`LunarCrush error ${res.status}: ${t || res.statusText}`)
  }

  const json = await res.json()
  const coin = json?.data?.[0]
  if (!coin) throw new Error('Unexpected LunarCrush response: missing data[0]')
  return coin
}

function buildStructuredSeoArticle({ coin, now }) {
  const month = now.toLocaleString('en-US', { month: 'long' })
  const year = now.getFullYear()
  const day = now.getDate()

  const slug = `${slugify(coin.symbol)}-trending-${month.toLowerCase()}-${year}`
  const title = `Why ${coin.name} (${coin.symbol}) Is Trending Today`

  const summary = `A data-backed look at why ${coin.name} is gaining attention right now, based on LunarCrush social and market signals.`

  const galaxy = coin.galaxy_score ?? 'N/A'
  const socialVol = coin.social_volume ?? 'N/A'
  const change24h = fmtPct(coin.percent_change_24h)
  const rank = coin.market_cap_rank ?? 'N/A'

  return {
    title,
    slug,
    summary,
    content_type: 'seo_article',
    sections: {
      intro: `${coin.name} (${coin.symbol}) is showing strong attention today across social and market channels. This breakdown summarizes the signals behind the move and what to watch next.`,
      trend_analysis: `LunarCrush currently ranks ${coin.symbol} with a Galaxy Score of ${galaxy} and social volume of ${socialVol}. Combined with a 24h price change of ${change24h}%, these inputs suggest elevated interest versus typical daily baselines. These signals often reflect a mix of news catalysts, community activity, and trader attention rather than fundamentals alone.`,
      market_sentiment: `When social volume rises while the asset remains highly ranked (market cap rank #${rank}), it can indicate that both retail attention and broader market awareness are present. That said, social-driven moves can reverse quickly if momentum fades. Treat trend signals as a “what is changing” indicator—not as a guarantee of future returns.`,
      risks: `Trend-driven markets can be volatile. Key risks include sharp pullbacks, liquidity-driven wicks, and headline reversals. If you’re considering exposure, define risk limits, avoid over-sizing, and prefer safer custody practices (e.g., hardware wallets) for long-term holdings.`,
      conclusion: `${coin.symbol} is trending because multiple attention signals are elevated at the same time. If you want to explore it further, focus on risk management and avoid treating social momentum as investment advice.`
    },
    cta: {
      platform: 'binance',
      text: `Explore ${coin.symbol} on Binance`
    },
    internal_links: [
      '/best-crypto-yield-platforms',
      '/best-crypto-exchanges-2026',
      '/best-crypto-wallets-2026'
    ],
    metaTitle: `Why ${coin.name} Is Trending Today (${year}) — Data + Analysis`,
    metaDescription: `Why ${coin.name} (${coin.symbol}) is trending today: Galaxy Score ${galaxy}, social volume ${socialVol}, 24h ${change24h}%. Data-backed context + risks.`,
    lastUpdated: `${month} ${day}, ${year}`,
    coin: {
      name: coin.name,
      symbol: coin.symbol,
      galaxy_score: galaxy,
      social_volume: socialVol,
      percent_change_24h: change24h,
      market_cap_rank: rank
    }
  }
}

async function main() {
  const now = new Date()
  const coin = await fetchTopTrendingCoin()

  const article = buildStructuredSeoArticle({ coin, now })

  const templatePath = join(process.cwd(), 'templates', 'seo-article.hbs')
  const templateSource = await readFile(templatePath, 'utf8')
  const template = Handlebars.compile(templateSource)

  const html = template(article)

  const outDir = join(process.cwd(), 'drafts', article.slug)
  await mkdir(outDir, { recursive: true })

  await writeFile(join(outDir, 'article.json'), JSON.stringify(article, null, 2), 'utf8')
  await writeFile(join(outDir, 'index.html'), html, 'utf8')

  console.log('Draft generated:')
  console.log(`- slug: ${article.slug}`)
  console.log(`- files: ${join('drafts', article.slug, 'index.html')} and article.json`)
}

main().catch((err) => {
  console.error('Failed to generate draft:', err.message)
  process.exit(1)
})

