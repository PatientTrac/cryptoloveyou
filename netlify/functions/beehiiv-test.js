/**
 * Netlify Function: Test Beehiiv connection
 * URL: /.netlify/functions/beehiiv-test
 * Used once to verify API key + publication ID are working
 * Remove after confirmed working
 */
export const handler = async () => {
  const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY
  const BEEHIIV_PUB_ID  = process.env.BEEHIIV_PUBLICATION_ID || 'pub_f241bfb6-8576-42dd-88b2-973c9f6bb5c2'

  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }

  if (!BEEHIIV_API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'BEEHIIV_API_KEY not set in Netlify env vars' }) }
  }

  try {
    const res = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUB_ID}`,
      { headers: { 'Authorization': `Bearer ${BEEHIIV_API_KEY}`, 'Content-Type': 'application/json' } }
    )
    const data = await res.json()
    return {
      statusCode: res.ok ? 200 : res.status,
      headers,
      body: JSON.stringify({
        ok: res.ok,
        publication_name: data.data?.name,
        publication_id: BEEHIIV_PUB_ID,
        status: res.ok ? '✅ Beehiiv connected successfully' : `❌ Error: ${data.message}`
      })
    }
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
