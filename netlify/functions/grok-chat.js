const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

const SYSTEM_PROMPT = `You are Grok, built by xAI. You are helping users on CryptoLoveYou.com — a Crypto + AI education site.
Topics include: AI crypto projects (Bittensor, Render, ASI, etc.), buying crypto, best wallets, exchanges, making money with AI & crypto, and crypto taxes.
Be helpful, direct, and a bit witty. Keep answers concise and useful.
This is educational content only; remind users this is not personalized financial or tax advice when relevant.`

/**
 * POST { "message": "..." } → { "reply": "..." }
 */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ reply: 'Method not allowed.' })
    }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ reply: 'Invalid request.' })
    }
  }

  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ reply: 'Please enter a message.' })
    }
  }
  if (message.length > 12000) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ reply: 'Please shorten your message and try again.' })
    }
  }

  const key = process.env.GROK_API_KEY
  if (!key || key.includes('YOUR_')) {
    console.error('GROK_API_KEY missing')
    return {
      statusCode: 503,
      headers: corsHeaders,
      body: JSON.stringify({ reply: 'Chat is temporarily unavailable.' })
    }
  }

  const model = process.env.GROK_MODEL || 'grok-4.20-reasoning'

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message }
        ],
        temperature: 0.75,
        max_tokens: 900
      })
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errMsg = data.error?.message || data.message || 'API error'
      console.error('Grok API error:', response.status, errMsg)
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          reply: "Sorry, I'm having trouble connecting right now. Please try again in a moment."
        })
      }
    }

    const reply = data.choices?.[0]?.message?.content
    if (!reply || typeof reply !== 'string') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          reply: "Sorry, I couldn't generate a reply. Please try again."
        })
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ reply })
    }
  } catch (err) {
    console.error('grok-chat:', err)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        reply: "Sorry, I'm having trouble connecting to xAI right now."
      })
    }
  }
}
