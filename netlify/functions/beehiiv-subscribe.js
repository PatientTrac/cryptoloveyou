/**
 * Netlify Function: Beehiiv Newsletter Subscribe
 * Publication: crypto love you
 * Publication ID (API V2): pub_f241bfb6-8576-42dd-88b2-973c9f6bb5c2
 *
 * Env vars needed in Netlify Dashboard → Site Settings → Environment Variables:
 *   BEEHIIV_API_KEY          = your API key (generate after Stripe verification)
 *   BEEHIIV_PUBLICATION_ID   = pub_f241bfb6-8576-42dd-88b2-973c9f6bb5c2 (or leave unset, hardcoded below)
 */

const FALLBACK_PUB_ID = 'pub_f241bfb6-8576-42dd-88b2-973c9f6bb5c2'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  try {
    const { email, first_name = '', source = 'website', utm_source = '', utm_medium = '' } = JSON.parse(event.body || '{}')

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Valid email required' }) }
    }

    const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY
    const BEEHIIV_PUB_ID  = process.env.BEEHIIV_PUBLICATION_ID || FALLBACK_PUB_ID
    const results = {}

    // ── 1. Subscribe to Beehiiv ──────────────────────────────
    if (BEEHIIV_API_KEY) {
      const payload = {
        email,
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: utm_source || source,
        utm_medium: utm_medium || 'website',
        utm_campaign: 'newsletter_signup',
        custom_fields: first_name ? [{ name: 'first_name', value: first_name }] : []
      }

      try {
        const res = await fetch(
          `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}/subscriptions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${BEEHIIV_API_KEY}`
            },
            body: JSON.stringify(payload)
          }
        )
        const data = await res.json()
        if (res.ok) {
          results.beehiiv = { status: 'subscribed', subscriber_id: data.data?.id }
        } else {
          console.error('Beehiiv API error:', data)
          results.beehiiv = { status: 'error', message: data.message || `HTTP ${res.status}` }
        }
      } catch (e) {
        console.error('Beehiiv fetch error:', e.message)
        results.beehiiv = { status: 'error', message: e.message }
      }
    } else {
      console.warn('BEEHIIV_API_KEY not set — skipping Beehiiv, saving to Supabase only')
      results.beehiiv = { status: 'skipped', reason: 'API key not configured yet' }
    }

    // ── 2. Always save to Supabase ───────────────────────────
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_DATABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { error } = await supabase.from('contacts').insert([{
          name: first_name || email.split('@')[0],
          email,
          message: `Newsletter signup via ${source}`,
          source: `newsletter_${source}`,
          status: 'subscriber',
          created_at: new Date().toISOString()
        }])
        results.supabase = error ? { status: 'error', message: error.message } : { status: 'saved' }
      } else {
        results.supabase = { status: 'skipped', reason: 'Supabase not configured' }
      }
    } catch (e) {
      results.supabase = { status: 'error', message: e.message }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "You're in! Check your inbox for a confirmation.",
        results
      })
    }

  } catch (err) {
    console.error('beehiiv-subscribe unhandled error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Subscription failed. Please try again.' })
    }
  }
}
