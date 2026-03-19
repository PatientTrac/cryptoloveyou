import { createClient } from '@supabase/supabase-js'

/**
 * Initialize Supabase client with service role key
 * This bypasses Row Level Security (RLS) policies
 * Use with caution - only in serverless functions
 */
export function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.SUPABASE_DATABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Insert a new contact into Supabase
 * @param {Object} contactData - Contact information
 * @returns {Promise<Object>} - Inserted contact with ID
 */
export async function insertContact(contactData) {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('contacts')
    .insert([{
      name: contactData.name,
      email: contactData.email,
      message: contactData.message,
      source: contactData.source || 'contact_page',
      status: contactData.status || 'new',
      created_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) {
    console.error('Supabase error:', error)
    throw new Error(`Failed to insert contact: ${error.message}`)
  }

  return data
}

/**
 * Update contact with HubSpot ID after sync
 * @param {number} contactId - Supabase contact ID
 * @param {string} hubspotContactId - HubSpot contact ID
 */
export async function updateContactWithHubSpotId(contactId, hubspotContactId) {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('contacts')
    .update({ hubspot_contact_id: hubspotContactId })
    .eq('id', contactId)

  if (error) {
    console.error('Failed to update HubSpot ID:', error)
    throw error
  }
}

/**
 * Get all contacts (for admin panel)
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} - List of contacts
 */
export async function getContacts(filters = {}) {
  const supabase = getSupabaseClient()

  let query = supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.status) {
    query = query.eq('status', filters.status)
  }

  if (filters.limit) {
    query = query.limit(filters.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch contacts:', error)
    throw error
  }

  return data
}
