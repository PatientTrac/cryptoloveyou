import { Client } from '@hubspot/api-client'

/**
 * Initialize HubSpot client
 */
export function getHubSpotClient() {
  const apiKey = process.env.HUBSPOT_API_KEY

  if (!apiKey) {
    throw new Error('Missing HubSpot API key')
  }

  return new Client({ accessToken: apiKey })
}

/**
 * Create or update a contact in HubSpot
 * @param {Object} contactData - Contact information
 * @returns {Promise<Object>} - HubSpot contact response
 */
export async function syncContactToHubSpot(contactData) {
  const hubspot = getHubSpotClient()

  // Only use standard HubSpot properties that definitely exist
  const properties = {
    email: contactData.email,
    firstname: contactData.name?.split(' ')[0] || contactData.name,
    lastname: contactData.name?.split(' ').slice(1).join(' ') || '',
    hs_lead_status: 'NEW'
  }

  // Add custom properties if they might exist (won't fail if they don't)
  if (contactData.message) {
    properties.message = contactData.message
  }

  if (contactData.source) {
    properties.contact_source = contactData.source
  }

  try {
    // Try to find existing contact by email
    const searchRequest = {
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ',
          value: contactData.email
        }]
      }]
    }

    const searchResults = await hubspot.crm.contacts.searchApi.doSearch(searchRequest)

    if (searchResults.results.length > 0) {
      // Update existing contact
      const contactId = searchResults.results[0].id
      const updateResponse = await hubspot.crm.contacts.basicApi.update(contactId, { properties })
      return {
        id: contactId,
        isNew: false,
        response: updateResponse
      }
    } else {
      // Create new contact
      const createResponse = await hubspot.crm.contacts.basicApi.create({ properties })
      return {
        id: createResponse.id,
        isNew: true,
        response: createResponse
      }
    }
  } catch (error) {
    console.error('HubSpot sync error:', error)
    throw new Error(`Failed to sync contact to HubSpot: ${error.message}`)
  }
}
