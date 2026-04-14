import { getSupabaseClient } from './utils/supabase.js'
import { verifyToken, hasRole } from './auth.js'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Content-Type': 'application/json'
  }
}

// NEW: JWT-based authentication (replaces API key)
function requireAuth(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || ''

  // Check for JWT token first
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    const user = verifyToken(token)

    if (user) {
      return { ok: true, user }
    }
  }

  // BACKWARDS COMPATIBILITY: Fall back to API key if JWT not provided
  // This allows gradual migration - remove this block after all users migrated
  const apiKey = process.env.ADMIN_API_KEY
  if (apiKey && String(apiKey).trim().length >= 16) {
    const headerKey = event.headers?.['x-admin-key'] || event.headers?.['X-Admin-Key'] || ''
    const qsKey = event.queryStringParameters?.apiKey || ''
    const providedKey = authHeader.slice(7).trim() || headerKey || qsKey

    if (providedKey === apiKey) {
      // API key users get admin role by default
      return { ok: true, user: { username: 'legacy_api_key', role: 'admin' } }
    }
  }

  return { ok: false, error: 'Unauthorized - Please login' }
}

// Check if user has permission for write operations
function requireRole(user, requiredRole) {
  if (!hasRole(user, requiredRole)) {
    return { ok: false, error: `Insufficient permissions - ${requiredRole} role required` }
  }
  return { ok: true }
}

function isSupabaseConfigured() {
  try {
    getSupabaseClient()
    return true
  } catch {
    return false
  }
}

