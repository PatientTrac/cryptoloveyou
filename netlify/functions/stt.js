const { Buffer } = require('buffer')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid request' }) }
  }

  const { audio, mimeType = 'audio/webm' } = body
  if (!audio) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'No audio data' }) }
  }

  const audioBuffer = Buffer.from(audio, 'base64')

  // 1. Try xAI STT first
  const xaiKey = process.env.GROK_API_KEY
  if (xaiKey && !xaiKey.includes('YOUR_')) {
    try {
      const form = new FormData()
      form.append('file', new Blob([audioBuffer], { type: mimeType }), 'recording.webm')

      const xaiRes = await fetch('https://api.x.ai/v1/stt', {
        method: 'POST',
        headers: { Authorization: `Bearer ${xaiKey}` },
        body: form
      })

      if (xaiRes.ok) {
        const data = await xaiRes.json()
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({ text: data.text || data.transcription || '' })
        }
      }
    } catch (e) {
      console.log('xAI STT failed → falling back to OpenAI Whisper')
    }
  }

  // 2. Fallback: OpenAI Whisper
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    return {
      statusCode: 503,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Speech-to-text unavailable. Please type your message.' })
    }
  }

  try {
    const openaiForm = new FormData()
    openaiForm.append('file', new Blob([audioBuffer], { type: mimeType }), 'recording.webm')
    openaiForm.append('model', 'whisper-1')

    const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: openaiForm
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      throw new Error(`OpenAI Whisper failed: ${errText}`)
    }

    const openaiData = await openaiRes.json()
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ text: openaiData.text })
    }
  } catch (error) {
    console.error('STT Error:', error)
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Could not transcribe audio. Please type your message.' })
    }
  }
}
