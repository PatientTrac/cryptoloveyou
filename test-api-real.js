#!/usr/bin/env node

/**
 * Real LunarCrush API Test - Coins Endpoint
 * This tests the actual endpoint we'll use in n8n workflow
 */

import 'dotenv/config'

const API_KEY = process.env.LUNARCRUSH_API_KEY

if (!API_KEY) {
  console.error('❌ LUNARCRUSH_API_KEY not found')
  process.exit(1)
}

console.log('🔑 API Key configured:', API_KEY.substring(0, 15) + '...')
console.log('🚀 Testing LunarCrush Coins API...\n')

async function testCoinsAPI() {
  try {
    // Test the v2 coins endpoint which is documented
    const url = `https://api.lunarcrush.com/v2?data=market&key=${API_KEY}&symbol=BTC`

    console.log('📡 Endpoint:', 'https://api.lunarcrush.com/v2')
    console.log('📊 Testing with: Bitcoin (BTC)\n')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    console.log('Status:', response.status, response.statusText)

    if (!response.ok) {
      const text = await response.text()
      console.error('\n❌ Error Response:')
      console.error(text)

      if (response.status === 401) {
        console.error('\n💡 API Key may be invalid or expired')
        console.error('💡 Check your LunarCrush dashboard: https://lunarcrush.com/developers')
      }
      process.exit(1)
    }

    const data = await response.json()

    if (data.data && data.data.length > 0) {
      const coin = data.data[0]

      console.log('✅ API Working! Bitcoin Data Retrieved:\n')
      console.log('━'.repeat(60))
      console.log(`Name: ${coin.name}`)
      console.log(`Symbol: ${coin.symbol}`)
      console.log(`Price: $${coin.price ? parseFloat(coin.price).toLocaleString() : 'N/A'}`)
      console.log(`Market Cap: $${coin.market_cap ? parseFloat(coin.market_cap).toLocaleString() : 'N/A'}`)
      console.log(`Galaxy Score: ${coin.galaxy_score || 'N/A'}`)
      console.log(`AltRank: ${coin.alt_rank || 'N/A'}`)
      console.log('━'.repeat(60))

      console.log('\n📝 Sample data for article generation:')
      console.log(JSON.stringify({
        name: coin.name,
        symbol: coin.symbol,
        price: coin.price,
        galaxy_score: coin.galaxy_score,
        alt_rank: coin.alt_rank
      }, null, 2))

      console.log('\n✅ SUCCESS! LunarCrush API is working correctly!')
      console.log('\n🎯 Next Steps:')
      console.log('1. Get your Anthropic (Claude) API key: https://console.anthropic.com/')
      console.log('2. Add it to .env file as ANTHROPIC_API_KEY')
      console.log('3. Run Supabase migration: supabase/migrations/002_ai_articles_schema.sql')
      console.log('4. Set up n8n workflow following N8N_WORKFLOW_GUIDE.md')

    } else {
      console.log('⚠️  Unexpected response format:')
      console.log(JSON.stringify(data, null, 2))
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

testCoinsAPI()
