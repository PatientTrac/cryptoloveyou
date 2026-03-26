# Quick Start Guide - Phase 2 (Static Publisher + Affiliate Tracking)
**Status**: Ready to Test
**Date**: March 25, 2026

---

## ✅ What's Already Done

- ✅ LunarCrush API Key obtained
- ✅ Supabase schema available for click tracking (`004_affiliate_clicks_only.sql`)
- ✅ Netlify functions built (3 functions)
- ✅ HTML templates created (`templates/*.hbs`) for `seo_article`, `review_page`, `money_page`
- ✅ Dependencies added to `package.json`
- ✅ Environment variables configured in `.env`
- ✅ Test script created (`test-lunarcrush.js`)

---

## 🚀 Quick Start (4 Steps to First Pages)

### Step 1: Install Dependencies (2 minutes)

```bash
npm install
```

This installs:
- `handlebars` - Template rendering
- `marked` - Markdown to HTML conversion
- `simple-git` - Git operations for publishing
- `dotenv` - Environment variable management

---

### Step 2: Run Supabase Migration (3 minutes)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase/migrations/004_affiliate_clicks_only.sql`
4. Paste and click **Run**
5. Verify tables created:
   - `affiliate_clicks` (tracks clicks and conversions)

**Verification:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('affiliate_clicks');
```

---

### Step 3: Test LunarCrush API (1 minute)

```bash
node test-lunarcrush.js
```

**Expected Output:**
```
🔑 LunarCrush API Key: cj5da4tlf...
🚀 Testing LunarCrush API connection...

📊 Test 1: Fetching top 5 trending coins by Galaxy Score...
✅ API Response received!

📈 Top 5 Trending Cryptocurrencies:

1. Bitcoin (BTC)
   💰 Price: $67,234.56
   📊 Galaxy Score: 87.5
   ...
```

**If it fails:**
- Check internet connection
- Verify API key in `.env` file
- Check LunarCrush API status: https://lunarcrush.com/developers/status

---

### Step 4: Get Anthropic (Claude) API Key (5 minutes)

1. Go to: https://console.anthropic.com/
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-`)
6. Add to `.env` file:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

**Cost Estimate:**
- ~$0.015 per article (Claude Sonnet 3.5)
- 30 articles/month = ~$0.45/month
- Very affordable!

---

### Step 5: No n8n required

Publishing is automated via **Netlify Scheduled Functions** (see `netlify/functions/scheduled-trending-seo.js`).

---

## 🧪 Testing the Complete Flow

### Test 1: Generate pages locally (no Supabase article saving)

Run:
```bash
ARTICLE_GENERATION_API_KEY=dev_test_key SKIP_GIT_COMMIT=true SKIP_GIT_PUSH=true NODE_ENV=development node scripts/smoke-generate-pages.js
```

Expected:
- ✅ 3 folders created: `/smoke-seo-.../`, `/smoke-review-.../`, `/smoke-money-.../`
- ✅ Each has `index.html` rendered from the correct template

---

### Test 2: Affiliate Link Tracking

Visit: `https://cryptoloveyou.com/aff/binance`

**Expected Result:**
- ✅ Redirects to Binance affiliate URL
- ✅ Click recorded in `affiliate_clicks` table

**Verify in Supabase:**
```sql
SELECT * FROM affiliate_clicks ORDER BY clicked_at DESC LIMIT 5;
```

---

### Test 3: Sitemap Generation

Visit: `https://cryptoloveyou.com/sitemap.xml`

**Expected Result:**
- ✅ XML sitemap returned
- ✅ Includes all static pages
- ✅ (Optional) Includes Supabase articles only if `ENABLE_SUPABASE_ARTICLES=true`

---

## 📋 Pre-Launch Checklist

Before going live with automated article generation:

