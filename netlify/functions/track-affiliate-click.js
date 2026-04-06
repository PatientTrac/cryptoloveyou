import { getSupabaseClient } from './utils/supabase.js'
import { readAffiliateRegistry } from './utils/affiliate-registry.js'

/**
 * Netlify Function: Track affiliate link clicks
 *
 * This function:
 * 1. Receives affiliate click from /aff/:platform route
 * 2. Tracks click in Supabase (affiliate_clicks table)
 * 3. Redirects user to actual affiliate URL
 * 4. Captures metadata (IP, user agent, referrer)
 */
export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Get platform from query params (from _redirects)
    const platform = event.queryStringParameters?.platform

    if (!platform) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Platform parameter is required' })
      }
    }

    // Get optional article slug and custom affiliate ID from query params
    const articleSlug = event.queryStringParameters?.article || null
    const customAffiliateId = event.queryStringParameters?.aid || null

    console.log(`Tracking affiliate click for platform: ${platform}`)

    // Get affiliate URL from registry/env/fallbacks
    const affiliateUrl = await getAffiliateUrl(platform, customAffiliateId)

    if (!affiliateUrl) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: `Unknown affiliate platform: ${platform}` })
      }
    }

    // Extract tracking metadata
    const ipAddress = event.headers['x-forwarded-for'] || event.headers['client-ip'] || 'unknown'
    const userAgent = event.headers['user-agent'] || 'unknown'
    const referrer = event.headers['referer'] || event.headers['referrer'] || null

    // Track click in Supabase (async - don't wait for completion)
    // If Supabase env vars are not configured, skip tracking but still redirect.
    if (isSupabaseConfigured()) {
      trackClickAsync(platform, articleSlug, affiliateUrl, ipAddress, userAgent, referrer)
    }

    // Redirect to affiliate URL immediately
    return {
      statusCode: 302,
      headers: {
        'Location': affiliateUrl,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: ''
    }

  } catch (error) {
    console.error('Affiliate tracking error:', error)

    // Even if tracking fails, redirect to homepage
    // Better UX than showing an error
    return {
      statusCode: 302,
      headers: {
        'Location': '/',
        'Cache-Control': 'no-cache'
      },
      body: ''
    }
  }
}

/**
 * Get affiliate URL from registry, environment variables, or fallbacks
 */
async function getAffiliateUrl(platform, customAffiliateId = null) {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseClient()
      const { data: partner } = await supabase
        .from('affiliate_partners')
        .select('affiliate_url')
        .eq('platform_key', platform)
        .eq('active', true)
        .maybeSingle()

      if (partner?.affiliate_url) {
        let affiliateUrl = String(partner.affiliate_url).trim()
        if (customAffiliateId && affiliateUrl) {
          affiliateUrl = affiliateUrl.replace(/\{aid\}/g, customAffiliateId)
        }
        return affiliateUrl
      }
    } catch (e) {
      // Table may not exist yet; fall through to env/registry
      console.warn('affiliate_partners lookup skipped:', e.message)
    }
  }

  const registry = await readAffiliateRegistry()
  const regEntry = registry?.platforms?.[platform]
  const envKey = regEntry?.env_key || `${platform.toUpperCase().replace(/-/g, '_')}_AFFILIATE_URL`
  let affiliateUrl = process.env[envKey] || null

  // If custom affiliate ID is provided, replace placeholder
  if (customAffiliateId && affiliateUrl) {
    affiliateUrl = affiliateUrl.replace(/\{aid\}/g, customAffiliateId)
  }

  // Fallback affiliate URLs (if env vars not set)
  const fallbackUrls = {
    'binance': 'https://accounts.binance.com/register',
    'coinbase': 'https://www.coinbase.com/join',
    'bybit': 'https://www.bybit.com/',
    'ledger': 'https://shop.ledger.com/',
    'trezor': 'https://trezor.io/',
    'kraken': 'https://www.kraken.com/',
    'bitget': 'https://www.bitget.com/',
    'okx': 'https://www.okx.com/'
  }

  return affiliateUrl || fallbackUrls[platform] || null
}

/**
 * Track affiliate click in Supabase (async)
 * This doesn't block the redirect
 */
async function trackClickAsync(platform, articleSlug, affiliateUrl, ipAddress, userAgent, referrer) {
  try {
    const supabase = getSupabaseClient()

    // Find article ID if slug is provided
    let articleId = null
    if (articleSlug) {
      try {
        const { data: article } = await supabase
          .from('ai_articles')
          .select('id')
          .eq('slug', articleSlug)
          .single()

        if (article) {
          articleId = article.id
        }
      } catch (e) {
        // ai_articles is optional in "static-only publishing" mode
        articleId = null
      }
    }

    // Insert click record
    const { error } = await supabase
      .from('affiliate_clicks')
      .insert([{
        article_id: articleId,
        article_slug: articleSlug,
        affiliate_platform: platform,
        affiliate_url: affiliateUrl,
        clicked_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer: referrer,
        converted: false
      }])

    if (error) {
      console.error('Failed to track click:', error)
    } else {
      console.log(`Click tracked: ${platform} from article ${articleSlug || 'unknown'}`)
    }

  } catch (error) {
    console.error('Tracking async error:', error)
    // Don't throw - this is non-critical
  }
}

function isSupabaseConfigured() {
  const url = process.env.SUPABASE_URL || process.env.SUPABASE_DATABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  return Boolean(url && key)
}

/**
 * Update conversion status (called by external webhook/API)
 * This would typically be triggered by affiliate network webhooks
 */
export async function updateConversion(clickId, conversionValue) {
  try {
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from('affiliate_clicks')
      .update({
        converted: true,
        conversion_value: conversionValue,
        converted_at: new Date().toISOString()
      })
      .eq('id', clickId)

    if (error) {
      console.error('Failed to update conversion:', error)
      throw error
    }

    console.log(`Conversion updated for click ${clickId}: $${conversionValue}`)
    return true

  } catch (error) {
    console.error('Update conversion error:', error)
    return false
  }
}
