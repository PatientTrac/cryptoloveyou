/**
 * Netlify Function: Beehiiv Newsletter Subscribe
 * 
 * Handles email subscriptions:
 * 1. Validates email
 * 2. Subscribes to Beehiiv via API
 * 3. Also saves to Supabase contacts table
 * 4. Returns success/error
 */

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

    const BEEHIIV_API_KEY  = process.env.BEEHIIV_API_KEY
    const BEEHIIV_PUB_ID   = process.env.BEEHIIV_PUBLICATION_ID
    const results = {}

    // ── 1. Subscribe to Beehiiv ──────────────────────────────
    if (BEEHIIV_API_KEY && BEEHIIV_PUB_ID) {
      const payload = {
        email,
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: utm_source || source,
        utm_medium: utm_medium || 'website',
        utm_campaign: 'newsletter_signup',
        custom_fields: first_name ? [{ name: 'first_name', value: first_name }] : []
      }

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
      results.beehiiv = res.ok ? 'subscribed' : `error: ${data.message || res.status}`
    } else {
      results.beehiiv = 'skipped (no API key configured)'
    }

    // ── 2. Also save to Supabase ─────────────────────────────
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.SUPABASE_URL || process.env.SUPABASE_DATABASE_URL,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
      )
      await supabase.from('contacts').insert([{
        name: first_name || email.split('@')[0],
        email,
        message: `Newsletter signup via ${source}`,
        source: `newsletter_${source}`,
        status: 'subscriber',
        created_at: new Date().toISOString()
      }])
      results.supabase = 'saved'
    } catch (e) {
      results.supabase = `skipped: ${e.message}`
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: "You're in! Check your inbox.", results })
    }

  } catch (err) {
    console.error('Beehiiv subscribe error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Subscription failed. Please try again.' }) }
  }
}
