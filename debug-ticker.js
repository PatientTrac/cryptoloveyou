import dotenv from 'dotenv'
dotenv.config()

/**
 * Quick smoke test: CoinGecko markets (same source as homepage ticker).
 */
async function main() {
  const { fetchCoinGeckoMarketsTop, mapMarketRowToTickerCoin } = await import(
    './netlify/functions/utils/coingecko-homepage.js'
  )
  const eur = 0.92
  const markets = await fetchCoinGeckoMarketsTop({ perPage: 5 })
  console.log('\nCoinGecko /coins/markets (top 5 by cap):')
  markets.forEach(m => {
    const row = mapMarketRowToTickerCoin(m, eur)
    console.log(`  ${row.symbol} id=${row.id} USD=${row.price_usd} EUR=${row.price_eur} 24h=${row.change_24h}%`)
  })
}

main().catch(console.error)
