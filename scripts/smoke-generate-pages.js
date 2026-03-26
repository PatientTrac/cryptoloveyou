import { handler as generateArticle } from '../netlify/functions/generate-article.js'
import { handler as sitemap } from '../netlify/functions/generate-sitemap.js'
import { handler as trackAffiliate } from '../netlify/functions/track-affiliate-click.js'

function requireEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

async function postGenerate(article) {
  const res = await generateArticle({
    httpMethod: 'POST',
    body: JSON.stringify({
      apiKey: requireEnv('ARTICLE_GENERATION_API_KEY'),
      article
    })
  })
  return { statusCode: res.statusCode, body: safeJson(res.body) }
}

async function main() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const stamp = `${yyyy}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const seo = await postGenerate({
    content_type: 'seo_article',
    slug: `smoke-seo-${stamp}`,
    title: `Smoke Test SEO Article (${stamp})`,
    summary: 'Smoke test seo_article rendering.',
    meta_title: `Smoke Test SEO Article (${stamp})`,
    meta_description: 'Smoke test seo_article rendering.',
    tags: ['smoke', 'seo_article'],
    internal_links: ['/best-crypto-yield-platforms'],
    ctas: [{ type: 'primary', platform: 'binance', text: 'Explore Binance', placement: 'footer' }],
    sections: {
      intro: 'This is a smoke test intro.',
      body: 'This is a smoke test body.',
      conclusion: 'This is a smoke test conclusion.'
    }
  })

  const review = await postGenerate({
    content_type: 'review_page',
    slug: `smoke-review-${stamp}`,
    title: `Smoke Test Review Page (${stamp})`,
    summary: 'Smoke test review_page rendering.',
    meta_title: `Smoke Test Review Page (${stamp})`,
    meta_description: 'Smoke test review_page rendering.',
    tags: ['smoke', 'review_page'],
    internal_links: ['/best-crypto-yield-platforms'],
    platform: { key: 'ledger', name: 'Ledger' },
    ctas: [{ type: 'primary', platform: 'ledger', text: 'Buy a Ledger wallet', placement: 'hero' }],
    sections: {
      what_it_is: 'Ledger is a hardware wallet used to secure crypto assets.',
      key_features: ['Hardware isolation', 'Wide asset support', 'Recovery phrase security'],
      how_to: ['Buy from official store', 'Initialize device offline', 'Back up seed phrase'],
      risks: ['Phishing attempts', 'Seed phrase loss'],
      trust_factors: ['Offline key storage', 'Widely used brand'],
      alternatives: [{ name: 'Trezor', href: '/reviews/trezor/' }],
      conclusion: 'For most users, a hardware wallet is a strong baseline for security.'
    }
  })

  const money = await postGenerate({
    content_type: 'money_page',
    slug: `smoke-money-${stamp}`,
    title: `Smoke Test Money Page (${stamp})`,
    summary: 'Smoke test money_page rendering.',
    meta_title: `Smoke Test Money Page (${stamp})`,
    meta_description: 'Smoke test money_page rendering.',
    tags: ['smoke', 'money_page'],
    internal_links: ['/best-crypto-exchanges-2026'],
    ctas: [{ type: 'primary', platform: 'binance', text: 'Compare platforms', placement: 'hero' }],
    sections: {
      intro: 'This page compares a few options at a high level.',
      safety_checklist: ['Understand custody', 'Check supported regions', 'Use a hardware wallet for long-term storage'],
      risk_analysis: 'Platforms differ by custody, product risk, and jurisdiction. Treat variable rates as “varies”.',
      final_recommendation: 'Start with a reputable exchange and move long-term holdings to a hardware wallet.'
    },
    comparison_table: {
      columns: ['Platform', 'Best_for', 'Notes'],
      rows: [
        { platform: 'binance', cells: { Platform: 'Binance', Best_for: 'Liquidity', Notes: 'Varies by region' }, cta: { platform: 'binance', text: 'Open Binance', placement: 'table' } },
        { platform: 'coinbase', cells: { Platform: 'Coinbase', Best_for: 'Beginners', Notes: 'Simple UX' }, cta: { platform: 'coinbase', text: 'Open Coinbase', placement: 'table' } },
        { platform: 'kraken', cells: { Platform: 'Kraken', Best_for: 'Security-minded', Notes: 'Strong reputation' }, cta: { platform: 'kraken', text: 'Open Kraken', placement: 'table' } }
      ]
    },
    faqs: [
      { q: 'Is yield guaranteed?', a: 'No. Rates can change and losses are possible.' },
      { q: 'What is the safest default?', a: 'Keep it simple: reputable exchange + hardware wallet for storage.' },
      { q: 'Should I chase high returns?', a: 'Avoid returns you don’t understand; prioritize risk management.' }
    ]
  })

  console.log('generate-article results:')
  console.log({ seo, review, money })

  const site = await sitemap({ httpMethod: 'GET' })
  console.log('sitemap.xml status:', site.statusCode, 'bytes:', String(site.body || '').length)

  const click = await trackAffiliate({
    httpMethod: 'GET',
    headers: { 'user-agent': 'smoke-test' },
    queryStringParameters: { platform: 'binance', article: `smoke-seo-${stamp}` }
  })
  console.log('track-affiliate-click status:', click.statusCode, 'Location:', click.headers?.Location || click.headers?.location)
}

function safeJson(s) {
  try {
    return JSON.parse(s || '{}')
  } catch {
    return { raw: s }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

