#!/usr/bin/env node

/**
 * Test Script: LunarCrush API Connection
 *
 * This script tests the LunarCrush API connection and fetches trending coins
 * to verify the API key works correctly.
 */

import 'dotenv/config'

const LUNARCRUSH_API_KEY = process.env.LUNARCRUSH_API_KEY

if (!LUNARCRUSH_API_KEY) {
  console.error('❌ Error: LUNARCRUSH_API_KEY not found in .env file')
  process.exit(1)
}

console.log('🔑 LunarCrush API Key:', LUNARCRUSH_API_KEY.substring(0, 10) + '...')
console.log('🚀 Testing LunarCrush API connection...\n')

async function testLunarCrushAPI() {
  try {
    // Test 1: Fetch trending coins by Galaxy Score
    console.log('📊 Test 1: Fetching top 5 trending coins by Galaxy Score...')
    const response = await fetch(`https://lunarcrush.ai/sse?key=${LUNARCRUSH_API_KEY}`, {
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    console.log('✅ API Response received!\n')

    if (data.data && Array.isArray(data.data)) {
      console.log(`📈 Top ${data.data.length} Trending Cryptocurrencies:\n`)

      data.data.forEach((coin, index) => {
        console.log(`${index + 1}. ${coin.name} (${coin.symbol})`)
        console.log(`   💰 Price: $${coin.price?.toFixed(2) || 'N/A'}`)
        console.log(`   📊 Galaxy Score: ${coin.galaxy_score || 'N/A'}`)
        console.log(`   📈 24h Change: ${coin.percent_change_24h ? coin.percent_change_24h.toFixed(2) + '%' : 'N/A'}`)
        console.log(`   💬 Social Volume: ${coin.social_volume || 'N/A'}`)
        console.log(`   🏆 Market Cap Rank: #${coin.market_cap_rank || 'N/A'}`)
        console.log('')
      })

      // Test 2: Check if we can generate an article from this data
      console.log('✅ Test 2: Simulating article generation data...\n')
      const topCoin = data.data[0]

      console.log('📝 Sample Article Data for n8n Workflow:')
      console.log('─'.repeat(60))
      console.log(JSON.stringify({
        name: topCoin.name,
        symbol: topCoin.symbol,
        price: topCoin.price,
        percent_change_24h: topCoin.percent_change_24h,
        galaxy_score: topCoin.galaxy_score,
        social_volume: topCoin.social_volume,
        market_cap_rank: topCoin.market_cap_rank,
        suggested_slug: `${topCoin.symbol.toLowerCase()}-analysis-${new Date().toISOString().split('T')[0]}`
      }, null, 2))
      console.log('─'.repeat(60))

      console.log('\n✅ All tests passed! LunarCrush API is working correctly.')
      console.log('\n🎯 Next Steps:')
      console.log('1. Set up your Anthropic (Claude) API key')
      console.log('2. Run Supabase migration: supabase/migrations/002_ai_articles_schema.sql')
      console.log('3. Set up n8n workflow using N8N_WORKFLOW_GUIDE.md')
      console.log('4. Test the complete workflow end-to-end')

    } else {
      console.warn('⚠️  Warning: Unexpected API response format')
      console.log('Response:', JSON.stringify(data, null, 2))
    }

  } catch (error) {
    console.error('❌ Error testing LunarCrush API:', error.message)

    if (error.message.includes('401')) {
      console.error('\n💡 Tip: Check if your API key is correct and has proper permissions')
    } else if (error.message.includes('429')) {
      console.error('\n💡 Tip: Rate limit reached. Wait a few minutes and try again.')
    } else if (error.message.includes('fetch')) {
      console.error('\n💡 Tip: Check your internet connection')
    }

    process.exit(1)
  }
}

testLunarCrushAPI()
