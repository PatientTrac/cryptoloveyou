#!/usr/bin/env node

/**
 * Simple LunarCrush API Test
 * Tests the SSE endpoint shown in the screenshot
 */

import 'dotenv/config'

const API_KEY = process.env.LUNARCRUSH_API_KEY

if (!API_KEY) {
  console.error('❌ LUNARCRUSH_API_KEY not found')
  process.exit(1)
}

console.log('🔑 API Key:', API_KEY.substring(0, 15) + '...')
console.log('🧪 Testing LunarCrush SSE endpoint...\n')

const url = `https://lunarcrush.ai/sse?key=${API_KEY}`
console.log('📡 URL:', url, '\n')

try {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'text/event-stream'
    },
    signal: AbortSignal.timeout(10000) // 10 second timeout
  })

  console.log('📊 Status:', response.status, response.statusText)
  console.log('📋 Headers:', Object.fromEntries(response.headers.entries()))

  if (!response.ok) {
    const text = await response.text()
    console.error('\n❌ Error response:', text)
    process.exit(1)
  }

  const body = await response.text()
  console.log('\n✅ Response (first 500 chars):')
  console.log(body.substring(0, 500))

} catch (error) {
  console.error('\n❌ Error:', error.message)
  process.exit(1)
}
