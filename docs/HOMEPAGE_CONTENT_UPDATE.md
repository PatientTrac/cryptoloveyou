# Homepage Content Update System

This document describes the second, separate pipeline for dynamically updating homepage content sections using AI-generated JSON files.

## Overview

This system updates eligible homepage content sections every 6 hours without modifying the existing article generation pipeline. It safely skips video sections ("Make Money with AI" and "AI for Beginners") that contain YouTube embeds.

## Architecture

### 1. Content JSON Files (`content/homepage/`)

- **featured.json** - Featured article (hero section)
- **latest-news.json** - Latest News tabbed section
- **stock-news.json** - Stock News sidebar section
- **ai-news.json** - AI News section
- **ticker.json** - Crypto price ticker (CoinGecko `/coins/markets`, no Claude)

### 2. Netlify Function (`netlify/functions/update-homepage-content.js`)

**What it does:**
- Fetches crypto ticker + trending from CoinGecko (`/coins/markets`, `/search/trending`)
- Fetches **live EUR/USD exchange rate** from exchangerate-api.com (free tier)
- Fetches stock news from **Reuters Business RSS + Yahoo Finance RSS** (no API key needed)
- Fetches AI news from **VentureBeat AI, MIT News AI, The Verge AI RSS feeds** (no API key needed)
- Uses Claude API to generate content for each section based on **real RSS data** (except ticker)
- Writes JSON files to `content/homepage/`
- Handles errors per-section (one failure doesn't block others)

**Environment variables needed:**
- `ANTHROPIC_API_KEY` - For content generation
- Optional: `COINGECKO_API_KEY` and `COINGECKO_USE_PRO` - Higher CoinGecko rate limits (public API works without a key)

**External APIs used (no keys needed):**
- exchangerate-api.com - Live EUR/USD rates (1500 req/month free)
- Reuters RSS - Business/market news
- Yahoo Finance RSS - Stock market headlines
- VentureBeat AI RSS - AI industry news
- MIT News AI RSS - AI research news
- The Verge AI RSS - AI tech news

### 3. Frontend Loader (`assets/js/homepage-content-loader.js`)

**Safety features:**
- Checks each section for iframes before modifying
- Skips any section containing YouTube embeds
- Preserves existing CSS classes exactly
- Falls back to hardcoded HTML if JSON fetch fails

**Sections updated:**
- Crypto price ticker (top bar + sidebar)
- Featured article (hero section)
- Latest News (with category tabs)
- Stock News (sidebar)
- AI News (main section)

**Sections NEVER touched:**
- Make Money with AI (contains YouTube videos)
- AI for Beginners (contains YouTube videos)

### 4. GitHub Actions Workflow (`.github/workflows/update-homepage-content.yml`)

**Schedule:** Every 6 hours (`0 */6 * * *`)

**Steps:**
1. Checkout repository
2. Install dependencies
3. Run `scripts/update-homepage.js`
4. Commit JSON changes to `content/homepage/*.json`
5. Push to repository
6. Netlify auto-deploys (JSON-only changes = fast deploy)

## Data Flow

```
GitHub Actions (every 6 hours)
  ↓
scripts/update-homepage.js
  ↓
netlify/functions/update-homepage-content.js
  ↓
CoinGecko API → Ticker JSON (direct)
  ↓
CoinGecko API → Claude API → Featured/News JSON
  ↓
Write content/homepage/*.json
  ↓
Commit & Push
  ↓
Netlify Deploy
  ↓
Browser loads index.html
  ↓
assets/js/homepage-content-loader.js
  ↓
Fetch JSON files
  ↓
Render sections (skip iframes)
```

## File Structure

```
crypto-static-love-You/
├── content/
│   └── homepage/
│       ├── featured.json
│       ├── latest-news.json
│       ├── stock-news.json
│       ├── ai-news.json
│       └── ticker.json
├── netlify/
│   └── functions/
│       └── update-homepage-content.js
├── scripts/
│   └── update-homepage.js
├── assets/
│   └── js/
│       └── homepage-content-loader.js
├── .github/
│   └── workflows/
│       └── update-homepage-content.yml
└── index.html (with data-section attributes)
```

## HTML Modifications

Only two types of changes were made to `index.html`:

1. **Data-section attributes** added to eligible containers:
   - `data-section="ticker"`
   - `data-section="featured"`
   - `data-section="latest-news"`
   - `data-section="stock-news"`
   - `data-section="ai-news"`

2. **Script tag** added before `</body>`:
   ```html
   <script src="/assets/js/homepage-content-loader.js" defer></script>
   ```

## Date Format

All dates use the format: `"March 18, 2026"` (matching the existing site format)

## Currency

Ticker prices are in EUR (€) using **live exchange rates** fetched from exchangerate-api.com. Falls back to 0.92 if the API is unavailable.

## Error Handling

- Each section updates independently
- If one section fails, others continue
- Failed fetches leave existing hardcoded HTML intact
- Errors logged to console
- GitHub Actions job succeeds if at least one section updates

## Testing

### Manual trigger:
```bash
# From GitHub Actions UI
Go to Actions → Update Homepage Content → Run workflow

# Or locally
node scripts/update-homepage.js
```

### Verify output:
```bash
ls -la content/homepage/
cat content/homepage/ticker.json
```

## Safety Guarantees

1. ✅ **Existing pipeline untouched** - Article generation workflow unchanged
2. ✅ **No video sections modified** - Iframe detection prevents any changes
3. ✅ **CSS preserved** - All existing classes remain identical
4. ✅ **Layout unchanged** - Only content swapped, structure preserved
5. ✅ **Fallback on errors** - Existing HTML remains if JSON fails
6. ✅ **Fast deploys** - Only JSON files change, not HTML/CSS/JS

## Maintenance

### To add a new section:
1. Create JSON schema in `content/homepage/`
2. Add data-fetching logic to `update-homepage-content.js`
3. Add render function to `homepage-content-loader.js`
4. Add `data-section="new-section"` to `index.html`

### To update Claude prompts:
Edit the prompt strings in `netlify/functions/update-homepage-content.js`

### To change update frequency:
Modify cron schedule in `.github/workflows/update-homepage-content.yml`

## Dependencies

**Paid/API Key Required:**
- Anthropic Claude API (content generation based on real RSS data)

**Free (No API Key):**
- CoinGecko public API (ticker + trending; optional `COINGECKO_API_KEY` for higher limits)
- exchangerate-api.com (live EUR/USD rates, 1500 req/month)
- Reuters Business RSS feed
- Yahoo Finance RSS feed
- VentureBeat AI RSS feed
- MIT News AI RSS feed
- The Verge AI RSS feed

**Infrastructure:**
- Node.js 20+
- GitHub Actions
- Netlify (auto-deploy)

## Notes

- This system is completely independent of the article generation pipeline
- No shared state or imports between the two systems
- The frontend loader runs client-side on every page load
- JSON files are committed to git (not ignored)
- Updates run automatically every 6 hours
- Manual triggers available via GitHub Actions UI
