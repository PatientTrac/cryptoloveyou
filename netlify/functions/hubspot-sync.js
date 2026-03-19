import { getContacts, updateContactWithHubSpotId } from './utils/supabase.js'
import { syncContactToHubSpot } from './utils/hubspot.js'

/**
 * Netlify Function: Manual HubSpot Sync
 *
 * This function can be triggered:
 * 1. Manually via API call
 * 2. By a scheduled cron job (Netlify scheduled functions)
 * 3. To retry failed syncs
 *
 * It finds all contacts without a HubSpot ID and syncs them
 */
export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  // Simple authentication (optional - add API key check)
  const authHeader = event.headers.authorization
  const expectedAuth = process.env.SYNC_API_KEY

  if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    }
  }

  try {
    console.log('Starting HubSpot sync job...')

    // Get all contacts without HubSpot ID
    const contacts = await getContacts({ limit: 100 })
    const unsynced = contacts.filter(c => !c.hubspot_contact_id)

    console.log(`Found ${unsynced.length} unsynced contacts`)

    const results = {
      total: unsynced.length,
      synced: 0,
      failed: 0,
      errors: []
    }

    // Sync each contact
    for (const contact of unsynced) {
      try {
        const hubspotResult = await syncContactToHubSpot({
          email: contact.email,
          name: contact.name,
          message: contact.message,
          source: contact.source
        })

        await updateContactWithHubSpotId(contact.id, hubspotResult.id)

        results.synced++
        console.log(`Synced contact ${contact.id} to HubSpot ${hubspotResult.id}`)

      } catch (error) {
        results.failed++
        results.errors.push({
          contactId: contact.id,
          email: contact.email,
          error: error.message
        })
        console.error(`Failed to sync contact ${contact.id}:`, error)
      }

      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Sync job completed',
        results
      })
    }

  } catch (error) {
    console.error('Sync job error:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Sync job failed',
        details: error.message
      })
    }
  }
}
