#!/usr/bin/env node

/**
 * LunarCrush API v4 - FINAL WORKING TEST
 * Endpoint: https://lunarcrush.com/api4/public/coins/list/v2
 * Auth: Bearer token in Authorization header
 */

import 'dotenv/config'

const API_KEY = process.env.LUNARCRUSH_API_KEY

if (!API_KEY) {
  console.error('❌ LUNARCRUSH_API_KEY not found in .env')
  process.exit(1)
}

console.log('━'.repeat(70))
console.log('🚀 LunarCrush API v4 - Phase 2 Test')
console.log('━'.repeat(70))
console.log(`🔑 API Key: ${API_KEY.substring(0, 15)}...`)
console.log('📚 Docs: https://lunarcrush.com/developers/api/overview')
console.log('━'.repeat(70))
console.log('')

async function testCoinsAPI() {
  try {
    const url = 'https://lunarcrush.com/api4/public/coins/list/v2?sort=galaxy_score&limit=5&desc=true'

    console.log('📡 Endpoint: ' + url)
    console.log('🔐 Auth: Bearer token')
    console.log('📊 Fetching top 5 coins by Galaxy Score...\n')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json'
      }
    })

    console.log(`📍 Status: ${response.status} ${response.statusText}\n`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ API Error Response:')
      console.error(errorText)

      if (response.status === 401 || response.status === 403) {
        console.error('\n💡 Authentication Failed:')
        console.error('   → Check API key: https://lunarcrush.com/developers/keys')
        console.error('   → Verify subscription is active')
        console.error('   → Ensure you have Builder plan ($240/mo)')
      }
      process.exit(1)
    }

    const json = await response.json()

    if (!json.data || !Array.isArray(json.data)) {
      console.error('⚠️  Unexpected response format:')
      console.log(JSON.stringify(json, null, 2).substring(0, 500))
      process.exit(1)
    }

    console.log('✅ API WORKING! Received', json.data.length, 'coins\n')
    console.log('━'.repeat(70))
    console.log('📈 TOP 5 TRENDING CRYPTOCURRENCIES (by Galaxy Score)')
    console.log('━'.repeat(70))
    console.log('')

    json.data.forEach((coin, index) => {
      console.log(`${index + 1}. ${coin.name} (${coin.symbol})`)
      console.log(`   💰 Price: $${coin.price ? parseFloat(coin.price).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 6}) : 'N/A'}`)
      console.log(`   ⭐ Galaxy Score: ${coin.galaxy_score || 'N/A'}/100`)
      console.log(`   🏆 AltRank: #${coin.alt_rank || 'N/A'}`)
      console.log(`   📊 Market Cap Rank: #${coin.market_cap_rank || 'N/A'}`)
      console.log(`   📈 24h Change: ${coin.percent_change_24h ? (coin.percent_change_24h > 0 ? '+' : '') + coin.percent_change_24h.toFixed(2) + '%' : 'N/A'}`)
      console.log(`   💬 Social Volume (24h): ${coin.social_volume_24h || 'N/A'}`)
      console.log(`   👥 Contributors: ${coin.num_contributors || 'N/A'}`)
      console.log('')
    })

    // Show sample data for Claude
    const topCoin = json.data[0]
    const today = new Date().toISOString().split('T')[0]

    console.log('━'.repeat(70))
    console.log('📝 SAMPLE DATA FOR CLAUDE (Article Generation)')
    console.log('━'.repeat(70))
    console.log('')
    console.log(JSON.stringify({
      coin: {
        name: topCoin.name,
        symbol: topCoin.symbol,
        price: topCoin.price,
        galaxy_score: topCoin.galaxy_score,
        alt_rank: topCoin.alt_rank,
        market_cap_rank: topCoin.market_cap_rank,
        percent_change_24h: topCoin.percent_change_24h,
        social_volume_24h: topCoin.social_volume_24h,
        num_contributors: topCoin.num_contributors
      },
      article: {
        slug: `${topCoin.symbol.toLowerCase()}-analysis-${today}`,
        title: `${topCoin.name} (${topCoin.symbol}) Price Analysis & Prediction ${new Date().getFullYear()}`,
        category: 'trending',
        focus_keyword: `${topCoin.name.toLowerCase()} analysis`
      }
    }, null, 2))

    console.log('')
    console.log('━'.repeat(70))
    console.log('✅ SUCCESS! LunarCrush API v4 Integration Working!')
    console.log('━'.repeat(70))
    console.log('')
    console.log('🎯 NEXT STEPS:')
    console.log('')
    console.log('  1. ✅ LunarCrush API - VERIFIED & WORKING')
    console.log('')
    console.log('  2. ⏳ Get Anthropic (Claude) API Key')
    console.log('     → https://console.anthropic.com/')
    console.log('     → Create API key')
    console.log('     → Add to .env: ANTHROPIC_API_KEY=sk-ant-...')
    console.log('')
    console.log('  3. ⏳ Run Supabase Migration')
    console.log('     → Supabase Dashboard → SQL Editor')
    console.log('     → Copy & run: supabase/migrations/002_ai_articles_schema.sql')
    console.log('')
    console.log('  4. ⏳ Deploy Environment Variables to Netlify')
    console.log('     → Netlify Dashboard → Site Settings → Environment Variables')
    console.log('     → Add all keys from .env file')
    console.log('')
    console.log('  5. ⏳ Set up n8n Workflow')
    console.log('     → Cloud: https://n8n.cloud ($20/mo)')
    console.log('     → Self-hosted: Docker (FREE)')
    console.log('     → Follow: N8N_WORKFLOW_GUIDE.md')
    console.log('')
    console.log('  6. ⏳ Test Complete Flow')
    console.log('     → Manual n8n trigger')
    console.log('     → Verify article in Supabase')
    console.log('     → Publish test article')
    console.log('')
    console.log('📖 Documentation:')
    console.log('   → QUICK_START_GUIDE.md - Step-by-step setup')
    console.log('   → N8N_WORKFLOW_GUIDE.md - Workflow configuration')
    console.log('   → PHASE2_IMPLEMENTATION.md - Complete overview')
    console.log('')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error('\n💡 Troubleshooting:')
    console.error('   → Check internet connection')
    console.error('   → Verify .env file exists with LUNARCRUSH_API_KEY')
    console.error('   → Ensure API subscription is active')
    process.exit(1)
  }
}

testCoinsAPI()
