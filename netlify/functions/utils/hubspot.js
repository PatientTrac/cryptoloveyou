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

  const properties = {
    email: contactData.email,
    firstname: contactData.name?.split(' ')[0] || contactData.name,
    lastname: contactData.name?.split(' ').slice(1).join(' ') || '',
    message: contactData.message,
    hs_lead_status: 'NEW',
    contact_source: contactData.source || 'contact_page'
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

/**
 * Create a deal in HubSpot (for affiliate tracking - Phase 3)
 * @param {Object} dealData - Deal information
 * @returns {Promise<Object>} - HubSpot deal response
 */
export async function createDeal(dealData) {
  const hubspot = getHubSpotClient()

  const properties = {
    dealname: dealData.dealName,
    amount: dealData.amount || '0',
    dealstage: dealData.stage || 'appointmentscheduled',
    pipeline: dealData.pipeline || 'default',
    hubspot_owner_id: dealData.ownerId
  }

  try {
    const response = await hubspot.crm.deals.basicApi.create({ properties })
    return response
  } catch (error) {
    console.error('HubSpot deal creation error:', error)
    throw error
  }
}

/**
 * Associate contact with deal
 * @param {string} contactId - HubSpot contact ID
 * @param {string} dealId - HubSpot deal ID
 */
export async function associateContactWithDeal(contactId, dealId) {
  const hubspot = getHubSpotClient()

  try {
    await hubspot.crm.contacts.associationsApi.create(
      contactId,
      'deals',
      dealId,
      'contact_to_deal'
    )
  } catch (error) {
    console.error('Association error:', error)
    throw error
  }
}
