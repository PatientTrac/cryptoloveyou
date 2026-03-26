import { getSupabaseClient } from './utils/supabase.js'
import { readdir } from 'fs/promises'
import { join } from 'path'

/**
 * Netlify Function: Generate dynamic XML sitemap
 *
 * This function:
 * 1. Scans all existing static HTML directories
 * 2. Fetches all published AI articles from Supabase
 * 3. Generates XML sitemap including both old and new content
 * 4. Caches response for 1 hour
 * 5. Returns valid sitemap.xml
 */

// Simple in-memory cache
let sitemapCache = null
let cacheTimestamp = 0
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

export const handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600' // Browser cache for 1 hour
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Check cache
    const now = Date.now()
    if (sitemapCache && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('Returning cached sitemap')
      return {
        statusCode: 200,
        headers: {
          ...headers,
          'X-Cache': 'HIT'
        },
        body: sitemapCache
      }
    }

    console.log('Generating fresh sitemap...')

    // Get all URLs
    const staticUrls = await getStaticUrls()
    const aiArticleUrls = await getAIArticleUrlsIfEnabled()
    const allUrls = [...staticUrls, ...aiArticleUrls]

    console.log(`Found ${staticUrls.length} static pages and ${aiArticleUrls.length} AI articles`)

    // Generate sitemap XML
    const sitemap = generateSitemapXML(allUrls)

    // Update cache
    sitemapCache = sitemap
    cacheTimestamp = now

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'X-Cache': 'MISS',
        'X-Total-URLs': allUrls.length.toString()
      },
      body: sitemap
    }

  } catch (error) {
    console.error('Sitemap generation error:', error)

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to generate sitemap',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

/**
 * Get all static article URLs from filesystem
 */
async function getStaticUrls() {
  try {
    const baseUrl = process.env.URL || 'https://cryptoloveyou.com'
    const rootPath = process.cwd()

    const entries = await readdir(rootPath, { withFileTypes: true })

    const urls = []

    // Add homepage
    urls.push({
      loc: baseUrl,
      lastmod: new Date().toISOString().split('T')[0],
      changefreq: 'daily',
      priority: '1.0'
    })

    // Scan directories for index.html files
    for (const entry of entries) {
      if (entry.isDirectory() && !isExcludedDirectory(entry.name)) {
        try {
          const indexPath = join(rootPath, entry.name, 'index.html')
          const fs = await import('fs/promises')
          await fs.access(indexPath) // Check if index.html exists

          urls.push({
            loc: `${baseUrl}/${entry.name}/`,
            lastmod: new Date().toISOString().split('T')[0],
            changefreq: 'weekly',
            priority: '0.8'
          })
        } catch {
          // No index.html in this directory, skip
        }
      }
    }

    return urls
  } catch (error) {
    console.error('Error scanning static URLs:', error)
    return []
  }
}

/**
 * Get all published AI article URLs from Supabase
 */
async function getAIArticleUrlsIfEnabled() {
  try {
    const supabaseArticlesEnabled = String(process.env.ENABLE_SUPABASE_ARTICLES || '').toLowerCase() === 'true'
    if (!supabaseArticlesEnabled) return []

    const supabase = getSupabaseClient()
    const baseUrl = process.env.URL || 'https://cryptoloveyou.com'

    const { data: articles, error } = await supabase
      .from('ai_articles')
      .select('slug, published_at, updated_at, content_type, last_updated_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })

    if (error) {
      console.error('Supabase error:', error)
      return []
    }

    return articles.map(article => {
      const contentType = article.content_type || 'seo_article'
      const meta = contentTypeSitemapMeta(contentType)
      const lastmodIso = article.last_updated_at || article.updated_at || article.published_at
      return {
        loc: `${baseUrl}/${article.slug}/`,
        lastmod: lastmodIso ? String(lastmodIso).split('T')[0] : new Date().toISOString().split('T')[0],
        changefreq: meta.changefreq,
        priority: meta.priority
      }
    })

  } catch (error) {
    console.error('Error fetching AI article URLs:', error)
    return []
  }
}

function contentTypeSitemapMeta(contentType) {
  if (contentType === 'money_page') return { changefreq: 'weekly', priority: '0.9' }
  if (contentType === 'review_page') return { changefreq: 'monthly', priority: '0.8' }
  return { changefreq: 'monthly', priority: '0.7' }
}

/**
 * Generate sitemap XML from URL list
 */
function generateSitemapXML(urls) {
  const urlEntries = urls.map(url => `
  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urlEntries}
</urlset>`
}

/**
 * Escape special XML characters
 */
function escapeXml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Check if directory should be excluded from sitemap
 */
function isExcludedDirectory(dirName) {
  const excluded = [
    'node_modules',
    '.git',
    '.netlify',
    'netlify',
    'templates',
    'supabase',
    'wp-content',
    'wp-includes',
    'wp-admin',
    'page', // Pagination pages
    'author',
    'category',
    'tag',
    '.next',
    'dist',
    'build'
  ]

  return excluded.includes(dirName) || dirName.startsWith('.')
}

/**
 * Manual cache invalidation endpoint
 * Call with ?invalidate=true&key=YOUR_SECRET
 */
export function invalidateCache(apiKey) {
  if (apiKey === process.env.SITEMAP_INVALIDATE_KEY) {
    sitemapCache = null
    cacheTimestamp = 0
    console.log('Sitemap cache invalidated')
    return true
  }
  return false
}
