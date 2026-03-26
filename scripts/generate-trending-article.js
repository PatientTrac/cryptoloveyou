#!/usr/bin/env node

/**
 * Standalone script to generate trending SEO articles
 * Designed to run in GitHub Actions environment
 */

import { handler as scheduledHandler } from '../netlify/functions/scheduled-trending-seo.js'
import { handler as generateArticleHandler } from '../netlify/functions/generate-article.js'

async function main() {
  try {
    console.log('🚀 Starting trending article generation...')
    console.log('⏰ Time:', new Date().toISOString())

    // Call the scheduled handler which will:
    // 1. Fetch trending coin from LunarCrush
    // 2. Generate article with Claude
    // 3. Call generate-article to create HTML
    // 4. Commit and push to git (if SKIP_GIT_COMMIT/PUSH are not true)
    const result = await scheduledHandler()

    const body = JSON.parse(result.body)

    if (result.statusCode === 200 && body.success) {
      console.log('✅ Article generated successfully!')
      console.log('📝 Slug:', body.slug)
      console.log('📊 Details:', JSON.stringify(body, null, 2))
      process.exit(0)
    } else {
      console.error('❌ Article generation failed')
      console.error('Status:', result.statusCode)
      console.error('Error:', body.error || 'Unknown error')
      console.error('Details:', JSON.stringify(body, null, 2))
      process.exit(1)
    }
  } catch (error) {
    console.error('❌ Fatal error during article generation:')
    console.error(error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
