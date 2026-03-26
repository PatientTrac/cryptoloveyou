#!/usr/bin/env node

/**
 * LunarCrush API v4 Test
 * Based on official docs: https://lunarcrush.com/developers/api/overview
 * Base URL: https://lunarcrush.com/api4
 */

import 'dotenv/config'

const API_KEY = process.env.LUNARCRUSH_API_KEY

if (!API_KEY) {
  console.error('❌ LUNARCRUSH_API_KEY not found in .env')
  process.exit(1)
}

console.log('🔑 LunarCrush API Key:', API_KEY.substring(0, 15) + '...')
console.log('📚 API Documentation: https://lunarcrush.com/developers/api/overview')
console.log('🚀 Testing LunarCrush API v4...\n')

async function testLunarCrushV4() {
  try {
    // Test 1: Get trending coins (this is what we'll use in n8n)
    console.log('━'.repeat(70))
    console.log('📊 Test 1: Fetching Trending Coins')
    console.log('━'.repeat(70))

    const base = 'https://lunarcrush.com/api4/public/coins/list'
    const url = `${base}/v1?key=${API_KEY}&limit=5&sort=galaxy_score&desc=true`

    console.log('Endpoint:', url.replace(API_KEY, 'API_KEY_HIDDEN'))
    console.log('Method: GET')
    console.log('Fetching top 5 coins by Galaxy Score...\n')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    console.log('Status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('\n❌ API Error:')
      console.error(errorText)

      if (response.status === 401 || response.status === 403) {
        console.error('\n💡 Possible Issues:')
        console.error('   - API key may be invalid')
        console.error('   - Subscription may be inactive')
        console.error('   - Check: https://lunarcrush.com/developers/keys')
      }
      process.exit(1)
    }

    const data = await response.json()
    console.log('\n✅ API Response Received!')

    // Display the results
    if (data.data && Array.isArray(data.data)) {
      console.log(`\n📈 Top ${data.data.length} Trending Cryptocurrencies:\n`)

      data.data.forEach((coin, index) => {
        console.log(`${index + 1}. ${coin.name} (${coin.symbol})`)
        console.log(`   💰 Price: $${coin.price ? parseFloat(coin.price).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A'}`)
        console.log(`   📊 Galaxy Score: ${coin.galaxy_score || 'N/A'}`)
        console.log(`   📈 24h Change: ${coin.percent_change_24h ? (coin.percent_change_24h > 0 ? '+' : '') + coin.percent_change_24h.toFixed(2) + '%' : 'N/A'}`)
        console.log(`   💬 Social Volume: ${coin.social_volume || 'N/A'}`)
        console.log(`   🏆 Market Cap Rank: #${coin.market_cap_rank || 'N/A'}`)
        console.log(`   🔗 Market Cap: $${coin.market_cap ? parseFloat(coin.market_cap).toLocaleString() : 'N/A'}`)
        console.log('')
      })

      // Show what data will be sent to Claude for article generation
      const topCoin = data.data[0]
      const today = new Date().toISOString().split('T')[0]

      console.log('━'.repeat(70))
      console.log('📝 Sample Article Generation Data (for n8n → Claude)')
      console.log('━'.repeat(70))
      console.log(JSON.stringify({
        name: topCoin.name,
        symbol: topCoin.symbol,
        price: topCoin.price,
        percent_change_24h: topCoin.percent_change_24h,
        galaxy_score: topCoin.galaxy_score,
        social_volume: topCoin.social_volume,
        market_cap_rank: topCoin.market_cap_rank,
        market_cap: topCoin.market_cap,
        suggested_slug: `${topCoin.symbol.toLowerCase()}-analysis-${today}`,
        article_title: `${topCoin.name} (${topCoin.symbol}) Analysis - ${today}`,
        category: 'trending'
      }, null, 2))

      console.log('\n━'.repeat(70))
      console.log('✅ SUCCESS! LunarCrush API v4 is Working Perfectly!')
      console.log('━'.repeat(70))

      console.log('\n🎯 Next Steps to Complete Phase 2:')
      console.log('')
      console.log('1. ✅ LunarCrush API - WORKING')
      console.log('2. ⏳ Get Anthropic (Claude) API Key')
      console.log('   → Visit: https://console.anthropic.com/')
      console.log('   → Create API key')
      console.log('   → Add to .env as ANTHROPIC_API_KEY')
      console.log('')
      console.log('3. ⏳ Run Supabase Migration')
      console.log('   → Open: Supabase Dashboard → SQL Editor')
      console.log('   → Run: supabase/migrations/002_ai_articles_schema.sql')
      console.log('')
      console.log('4. ⏳ Set up n8n Workflow')
      console.log('   → Follow: N8N_WORKFLOW_GUIDE.md')
      console.log('   → Import workflow')
      console.log('   → Add API keys')
      console.log('   → Test manually')
      console.log('')
      console.log('5. ⏳ Deploy to Netlify')
      console.log('   → Add environment variables')
      console.log('   → Deploy from feature/phase2 branch')
      console.log('')

    } else {
      console.log('⚠️  Unexpected response format:')
      console.log(JSON.stringify(data, null, 2).substring(0, 500))
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error('\n💡 Troubleshooting:')
    console.error('   - Check internet connection')
    console.error('   - Verify API key in .env file')
    console.error('   - Ensure LunarCrush subscription is active')
    console.error('   - Visit: https://lunarcrush.com/developers')
    process.exit(1)
  }
}

// Run the test
testLunarCrushV4()
