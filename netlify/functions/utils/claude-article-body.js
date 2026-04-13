/**
 * Long-form article body (Markdown) via Claude — used for static /slug/ pages from the homepage pipeline.
 */

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

function siteOrigin() {
  return String(process.env.SITE_ORIGIN || 'https://cryptoloveyou.com').replace(/\/$/, '')
}

/**
 * @param {{ title: string, excerpt: string, categorySlug?: string, slug: string, extraContext?: string }} input
 * @returns {Promise<string>} Markdown body (no front matter)
 */
export async function fetchArticleMarkdownFromClaude(input) {
  const apiKey = requireEnv('ANTHROPIC_API_KEY')
  const title = String(input.title || '').trim()
  const excerpt = String(input.excerpt || '').trim()
  const category = String(input.categorySlug || 'crypto-news').trim()
  const slug = String(input.slug || '').trim()
  const extra = String(input.extraContext || '').trim()

  const prompt = `You are a financial technology editor for Crypto Love You. Write a complete, original news/analysis article in Markdown.

Topic title: ${title}
Brief angle (from homepage): ${excerpt}
Site category path: ${category}
Article URL path on site: ${slug}
${extra ? `\n--- Context (use facts below where they support the story; do not invent numbers not shown) ---\n${extra}\n` : ''}

Requirements:
- Length: roughly 900–1400 words of substantive prose (not bullet padding).
- Use Markdown only: start with a short lede paragraph, then use ## for 3–5 section headings (e.g. market context, risks, outlook).
- Tone: informative, neutral; no invented quotes, interviews, or fake expert names.
- Include a short "Risk disclosure" ## section stating that crypto and equities involve risk and this is not financial advice.
- End with ## Explore more linking to the homepage: [Crypto Love You homepage](${siteOrigin()}/).
- Do NOT repeat the title as an H1 (the page template already shows the title).
- Do NOT wrap the output in code fences.
- No YAML front matter.`

  const body = {
    model: process.env.ANTHROPIC_ARTICLE_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: Math.min(parseInt(process.env.ANTHROPIC_ARTICLE_MAX_TOKENS || '6000', 10) || 6000, 8192),
    temperature: 0.55,
    messages: [{ role: 'user', content: prompt }]
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
    throw new Error(`Claude article API error ${res.status}: ${text || res.statusText}`)
  }

  const json = await res.json()
  const text = json?.content?.[0]?.text
  if (!text || typeof text !== 'string') throw new Error('Claude article response missing text')
  return text.trim()
}

export function useClaudeArticleBodies() {
  return String(process.env.HOMEPAGE_CLAUDE_ARTICLES || 'true').toLowerCase() !== 'false'
}
