import { handler as scheduledHandler } from './scheduled-trending-seo.js'
import { verifyToken, hasRole } from './auth.js'

function requireEnv(name) {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}`)
  return v
}

function isAuthorized(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || ''
  if (authHeader.startsWith('Bearer ')) {
    const jwtToken = authHeader.slice(7).trim()
    const decoded = verifyToken(jwtToken)
    if (decoded && hasRole(decoded, 'admin')) return true
  }
  const body = JSON.parse(event.body || '{}')
  const apiKey = body.apiKey
  const expected = process.env.ARTICLE_GENERATION_API_KEY
  if (apiKey && expected && apiKey === expected) return true
  return false
}

export const handler = async (event) => {
  // Manual trigger endpoint so we can test in production/local
  // without Netlify's scheduled-function wrapper response.
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    }
  }

  try {
    if (!isAuthorized(event)) {
      return {
        statusCode: 401,
        headers: corsHeaders(),
        body: JSON.stringify({
          error: 'Unauthorized: admin JWT (Bearer) or body.apiKey matching ARTICLE_GENERATION_API_KEY required'
        })
      }
    }

    const res = await scheduledHandler()
    return {
      statusCode: res.statusCode || 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/json'
      },
      body: res.body || JSON.stringify({ success: true })
    }
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ success: false, error: err.message })
    }
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
}

