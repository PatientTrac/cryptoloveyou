import Handlebars from 'handlebars'
import { marked } from 'marked'
import { readFile, writeFile, mkdir, access } from 'fs/promises'
import { constants as fsConstants } from 'fs'
import { join } from 'path'
import { loadChromeFromIndexHtml } from './index-chrome-from-index.js'
import { fetchArticleMarkdownFromClaude, useClaudeArticleBodies } from './claude-article-body.js'

/**
 * Turn homepage JSON slug (/foo/ or foo) into a single filesystem directory name.
 */
export function slugDirFromHomepagePath(slug) {
  const raw = String(slug || '').trim().replace(/^\/+/, '')
  const first = raw.split('/').filter(Boolean)[0] || ''
  return first.replace(/[^a-zA-Z0-9-]/g, '').replace(/^-+|-+$/g, '') || ''
}

function getCategoryLabel(category) {
  if (!category) return 'Crypto News'
  const c = String(category)
  if (c === 'stock-news') return 'Stock News'
  if (c === 'ai-news') return 'AI News'
  if (c.includes('bitcoin')) return 'Bitcoin'
  if (c.includes('ethereum')) return 'Ethereum'
  if (c.includes('defi')) return 'DeFi'
  if (c.includes('blockchain')) return 'Blockchain'
  if (c.includes('altcoin')) return 'Altcoins'
  return 'Crypto News'
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Breadcrumb inner HTML (matches SmartMag `nav.breadcrumbs` markup). */
function buildBreadcrumbInnerHtml(title, categorySlug) {
  const items = [{ href: '/', label: 'Home' }]
  const cs = String(categorySlug || 'trending').toLowerCase()

  if (cs === 'stock-news') items.push({ href: '/category/stock-news/', label: 'Stock News' })
  else if (cs === 'ai-news') items.push({ href: '/category/ai-news/', label: 'AI News' })
  else if (cs.includes('bitcoin')) {
    items.push({ href: '/category/crypto-news/', label: 'Crypto News' })
    items.push({ href: '/category/crypto-news/bitcoin/', label: 'Bitcoin' })
  } else if (cs.includes('ethereum')) {
    items.push({ href: '/category/crypto-news/', label: 'Crypto News' })
    items.push({ href: '/category/crypto-news/ethereum/', label: 'Ethereum' })
  } else if (cs.includes('defi')) {
    items.push({ href: '/category/crypto-news/', label: 'Crypto News' })
    items.push({ href: '/category/crypto-news/defi/', label: 'DeFi' })
  } else if (cs.includes('blockchain')) {
    items.push({ href: '/category/crypto-news/', label: 'Crypto News' })
    items.push({ href: '/category/crypto-news/blockchain/', label: 'Blockchain' })
  } else if (cs.includes('altcoin')) {
    items.push({ href: '/category/crypto-news/', label: 'Crypto News' })
    items.push({ href: '/category/crypto-news/altcoins/', label: 'Altcoins' })
  } else items.push({ href: '/category/crypto-news/', label: 'Crypto News' })

  items.push({ current: true, label: title })

  const parts = []
  for (let i = 0; i < items.length; i++) {
    const c = items[i]
    if (i > 0) parts.push('<span class="delim">»</span>')
    if (c.current) parts.push(`<span class="current">${escapeHtml(c.label)}</span>`)
    else parts.push(`<span><a href="${escapeHtml(c.href)}"><span>${escapeHtml(c.label)}</span></a></span>`)
  }
  return parts.join('')
}

/** WordPress-style body classes / article category-* / post-cat-* (aligned with static exports). */
function getWpTaxonomyMeta(categorySlug) {
  const cs = String(categorySlug || 'trending').toLowerCase()
  if (cs === 'stock-news') {
    return {
      termClass: 'term-color-141',
      wpCategoryClass: 'category-stock-news',
      postCatId: '141',
      leafHref: '/category/stock-news/'
    }
  }
  if (cs === 'ai-news') {
    return {
      termClass: 'term-color-110',
      wpCategoryClass: 'category-ai-news',
      postCatId: '110',
      leafHref: '/category/ai-news/'
    }
  }
  if (cs.includes('bitcoin')) {
    return {
      termClass: 'term-color-136',
      wpCategoryClass: 'category-bitcoin',
      postCatId: '136',
      leafHref: '/category/crypto-news/bitcoin/'
    }
  }
  if (cs.includes('ethereum')) {
    return {
      termClass: 'term-color-137',
      wpCategoryClass: 'category-ethereum',
      postCatId: '137',
      leafHref: '/category/crypto-news/ethereum/'
    }
  }
  if (cs.includes('defi')) {
    return {
      termClass: 'term-color-140',
      wpCategoryClass: 'category-defi',
      postCatId: '140',
      leafHref: '/category/crypto-news/defi/'
    }
  }
  if (cs.includes('blockchain')) {
    return {
      termClass: 'term-color-139',
      wpCategoryClass: 'category-blockchain',
      postCatId: '139',
      leafHref: '/category/crypto-news/blockchain/'
    }
  }
  if (cs.includes('altcoin')) {
    return {
      termClass: 'term-color-138',
      wpCategoryClass: 'category-altcoins',
      postCatId: '138',
      leafHref: '/category/crypto-news/altcoins/'
    }
  }
  return {
    termClass: 'term-color-142',
    wpCategoryClass: 'category-crypto-news',
    postCatId: '142',
    leafHref: '/category/crypto-news/'
  }
}

function wpNumericPostIdFromSlug(slugDir) {
  let h = 0
  for (let i = 0; i < slugDir.length; i++) h = (h * 31 + slugDir.charCodeAt(i)) >>> 0
  return 8000000 + (h % 900000)
}

function wpPublishedAtAttr(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00')
  return d.toISOString().replace(/\.\d{3}Z$/, '+00:00')
}

function pinterestMediaPathEncoded(imageUrl) {
  const abs = absoluteMediaUrl(imageUrl)
  try {
    return encodeURIComponent(new URL(abs).pathname)
  } catch {
    return encodeURIComponent(abs)
  }
}

function formatPublishedDate(isoDate) {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function calculateReadTime(content) {
  const wordsPerMinute = 200
  const wordCount = String(content || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
  return Math.max(2, Math.ceil(wordCount / wordsPerMinute))
}

function siteOrigin() {
  return String(process.env.SITE_ORIGIN || 'https://cryptoloveyou.com').replace(/\/$/, '')
}

/** Absolute URL for Open Graph / schema (paths relative to site root). */
function absoluteMediaUrl(u) {
  const origin = siteOrigin()
  if (!u) return `${origin}/og-image.jpg`
  const s = String(u).trim()
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  return `${origin}${s.startsWith('/') ? s : `/${s}`}`
}

/** Path-only URL for `data-bgsrc` / lazy backgrounds (matches WP export pattern). */
function imagePathForLazyBg(u) {
  const abs = absoluteMediaUrl(u)
  try {
    return new URL(abs).pathname
  } catch {
    const s = String(u || '').trim()
    if (!s) return '/og-image.jpg'
    return s.startsWith('/') ? s : `/${s}`
  }
}

function relatedDateFields(displayDate, fallbackIso) {
  const fb = fallbackIso || new Date().toISOString()
  const d = displayDate != null && String(displayDate).trim() !== '' ? String(displayDate).trim() : ''
  if (d) {
    const p = new Date(d)
    if (!Number.isNaN(p.getTime())) {
      return { dateAttr: wpPublishedAtAttr(p.toISOString()), dateLabel: d }
    }
  }
  return { dateAttr: wpPublishedAtAttr(fb), dateLabel: formatPublishedDate(fb) }
}

/** Format CoinGecko-backed trending list for Claude article prompts. */
export function formatTrendingCoinsForArticleContext(coins) {
  if (!Array.isArray(coins) || coins.length === 0) return ''
  return coins
    .slice(0, 12)
    .map((c, i) => {
      const name = c.name || ''
      const sym = c.symbol || ''
      const price = c.price ?? c.price_usd ?? ''
      const ch = c.percent_change_24h ?? c.change_24h ?? ''
      const rank = c.market_cap_rank != null ? `#${c.market_cap_rank}` : ''
      const tr = c.coingecko_trend_score != null ? String(c.coingecko_trend_score) : ''
      const mc = c.coingecko_market_cap_usd
      const vol = c.coingecko_volume_24h_usd
      const mcStr =
        mc != null && Number.isFinite(Number(mc)) ? `, mcap_usd: ${Math.round(Number(mc))}` : ''
      const volStr =
        vol != null && Number.isFinite(Number(vol)) ? `, vol_24h_usd: ${Math.round(Number(vol))}` : ''
      const rankStr = rank ? `, rank: ${rank}` : ''
      const trStr = tr !== '' ? `, cg_trend_score: ${tr}` : ''
      return `${i + 1}. ${name} (${sym}) — USD ~$${price}, 24h %: ${ch}${rankStr}${trStr}${mcStr}${volStr}`
    })
    .join('\n')
}

async function resolveArticleMarkdown(entry) {
  if (!useClaudeArticleBodies()) return buildMarkdownBody(entry)
  try {
    const md = await fetchArticleMarkdownFromClaude({
      title: entry.title,
      excerpt: entry.excerpt,
      categorySlug: entry.categorySlug,
      slug: entry.slug,
      extraContext: entry.extraContext || ''
    })
    const delayMs = Math.max(0, parseInt(process.env.HOMEPAGE_CLAUDE_ARTICLE_DELAY_MS || '350', 10) || 0)
    if (delayMs) await new Promise(r => setTimeout(r, delayMs))
    return md
  } catch (e) {
    console.warn(`[writeHomepageLinkedArticle] Claude body failed, stub used: ${e.message}`)
    return buildMarkdownBody(entry)
  }
}

function buildMarkdownBody({ title, excerpt }) {
  const intro = excerpt || title
  return [
    intro,
    '',
    '## Overview',
    '',
    'This article was published from the Crypto Love You homepage update. Cryptocurrency and equity markets involve substantial risk; past performance does not guarantee future results.',
    '',
    '## Explore more',
    '',
    '- Return to the [homepage](/) for the latest headlines and analysis.',
    ''
  ].join('\n')
}

/** Header, footer, shared head assets, and trail are sliced from `index.html` (see `INDEX_CHROME_MARKERS` in index-chrome-from-index.js). */
async function loadHomepageChromeSnippets() {
  return loadChromeFromIndexHtml()
}

let _helpersRegistered = false
function registerTemplateHelpers() {
  if (_helpersRegistered) return
  _helpersRegistered = true
  Handlebars.registerHelper('eq', (a, b) => a === b)
  Handlebars.registerHelper('join', (arr, sep) => {
    if (!Array.isArray(arr)) return ''
    return arr.join(typeof sep === 'string' ? sep : ', ')
  })
}

/**
 * Collect unique homepage-linked rows (slug + copy for static page).
 */
export function collectHomepageArticleSpecs(featured, latestNews, stockNews, aiNews) {
  const rows = []
  const push = row => {
    if (!row || !row.title) return
    const dir = slugDirFromHomepagePath(row.slug)
    if (!dir) return
    rows.push({
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt || row.summary || row.title,
      categorySlug: row.categorySlug || 'trending',
      imageUrl: row.imageUrl || '',
      displayDate: row.date || row.publishedAt || row.publishedDate || ''
    })
  }

  if (featured) push(featured)
  latestNews?.items?.forEach(push)
  if (stockNews?.featured) push(stockNews.featured)
  stockNews?.items?.forEach(push)
  if (aiNews?.featured) push(aiNews.featured)
  aiNews?.items?.forEach(push)

  const seen = new Set()
  return rows.filter(r => {
    const d = slugDirFromHomepagePath(r.slug)
    if (seen.has(d)) return false
    seen.add(d)
    return true
  })
}

/**
 * Other homepage-linked articles for the SmartMag "Related Posts" grid (excludes current slug).
 */
export function pickRelatedHomepagePosts(allSpecs, currentSlugDir, limit = 4, dateFallbackIso) {
  const cur = String(currentSlugDir || '').trim()
  const fb = dateFallbackIso || new Date().toISOString()
  const out = []
  if (!Array.isArray(allSpecs)) return out
  for (const s of allSpecs) {
    const d = slugDirFromHomepagePath(s.slug)
    if (!d || d === cur) continue
    const path = imagePathForLazyBg(s.imageUrl)
    const title = String(s.title || '').trim() || d
    const href = `/${d}/`
    const { dateAttr, dateLabel } = relatedDateFields(s.displayDate, fb)
    out.push({
      href,
      title,
      imgAriaLabel: title.slice(0, 160),
      thumbSrc: path,
      thumbSrcset: `${path} 450w, ${path} 1024w`,
      dateAttr,
      dateLabel
    })
    if (out.length >= limit) break
  }
  return out
}

/**
 * Write `{slug}/index.html` using `article-home-chrome.hbs` (header/footer/head/trail sliced from `index.html` + article body).
 * Skips if the file already exists unless `force` is true.
 */
export async function writeHomepageLinkedArticle(entry, options = {}) {
  const { force = false, trendingCoins = null, relatedPosts = null, sidebarLatestPosts = null } = options
  const slugDir = slugDirFromHomepagePath(entry.slug)
  if (!slugDir || slugDir.length < 3) {
    throw new Error(`Invalid slug for article: ${entry.slug}`)
  }

  const indexPath = join(process.cwd(), slugDir, 'index.html')
  if (!force) {
    try {
      await access(indexPath, fsConstants.F_OK)
      return { slug: slugDir, path: indexPath, skipped: true }
    } catch {
      /* write */
    }
  }

  registerTemplateHelpers()
  const chrome = await loadHomepageChromeSnippets()
  const templatePath = join(process.cwd(), 'templates', 'article-home-chrome.hbs')
  const templateSource = await readFile(templatePath, 'utf-8')
  const template = Handlebars.compile(templateSource)

  const snapshot = formatTrendingCoinsForArticleContext(trendingCoins)
  const mergedEntry = {
    ...entry,
    extraContext: [snapshot && `CoinGecko trending / market snapshot:\n${snapshot}`, entry.extraContext]
      .filter(Boolean)
      .join('\n\n')
  }

  const publishedAtIso = new Date().toISOString()
  const md = await resolveArticleMarkdown(mergedEntry)
  const category = entry.categorySlug || 'trending'
  const origin = siteOrigin()
  const ogImageAbs = absoluteMediaUrl(entry.imageUrl)
  const coverImageUrl = absoluteMediaUrl(entry.imageUrl)
  const tax = getWpTaxonomyMeta(category)
  const wpPostId = wpNumericPostIdFromSlug(slugDir)
  const rt = calculateReadTime(md)
  const readTimeLabel = rt === 1 ? '1 Min Read' : `${rt} Mins Read`
  const publishedAtAttr = wpPublishedAtAttr(publishedAtIso)
  const related = Array.isArray(relatedPosts) ? relatedPosts : []
  const sidebar = Array.isArray(sidebarLatestPosts) ? sidebarLatestPosts : []

  const templateData = {
    siteOrigin: origin,
    ogImageAbs,
    coverImageUrl,
    slug: slugDir,
    title: entry.title,
    metaTitle: `${entry.title} | Crypto Love You`,
    metaDescription: String(entry.excerpt || entry.title).slice(0, 160),
    summary: String(entry.excerpt || entry.title).slice(0, 280),
    featuredImage: entry.imageUrl || undefined,
    category,
    categoryLabel: getCategoryLabel(category),
    categoryHref: tax.leafHref,
    categoryTermClass: tax.termClass,
    wpCategoryClass: tax.wpCategoryClass,
    postCatId: tax.postCatId,
    wpPostId,
    breadcrumbInnerHtml: buildBreadcrumbInnerHtml(entry.title, category),
    pinterestMediaEnc: pinterestMediaPathEncoded(entry.imageUrl),
    publishedAt: publishedAtIso,
    publishedAtAttr,
    publishedDate: formatPublishedDate(publishedAtIso),
    readTime: rt,
    readTimeLabel,
    encodedTitle: encodeURIComponent(entry.title),
    affiliateLinks: [],
    currentYear: new Date().getFullYear(),
    content_type: useClaudeArticleBodies() ? 'homepage_claude_article' : 'homepage_brief',
    sections: {},
    cta: {},
    ctas: [],
    internal_links: ['/'],
    lastUpdated: formatPublishedDate(publishedAtIso),
    coin: null,
    tags: ['homepage'],
    platform: null,
    comparison_table: null,
    faqs: [],
    htmlContent: marked.parse(md),
    relatedPosts: related,
    hasRelatedPosts: related.length > 0,
    sidebarLatestPosts: sidebar,
    hasSidebarLatest: sidebar.length > 0,
    ...chrome
  }

  const html = template(templateData)
  await mkdir(join(process.cwd(), slugDir), { recursive: true })
  await writeFile(indexPath, html, 'utf-8')
  return { slug: slugDir, path: indexPath, skipped: false }
}