export const handler = async (event) => {
  const headers = corsHeaders()

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  const auth = requireAuth(event)
  if (!auth.ok) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: auth.error })
    }
  }

  const currentUser = auth.user // Available for all endpoints

  if (!isSupabaseConfigured()) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({ error: 'Supabase not configured' })
    }
  }

  const supabase = getSupabaseClient()
  const qs = event.queryStringParameters || {}
  const resource = qs.resource || 'help'

  try {
    if (event.httpMethod === 'GET' && resource === 'help') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          endpoints: {
            'GET ?resource=clicks': 'List clicks (from, to, platform, article_slug, limit)',
            'GET ?resource=aggregates': 'Aggregates (from, to, groupBy=platform|day|article_slug)',
            'GET ?resource=partners': 'List affiliate_partners rows',
            'GET ?resource=custom': 'List custom_affiliates rows',
            'POST ?resource=partners': 'Create partner in affiliate_partners (JSON body)',
            'POST ?resource=custom': 'Create/upsert custom affiliate (JSON body)',
            'PATCH ?resource=partners&id=<uuid>': 'Update affiliate_partners row',
            'PATCH ?resource=custom&id=<uuid>': 'Update custom_affiliates row',
            'PATCH ?resource=click&id=<uuid>': 'Mark conversion (JSON body)'
          }
        })
      }
    }

    if (event.httpMethod === 'GET' && resource === 'clicks') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(await listClicks(supabase, qs))
      }
    }

    if (event.httpMethod === 'GET' && resource === 'aggregates') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(await getAggregates(supabase, qs))
      }
    }

    if (event.httpMethod === 'GET' && resource === 'partners') {
      const { data, error } = await supabase
        .from('affiliate_partners')
        .select('*')
        .order('platform_key', { ascending: true })

      if (error) throw error

      // Add click counts for each partner
      const partners = data || []
      for (const partner of partners) {
        const { count } = await supabase
          .from('affiliate_clicks')
          .select('*', { count: 'exact', head: true })
          .eq('affiliate_platform', partner.platform_key)

        partner.clicks = count || 0
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, partners })
      }
    }

    // ── custom_affiliates GET ────────────────────────────────
    if (event.httpMethod === 'GET' && resource === 'custom') {
      const { data, error } = await supabase
        .from('custom_affiliates')
        .select('*')
        .order('category', { ascending: true })
        .order('priority', { ascending: true })

      if (error) throw error
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, custom_affiliates: data || [] })
      }
    }

    // ── custom_affiliates POST (create / upsert) ─────────────
    if (event.httpMethod === 'POST' && resource === 'custom') {
      const roleCheck = requireRole(currentUser, 'admin')
      if (!roleCheck.ok) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: roleCheck.error }) }
      }

      const body = JSON.parse(event.body || '{}')
      const platform_key = String(body.platform_key || '').trim().toLowerCase().replace(/\s+/g, '_')
      const label        = String(body.label || '').trim()
      const affiliate_url = String(body.affiliate_url || '').trim()

      if (!platform_key || !label || !affiliate_url) {
        return {
          statusCode: 400, headers,
          body: JSON.stringify({ error: 'platform_key, label and affiliate_url are required' })
        }
      }

      const row = {
        platform_key,
        label,
        affiliate_url,
        category:         body.category         || 'other',
        description:      body.description       || null,
        logo_url:         body.logo_url          || null,
        cta_text:         body.cta_text          || 'Learn more →',
        commission_model: body.commission_model  || null,
        rate:             body.rate              || null,
        cookie_days:      body.cookie_days       ? Number(body.cookie_days) : null,
        payment_method:   body.payment_method    || null,
        threshold:        body.threshold         || null,
        notes:            body.notes             || null,
        active:           body.active !== false,
        priority:         body.priority          ? Number(body.priority) : 10,
        updated_at:       new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('custom_affiliates')
        .upsert([row], { onConflict: 'platform_key' })
        .select()

      if (error) throw error
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ ok: true, partner: data?.[0] })
      }
    }

    // ── custom_affiliates PATCH ──────────────────────────────
    if (event.httpMethod === 'PATCH' && resource === 'custom') {
      const roleCheck = requireRole(currentUser, 'admin')
      if (!roleCheck.ok) {
        return { statusCode: 403, headers, body: JSON.stringify({ error: roleCheck.error }) }
      }

      const id = qs.id
      if (!id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'id param required' }) }
      }

      const body = JSON.parse(event.body || '{}')
      const allowed = ['label','affiliate_url','category','description','logo_url',
                       'cta_text','commission_model','rate','cookie_days','payment_method',
                       'threshold','notes','active','priority']
      const updates = { updated_at: new Date().toISOString() }
      for (const key of allowed) {
        if (body[key] !== undefined) updates[key] = body[key]
      }

      const { data, error } = await supabase
        .from('custom_affiliates')
        .update(updates)
        .eq('id', id)
        .select()

      if (error) throw error
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ ok: true, partner: data?.[0] })
      }
    }

    if (event.httpMethod === 'POST' && resource === 'partners') {
      // Require admin role for creating/updating partners
      const roleCheck = requireRole(currentUser, 'admin')
      if (!roleCheck.ok) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: roleCheck.error })
        }
      }

      const body = JSON.parse(event.body || '{}')
      const platform_key = String(body.platform_key || '').trim().toLowerCase()
      const affiliate_url = String(body.affiliate_url || '').trim()
      const label = body.label != null ? String(body.label) : null
      const active = body.active !== false

      if (!platform_key || !affiliate_url) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'platform_key and affiliate_url are required' })
        }
      }

      const row = {
        platform_key,
        affiliate_url,
        label,
        active,
        commission_model: body.commission_model != null ? String(body.commission_model) : null,
        rate: body.rate != null ? String(body.rate) : null,
        payment_method: body.payment_method != null ? String(body.payment_method) : null,
        threshold: body.threshold != null ? String(body.threshold) : null,
        payment_contact: body.payment_contact != null ? String(body.payment_contact) : null,
        contact_name: body.contact_name != null ? String(body.contact_name) : null,
        notes: body.notes != null ? String(body.notes) : null,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('affiliate_partners')
        .upsert([row], { onConflict: 'platform_key' })
        .select()
        .single()

      if (error) throw error
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, partner: data, upserted: true })
      }
    }

    if (event.httpMethod === 'PATCH' && resource === 'partners') {
      // Require admin role for updating partners
      const roleCheck = requireRole(currentUser, 'admin')
      if (!roleCheck.ok) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: roleCheck.error })
        }
      }

      const id = qs.id
      if (!id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'id query param required' }) }
      }
      const body = JSON.parse(event.body || '{}')
      const patch = {}
      if (body.affiliate_url != null) patch.affiliate_url = String(body.affiliate_url).trim()
      if (body.label !== undefined) patch.label = body.label === null ? null : String(body.label)
      if (body.active !== undefined) patch.active = Boolean(body.active)
      if (body.commission_model !== undefined) patch.commission_model = body.commission_model === null ? null : String(body.commission_model)
      if (body.rate !== undefined) patch.rate = body.rate === null ? null : String(body.rate)
      if (body.payment_method !== undefined) patch.payment_method = body.payment_method === null ? null : String(body.payment_method)
      if (body.threshold !== undefined) patch.threshold = body.threshold === null ? null : String(body.threshold)
      if (body.payment_contact !== undefined) patch.payment_contact = body.payment_contact === null ? null : String(body.payment_contact)
      if (body.contact_name !== undefined) patch.contact_name = body.contact_name === null ? null : String(body.contact_name)
      if (body.notes !== undefined) patch.notes = body.notes === null ? null : String(body.notes)
      patch.updated_at = new Date().toISOString()

      const { data, error } = await supabase
        .from('affiliate_partners')
        .update(patch)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, partner: data })
      }
    }

    if (event.httpMethod === 'PATCH' && resource === 'click') {
      // Require admin role for marking conversions (viewers can only view)
      const roleCheck = requireRole(currentUser, 'admin')
      if (!roleCheck.ok) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: roleCheck.error })
        }
      }

      const id = qs.id
      if (!id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'id query param required' }) }
      }
      const body = JSON.parse(event.body || '{}')
      const converted = body.converted !== false
      const conversion_value =
        body.conversion_value != null ? Number(body.conversion_value) : null

      const patch = {
        converted,
        converted_at: converted ? new Date().toISOString() : null,
        conversion_value: conversion_value != null && !Number.isNaN(conversion_value) ? conversion_value : null
      }

      const { data, error } = await supabase
        .from('affiliate_clicks')
        .update(patch)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: true, click: data })
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Unknown resource or method' })
    }
  } catch (err) {
    console.error('admin-affiliate error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err.message || 'Internal error',
        hint: err.hint || (err.code === '42P01' ? 'Run Supabase migration 005_affiliate_partners.sql' : undefined)
      })
    }
  }
}

