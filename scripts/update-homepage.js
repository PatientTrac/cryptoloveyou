#!/usr/bin/env node

/**
 * Standalone script to update homepage content
 * Designed to run in GitHub Actions environment
 */

import { handler as updateHomepageHandler } from '../netlify/functions/update-homepage-content.js'

async function main() {
  try {
    console.log('🚀 Starting homepage content update...')
    console.log('⏰ Time:', new Date().toISOString())

    // Call the handler which will:
    // 1. Fetch trending coins from LunarCrush
    // 2. Fetch stock/AI news
    // 3. Generate content with Claude
    // 4. Write JSON files to content/homepage/
    const result = await updateHomepageHandler({
      httpMethod: 'POST',
      body: '{}'
    })

    const body = JSON.parse(result.body)

    if (result.statusCode === 200 || result.statusCode === 207) {
      console.log('✅ Homepage content updated successfully!')
      console.log('📊 Results:', JSON.stringify(body.results, null, 2))

      if (body.results.errors && body.results.errors.length > 0) {
        console.warn('⚠️  Some sections had errors:', body.results.errors)
        // Don't exit with error code if at least one section succeeded
        process.exit(0)
      }

      process.exit(0)
    } else {
      console.error('❌ Homepage update failed')
      console.error('Status:', result.statusCode)
      console.error('Error:', body.error || 'Unknown error')
      console.error('Details:', JSON.stringify(body, null, 2))
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Fatal error during homepage update:')
    console.error(error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
