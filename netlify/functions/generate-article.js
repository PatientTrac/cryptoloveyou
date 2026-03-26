import Handlebars from 'handlebars'
import { marked } from 'marked'
import simpleGit from 'simple-git'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { assertValidDirectPayload, normalizeContentType, CONTENT_TYPES, validateStructuredArticle } from './utils/content-types.js'
import { getRegistryPlatform } from './utils/affiliate-registry.js'
import { getSupabaseClient } from './utils/supabase.js'

/**
 * Netlify Function: Generate static HTML article from AI content
 *
 * This function:
 * 1. Fetches article data from Supabase (by ID or slug)
 * 2. Converts markdown content to HTML
 * 3. Renders article using Handlebars template
 * 4. Creates /{slug}/index.html file
 * 5. Commits and pushes to git
 * 6. Updates article status to 'published'
 * 7. Triggers Netlify rebuild
 */
export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  try {
    const body = JSON.parse(event.body || '{}')
    const { articleId, slug, apiKey, article: directArticle } = body

    // Simple API key authentication
    if (!apiKey || apiKey !== process.env.ARTICLE_GENERATION_API_KEY) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized: Invalid API key' })
      }
    }

    if (!directArticle && !articleId && !slug) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'article, articleId, or slug is required' })
      }
    }

    const supabaseArticlesEnabled = String(process.env.ENABLE_SUPABASE_ARTICLES || '').toLowerCase() === 'true'
    if (!directArticle && !supabaseArticlesEnabled) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Supabase article mode is disabled. Provide a direct `article` payload instead.',
          hint: 'Set ENABLE_SUPABASE_ARTICLES=true to re-enable articleId/slug publishing.'
        })
      }
    }

    const article = directArticle ? normalizeDirectArticle(directArticle) : await fetchArticle(articleId, slug)

    if (!article) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Article not found' })
      }
    }

    console.log(`Processing article: ${article.title} (${article.slug})`)

    // Validate structured payloads (Supabase mode + direct mode)
    // - Direct mode is validated earlier in normalizeDirectArticle()
    // - Supabase mode: validate when content_type is one of our supported types
    const maybeType = normalizeContentType(article.content_type || article.contentType)
    const supabaseStructuredErrors = validateStructuredArticle({ ...article, content_type: maybeType })
    if (supabaseStructuredErrors.length && !article.content) {
      throw new Error(`Supabase article missing required structured fields: ${supabaseStructuredErrors.join('; ')}`)
    }

    registerTemplateHelpers()

    // Load and compile Handlebars template
    console.log('Loading template...')
    const templatePath = join(process.cwd(), 'templates', selectTemplateFile(article.content_type))
    const templateSource = await readFile(templatePath, 'utf-8')
    const template = Handlebars.compile(templateSource)

    // Prepare template data
    const publishedAtIso = article.published_at || new Date().toISOString()
    const internalLinks = normalizeInternalLinks(article)
    const ctas = await normalizeCtas(article)
    const templateData = {
      slug: article.slug,
      title: article.title,
      metaTitle: article.meta_title || article.metaTitle || `${article.title} - Crypto Love You`,
      metaDescription: article.meta_description || article.metaDescription || article.summary,
      summary: article.summary,
      featuredImage: article.featured_image_url || article.featuredImage,
      category: article.category,
      categoryLabel: getCategoryLabel(article.category),
      publishedAt: publishedAtIso,
      publishedDate: formatDate(publishedAtIso),
      readTime: article.content ? calculateReadTime(article.content) : 5,
      encodedTitle: encodeURIComponent(article.title),
      affiliateLinks: article.affiliate_links || article.affiliateLinks || [],
      currentYear: new Date().getFullYear(),
      content_type: normalizeContentType(article.content_type || article.contentType),
      sections: article.sections || {},
      cta: article.cta || {},
      ctas,
      internal_links: internalLinks,
      lastUpdated: article.lastUpdated || formatDate(publishedAtIso),
      coin: article.coin || null,
      tags: Array.isArray(article.tags) ? article.tags : [],
      platform: article.platform || null,
      comparison_table: article.comparison_table || null,
      faqs: Array.isArray(article.faqs) ? article.faqs : []
    }

    // Convert markdown to HTML (only when article.content exists)
    if (article.content) {
      console.log('Converting markdown to HTML...')
      templateData.htmlContent = marked.parse(article.content)
    } else {
      templateData.htmlContent = ''
    }

    // Render HTML
    console.log('Rendering HTML...')
    const renderedHTML = template(templateData)

    // Create article directory and write HTML file
    const articlePath = join(process.cwd(), article.slug)
    await mkdir(articlePath, { recursive: true })

    const indexPath = join(articlePath, 'index.html')
    await writeFile(indexPath, renderedHTML, 'utf-8')
    console.log(`Article written to: ${indexPath}`)

    // Git commit and push
    const shouldCommit = String(process.env.SKIP_GIT_COMMIT || '').toLowerCase() !== 'true'
    const shouldPush = String(process.env.SKIP_GIT_PUSH || '').toLowerCase() !== 'true'

    if (shouldCommit) {
      console.log('Committing to git...')
      const git = simpleGit(process.cwd())
      await git.add(`./${article.slug}/index.html`)
      await git.commit(`Add AI-generated article: ${article.title}`)
    } else {
      console.log('Skipping git commit (SKIP_GIT_COMMIT=true)')
    }

    if (shouldCommit && shouldPush) {
      console.log('Pushing to git...')
      const git = simpleGit(process.cwd())
      await git.push('origin', 'HEAD')
      console.log('Pushed to git successfully')
    } else if (shouldCommit && !shouldPush) {
      console.log('Skipping git push (SKIP_GIT_PUSH=true)')
    }

    // Update article status to 'published' (only when Supabase article mode is enabled)
    if (supabaseArticlesEnabled && article.id) {
      console.log('Updating article status...')
      await updateArticleStatus(article.id, 'published', new Date().toISOString())
    }

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Article generated and published successfully',
        article: {
          id: article.id || null,
          slug: article.slug,
          title: article.title,
          url: `/${article.slug}/`,
          publishedAt: new Date().toISOString()
        },
        git: {
          committed: shouldCommit,
          pushed: shouldCommit && shouldPush
        }
      })
    }

  } catch (error) {
    console.error('Article generation error:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate article',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

function selectTemplateFile(contentType) {
  const ct = normalizeContentType(contentType)
  if (ct === CONTENT_TYPES.SEO_ARTICLE) return 'seo-article.hbs'
  if (ct === CONTENT_TYPES.REVIEW_PAGE) return 'review-page.hbs'
  if (ct === CONTENT_TYPES.MONEY_PAGE) return 'money-page.hbs'
  return 'article.hbs'
}

function normalizeInternalLinks(article) {
  const raw =
    article?.internal_links ??
    article?.internalLinks ??
    []

  if (!Array.isArray(raw)) return []
  return raw.filter((x) => typeof x === 'string' && x.trim().length > 0)
}

function normalizeDirectArticle(article) {
  assertValidDirectPayload(article)

  const contentType = normalizeContentType(article.content_type || article.contentType)

  return {
    slug: article.slug,
    title: article.title,
    summary: article.summary || '',
    content_type: contentType,
    meta_title: article.meta_title || article.metaTitle || undefined,
    meta_description: article.meta_description || article.metaDescription || undefined,
    tags: Array.isArray(article.tags) ? article.tags : [],
    sections: article.sections || {},
    cta: article.cta || null,
    ctas: Array.isArray(article.ctas) ? article.ctas : [],
    internal_links: normalizeInternalLinks(article),
    platform: article.platform || null,
    comparison_table: article.comparison_table || null,
    faqs: Array.isArray(article.faqs) ? article.faqs : [],
    published_at: new Date().toISOString(),
    lastUpdated: article.lastUpdated || undefined,
    coin: article.coin || null
  }
}

/**
 * Fetch article from Supabase by ID or slug
 */
async function fetchArticle(articleId, slug) {
  const supabase = getSupabaseClient()

  let query = supabase
    .from('ai_articles')
    .select('*')

  if (articleId) {
    query = query.eq('id', articleId)
  } else {
    query = query.eq('slug', slug)
  }

  const { data, error } = await query.single()

  if (error) {
    console.error('Supabase error:', error)
    throw new Error(`Failed to fetch article: ${error.message}`)
  }

  return data
}

/**
 * Update article status after publishing
 */
async function updateArticleStatus(articleId, status, publishedAt) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('ai_articles')
    .update({
      status: status,
      published_at: publishedAt
    })
    .eq('id', articleId)

  if (error) {
    console.error('Failed to update article status:', error)
    throw error
  }
}

/**
 * Calculate estimated read time in minutes
 */
function calculateReadTime(content) {
  const wordsPerMinute = 200
  const wordCount = content.trim().split(/\s+/).length
  const readTime = Math.ceil(wordCount / wordsPerMinute)
  return readTime
}

/**
 * Format ISO date to readable format
 */
function formatDate(isoDate) {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

/**
 * Get human-readable category label
 */
function getCategoryLabel(category) {
  const labels = {
    'yield': 'Crypto Yield',
    'exchange-review': 'Exchange Reviews',
    'wallet-review': 'Wallet Reviews',
    'defi': 'DeFi',
    'trending': 'Trending',
    'nft': 'NFT',
    'bitcoin': 'Bitcoin',
    'ethereum': 'Ethereum',
    'altcoins': 'Altcoins'
  }
  return labels[category] || category
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

async function normalizeCtas(article) {
  const raw = Array.isArray(article.ctas) ? article.ctas : []
  if (raw.length) {
    return raw
      .filter((x) => x && typeof x === 'object')
      .map((x) => ({
        type: x.type === 'secondary' ? 'secondary' : 'primary',
        platform: String(x.platform || '').trim(),
        text: String(x.text || '').trim(),
        placement: String(x.placement || '').trim()
      }))
      .filter((x) => x.platform && x.text)
  }

  // Back-compat: if single cta exists, convert to ctas[]
  if (article.cta && typeof article.cta === 'object') {
    const p = String(article.cta.platform || '').trim()
    const t = String(article.cta.text || '').trim()
    if (p && t) return [{ type: 'primary', platform: p, text: t, placement: 'footer' }]
  }

  // Default based on content type (best-effort; never hard fail)
  const ct = normalizeContentType(article.content_type || article.contentType)
  if (ct === CONTENT_TYPES.REVIEW_PAGE && article.platform?.key) {
    const entry = await getRegistryPlatform(article.platform.key)
    if (entry?.default_cta) {
      return [{ type: 'primary', platform: article.platform.key, text: entry.default_cta, placement: 'hero' }]
    }
  }

  return []
}