- [ ] Dependencies installed (`npm install`)
- [ ] Supabase migration run successfully (for click tracking)
- [ ] LunarCrush API tested (✅ Done!)
- [ ] Anthropic API key obtained and tested
- [ ] Scheduled function tested manually (`/.netlify/functions/run-trending-seo`)
- [ ] Test pages generated successfully
- [ ] Affiliate links tracking verified
- [ ] Sitemap includes new articles
- [ ] Environment variables set in Netlify:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_KEY`
  - [ ] `LUNARCRUSH_API_KEY`
  - [ ] `ANTHROPIC_API_KEY`
  - [ ] `ARTICLE_GENERATION_API_KEY`
  - [ ] Affiliate URLs (Binance, Coinbase, etc.)

---

## 🎯 Your Next Immediate Steps

1. **Run the LunarCrush test:**
   ```bash
   node test-lunarcrush.js
   ```

2. **Get your Anthropic API key** (5 mins):
   - https://console.anthropic.com/

3. **Run Supabase migration** (3 mins):
   - Copy `supabase/migrations/002_ai_articles_schema.sql`
   - Run in Supabase SQL Editor

4. **Install dependencies** (2 mins):
   ```bash
   npm install
   ```

5. **Choose n8n hosting**:
   - Cloud ($20/mo) - easiest
   - Self-hosted (FREE) - requires Docker

---

## 💰 Monthly Cost Breakdown

| Service | Cost | Required? |
|---------|------|-----------|
| LunarCrush API (Builder) | $240 | ✅ Yes |
| Anthropic Claude API | ~$1-5 | ✅ Yes |
| n8n Cloud | $20 | Optional (can self-host) |
| OpenAI (images) | ~$10-20 | ❌ No (optional) |
| **Total (Cloud)** | **$261-285/mo** | |
| **Total (Self-hosted)** | **$241-265/mo** | |

**Expected ROI:**
- 30 SEO-optimized articles/month
- Affiliate revenue (variable)
- Increased organic traffic
- Passive income potential

---

## 🆘 Troubleshooting

### Issue: LunarCrush API test fails
**Solution:**
- Verify API key in `.env` file
- Check subscription status at LunarCrush dashboard
- Ensure you have the Builder plan ($240/mo)

### Issue: npm install fails
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Supabase migration fails
**Solution:**
- Check if tables already exist
- Drop existing tables first:
  ```sql
  DROP TABLE IF EXISTS affiliate_clicks CASCADE;
  DROP TABLE IF EXISTS ai_articles CASCADE;
  ```
- Run migration again

### Issue: Netlify function timeout
**Solution:**
- Functions have 10-second timeout on free tier
- Upgrade to Pro ($19/mo) for 26-second timeout
- Or optimize markdown conversion

---

## 📚 Documentation Files

- `PHASE2_IMPLEMENTATION.md` - Overall implementation guide
- `N8N_WORKFLOW_GUIDE.md` - Detailed n8n setup (THIS IS YOUR MAIN GUIDE)
- `QUICK_START_GUIDE.md` - This file (quick reference)
- `supabase/migrations/002_ai_articles_schema.sql` - Database schema
- `templates/article.hbs` - HTML template for articles

---

## ✨ What Happens After Setup?

1. **Daily at 9 AM UTC:**
   - n8n workflow triggers
   - Fetches top 5 trending coins from LunarCrush
   - Claude generates article about #1 trending coin
   - Article saved to Supabase with `status='review'`

2. **Manual Review (initially):**
   - Check Supabase dashboard
   - Review article quality
   - Call Netlify function to publish approved articles

3. **Auto-Publish (after testing):**
   - Set `AUTO_PUBLISH=true` in n8n
   - Articles auto-publish without manual review
   - Monitor quality weekly

4. **Passive Income:**
   - Articles rank in Google
   - Users click affiliate links
   - Track conversions in Supabase
   - Optimize based on performance data

---

**Ready to start?** Run the test script:

```bash
node test-lunarcrush.js
```

Good luck! 🚀
