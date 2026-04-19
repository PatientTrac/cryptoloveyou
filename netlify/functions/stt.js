const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

/**
 * POST { "audio": "<base64>", "mimeType": "audio/webm" } → { "text": "..." }
 * Forwards audio to xAI STT endpoint and returns transcription.
 */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const key = process.env.GROK_API_KEY
  if (!key || key.includes('YOUR_')) {
    console.error('GROK_API_KEY missing')
    return { statusCode: 503, headers: corsHeaders, body: JSON.stringify({ error: 'STT unavailable' }) }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid request' }) }
  }

  const { audio, mimeType = 'audio/webm' } = body
  if (!audio || typeof audio !== 'string') {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'No audio provided' }) }
  }

  try {
    const audioBuffer = Buffer.from(audio, 'base64')
    const blob = new Blob([audioBuffer], { type: mimeType })
    const form = new FormData()
    form.append('file', blob, 'recording.webm')

    const response = await fetch('https://api.x.ai/v1/stt', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      console.error('xAI STT error:', response.status, data)
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ error: data.error?.message || 'Transcription failed' })
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ text: data.text || data.transcription || '' })
    }
  } catch (err) {
    console.error('stt:', err)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to transcribe audio' })
    }
  }
}