async function listClicks(supabase, qs) {
  const limit = Math.min(parseInt(qs.limit || '500', 10) || 500, 5000)
  let q = supabase.from('affiliate_clicks').select('*')

  if (qs.from) {
    q = q.gte('clicked_at', new Date(qs.from).toISOString())
  }
  if (qs.to) {
    const t = new Date(qs.to)
    t.setHours(23, 59, 59, 999)
    q = q.lte('clicked_at', t.toISOString())
  }
  if (qs.platform) {
    q = q.eq('affiliate_platform', qs.platform.trim().toLowerCase())
  }
  if (qs.article_slug) {
    q = q.eq('article_slug', qs.article_slug.trim())
  }

  q = q.order('clicked_at', { ascending: false }).limit(limit)

  const { data, error } = await q
  if (error) throw error
  return { ok: true, clicks: data || [], count: (data || []).length }
}

async function getAggregates(supabase, qs) {
  const from = qs.from ? new Date(qs.from).toISOString() : null
  const to = qs.to ? new Date(qs.to) : new Date()
  if (qs.to) {
    to.setHours(23, 59, 59, 999)
  }
  const toIso = to.toISOString()

  const groupBy = (qs.groupBy || 'platform').toLowerCase()
  const maxRows = 8000

  let q = supabase
    .from('affiliate_clicks')
    .select('id, affiliate_platform, article_slug, clicked_at, converted, conversion_value')
    .order('clicked_at', { ascending: false })
    .limit(maxRows)

  if (from) q = q.gte('clicked_at', from)
  q = q.lte('clicked_at', toIso)

  const { data, error } = await q
  if (error) throw error
  const rows = data || []

  /** @type {Record<string, number>} */
  const buckets = {}
  for (const row of rows) {
    let key
    if (groupBy === 'day') {
      key = String(row.clicked_at || '').slice(0, 10) || 'unknown'
    } else if (groupBy === 'article_slug') {
      key = row.article_slug || '(none)'
    } else {
      key = row.affiliate_platform || 'unknown'
    }
    buckets[key] = (buckets[key] || 0) + 1
  }

  const sorted = Object.entries(buckets)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)

  return {
    ok: true,
    groupBy,
    totalClicks: rows.length,
    truncated: rows.length >= maxRows,
    aggregates: sorted
  }
}
