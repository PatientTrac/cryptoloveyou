import { insertContact, updateContactWithHubSpotId } from './utils/supabase.js'
import { syncContactToHubSpot } from './utils/hubspot.js'
import { validateContactForm, sanitizeInput, checkRateLimit } from './utils/validation.js'

/**
 * Netlify Function: Handle contact form submissions
 *
 * This function:
 * 1. Validates and sanitizes input
 * 2. Checks rate limiting
 * 3. Saves contact to Supabase
 * 4. Syncs contact to HubSpot
 * 5. Returns success/error response
 */
export const handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}')

    // Sanitize inputs
    const sanitizedData = {
      name: sanitizeInput(body.name),
      email: sanitizeInput(body.email),
      message: sanitizeInput(body.message),
      source: sanitizeInput(body.source) || 'contact_page'
    }

    // Validate form data
    const validation = validateContactForm(sanitizedData)

    if (!validation.valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        })
      }
    }

    // Check rate limiting (max 5 requests per minute per email)
    const rateLimit = checkRateLimit(sanitizedData.email, 5, 60000)

    if (!rateLimit.allowed) {
      return {
        statusCode: 429,
        headers: {
          ...headers,
          'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
        },
        body: JSON.stringify({
          error: 'Too many requests. Please try again later.',
          resetAt: new Date(rateLimit.resetAt).toISOString()
        })
      }
    }

    // Step 1: Insert contact into Supabase
    console.log('Inserting contact into Supabase...')
    const contact = await insertContact(sanitizedData)
    console.log('Contact saved to Supabase:', contact.id)

    // Step 2: Sync to HubSpot (async, don't wait for completion)
    // This allows the user to get a fast response
    syncToHubSpotAsync(contact)

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Thank you for your message! We will get back to you soon.',
        contactId: contact.id
      })
    }

  } catch (error) {
    console.error('Contact form error:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Something went wrong. Please try again later.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
}

/**
 * Sync contact to HubSpot asynchronously
 * Updates Supabase with HubSpot contact ID after sync
 */
async function syncToHubSpotAsync(contact) {
  try {
    console.log('Syncing contact to HubSpot...')
    const hubspotResult = await syncContactToHubSpot({
      email: contact.email,
      name: contact.name,
      message: contact.message,
      source: contact.source
    })

    console.log('HubSpot sync successful:', hubspotResult.id)

    // Update Supabase with HubSpot contact ID
    await updateContactWithHubSpotId(contact.id, hubspotResult.id)
    console.log('Updated Supabase with HubSpot ID')

  } catch (error) {
    console.error('HubSpot sync failed (non-critical):', error)
    // Don't throw error - contact is already saved to Supabase
    // This can be retried later via a cron job or webhook
  }
}
