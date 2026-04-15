# CryptoLoveYou — Static Site + Serverless Backend

**Live site:** [cryptoloveyou.com](https://cryptoloveyou.com)  
**Hosting:** Netlify (static) + Netlify Functions (serverless)  
**Repo:** [github.com/PatientTrac/cryptoloveyou](https://github.com/PatientTrac/cryptoloveyou)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  cryptoloveyou.com                   │
│                                                      │
│  WordPress (blog/news articles via static export)   │
│  + Static HTML (/en/ guide pages, category hubs)   │
│  + Netlify Functions (serverless API layer)         │
└──────────┬───────────────────────┬──────────────────┘
           │                       │
           ▼                       ▼
  ┌─────────────────┐    ┌──────────────────┐
  │ Netlify Functions│    │  External APIs   │
  │  (serverless)   │    │  CoinGecko       │
  └──────┬──────────┘    │  Anthropic Claude│
         │               │  HubSpot CRM     │
         ▼               └──────────────────┘
  ┌─────────────┐
  │  Supabase   │
  │ (PostgreSQL)│
  └─────────────┘
```

---

## 📁 Project Structure

```
.
├── en/                                   # English guide pages (primary SEO hub)
│   ├── index.html                        # /en/ landing page
│   ├── best-ai-crypto-projects-2026.html
│   ├── best-crypto-exchanges-2026.html
│   ├── best-crypto-wallets-2026.html
│   ├── how-to-buy-crypto-2026.html
│   ├── make-money-with-ai-crypto-2026.html
│   ├── crypto-tax-guide-2026.html
│   ├── about-us.html
│   ├── affiliate-disclosure.html
│   └── privacy-policy.html
│
├── es/ de/ fr/ pt/ zh/ ru/               # Language redirect stubs → /en/
│   ├── best-ai-crypto-projects-2026.html # noindex + instant JS redirect
│   ├── best-crypto-exchanges-2026.html
│   ├── best-crypto-wallets-2026.html
│   ├── how-to-buy-crypto-2026.html
│   ├── make-money-with-ai-crypto-2026.html
│   ├── crypto-tax-guide-2026.html
│   ├── about-us.html
│   ├── affiliate-disclosure.html
│   └── privacy-policy.html
│
├── category/                             # WordPress category pages (enhanced)
│   ├── ai-for-beginners/index.html       # Hero + learning path + FAQ + AI widget
│   ├── ai-tips/index.html                # Hero + skill cards + FAQ + AI widget
│   ├── make-money-with-ai/index.html     # Hero + income cards + FAQ + AI widget
│   ├── ai-news/index.html
│   ├── crypto-news/index.html
│   ├── reviews/index.html
│   └── stock-news/index.html
│
├── netlify/
│   └── functions/
│       ├── submit-contact.js             # Contact form → Supabase + HubSpot
│       ├── hubspot-sync.js               # Manual HubSpot sync
│       ├── generate-article.js           # AI article generation (Claude API)
│       ├── scheduled-trending-seo.js     # Daily trending article (9am UTC)
│       ├── run-trending-seo.js           # Manual article generation trigger
│       ├── update-homepage-content.js    # Homepage content updater
│       ├── generate-sitemap.js           # Dynamic sitemap generator
│       ├── grok-chat.js                  # Grok chatbot widget backend
│       ├── admin-affiliate.js            # Affiliate admin API
│       ├── track-affiliate.js            # Affiliate tracking
│       ├── track-affiliate-click.js      # Affiliate click recording
│       ├── auth.js                       # Admin authentication
│       ├── submit.js                     # Generic form submission
│       └── utils/
│           ├── supabase.js
│           ├── hubspot.js
│           └── validation.js
│
├── supabase/migrations/
│   └── 001_initial_schema.sql            # contacts, leads, affiliate_tracking tables
│
├── js/
│   └── grok-chat-widget.js               # Grok AI chatbot (client-side)
│
├── admin/                                # Admin portal (noindex, nofollow)
│
├── _redirects                            # Netlify redirect + rewrite rules
├── netlify.toml                          # Build config, headers, function schedule
├── robots.txt                            # Disallow nothing; points to sitemap_index
├── sitemap_index.xml                     # Master sitemap submitted to Google
├── seo-sitemap.xml                       # Guide pages with hreflang alternates
├── post-sitemap.xml                      # WordPress posts (~900 articles)
├── post-sitemap2.xml                     # WordPress posts continued
├── page-sitemap.xml                      # WordPress static pages
└── category-sitemap.xml                  # 7 category pages
```

---

## ✨ Features

### `/en/` Guide Pages — SEO Content Hub

Six fully built high-value guide pages:

| URL | Target Keywords | Schema |
|-----|----------------|--------|
| `/en/best-ai-crypto-projects-2026` | AI crypto, TAO, RENDER, FET | Article + FAQPage |
| `/en/best-crypto-exchanges-2026` | crypto exchanges 2026, Bybit | Article + FAQPage |
| `/en/best-crypto-wallets-2026` | Ledger vs Trezor, crypto wallets | Article + FAQPage |
| `/en/how-to-buy-crypto-2026` | how to buy crypto, beginner | HowTo + FAQPage |
| `/en/make-money-with-ai-crypto-2026` | AI crypto income, TAO staking | Article + FAQPage |
| `/en/crypto-tax-guide-2026` | crypto taxes 2026, Koinly | Article + FAQPage |

Each guide page has:
- ✅ Title ≤60 chars, meta description 150–200 chars
- ✅ `<link rel="canonical">` (absolute URL)
- ✅ Open Graph tags: `og:title`, `og:description`, `og:image`, `og:url`
- ✅ Twitter Card tags
- ✅ FAQPage JSON-LD (rich results eligible — FAQ accordions in SERPs)
- ✅ Article/HowTo JSON-LD with author, publisher, dateModified
- ✅ Hreflang alternates for all 7 languages + `x-default`
- ✅ Hero section with gradient design and CTAs
- ✅ Explainer cards (4 topic cards)
- ✅ Curated reading path (5 must-read articles)
- ✅ FAQ accordion (8–10 questions, JavaScript toggle)
- ✅ Claude-powered AI chat widget (page-specific system prompt, 6 suggested chips)
- ✅ Affiliate partner banners (Payset, SafeLynx)
- ✅ Affiliate disclaimer footer

### Category Pages

Three fully enhanced with content hub treatment:

| Category | Theme | Content Added |
|----------|-------|---------------|
| `/category/ai-for-beginners/` | Purple/cyan | Hero, 4 concept cards, 5-step learning path, 8-item FAQ, AI widget |
| `/category/ai-tips/` | Amber/purple | Hero, 4 skill cards, 5 must-read tips, 8-item FAQ, AI widget |
| `/category/make-money-with-ai/` | Green | Hero, 4 income cards, 5 income methods, 8-item FAQ, AI widget |

All 7 category pages updated with:
- ✅ Meta descriptions (were missing across all)
- ✅ Absolute canonical URLs (were relative)

### Multilingual Routing — 7 Languages

Languages supported: **EN · ES · DE · FR · PT · ZH · RU**

Architecture:
- `/en/` — full content, all SEO signals
- `/es/`, `/de/`, `/fr/`, `/pt/`, `/zh/`, `/ru/` — lightweight stubs with `noindex, follow` + instant redirect to `/en/`
- Hreflang tags on every page for Google language targeting
- Netlify `_redirects` handles browser language detection for root `/*` paths

### Netlify Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| `submit-contact` | `POST /api/contact` | Validates form → Supabase → HubSpot |
| `hubspot-sync` | Manual POST | Retry failed HubSpot syncs |
| `generate-article` | HTTP | Generate AI article via Claude |
| `scheduled-trending-seo` | Daily 9am UTC | Auto-generate trending crypto/AI article |
| `run-trending-seo` | Manual POST | Manually trigger article generation |
| `update-homepage-content` | Scheduled | Refresh homepage data blocks |
| `generate-sitemap` | `GET /sitemap.xml` | Dynamic sitemap including new articles |
| `grok-chat` | POST | Grok AI chatbot responses |
| `admin-affiliate` | Admin API | Manage affiliate partners + view stats |
| `track-affiliate-click` | `GET /aff/:platform` | Record affiliate clicks to Supabase |
| `auth` | POST | Admin portal JWT auth |

### AI Chat Widgets

All guide pages and 3 enhanced category pages embed a Claude-powered chat assistant:

- **Model:** `claude-sonnet-4-20250514`, `max_tokens: 1000`
- **Auth:** `anthropic-dangerous-allow-browser: true`
- **Per-page system prompts:** crypto exchanges expert, wallet security expert, tax guide, etc.
- **UX:** 6 suggested chips → disable after use, typing indicator, scrollable history, Enter-to-send

---

## 🔍 SEO Configuration

### Sitemaps

| File | Content | In Index |
|------|---------|----------|
| `sitemap_index.xml` | References all child sitemaps | ✅ Submitted to GSC |
| `seo-sitemap.xml` | 6 guide pages + homepage, hreflang per URL | ✅ |
| `post-sitemap.xml` | ~900 WordPress blog/news articles | ✅ |
| `post-sitemap2.xml` | Remaining WordPress articles | ✅ |
| `page-sitemap.xml` | WordPress static pages | ✅ |
| `category-sitemap.xml` | 7 category archive pages | ✅ |

All sitemap `<loc>` URLs use absolute `https://cryptoloveyou.com/` paths.

### Key `_redirects` Rules

```
# Clean URLs for /en/ guide pages (extensionless)
/en/best-ai-crypto-projects-2026   →  /en/best-ai-crypto-projects-2026.html   (200)

# Language stub pages
/es/best-ai-crypto-projects-2026   →  /es/best-ai-crypto-projects-2026.html   (200)
# [same pattern for de/fr/pt/zh/ru]

# Root clean URLs (no /en/ prefix)
/best-ai-crypto-projects-2026      →  /en/best-ai-crypto-projects-2026.html   (301)

# Locale homepages
/es   →  /es/index.html   (200)
/de   →  /de/index.html   (200)

# Browser language detection
/*   →  /en/:splat   (302, Language=en)
/*   →  /fr/:splat   (302, Language=fr)
# [etc.]

# API functions bypass language routing
/api/*   →  /.netlify/functions/:splat   (200)
```

### `netlify.toml` Headers

| Paths | Headers |
|-------|---------|
| `/*` | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` |
| `/*.css`, `/*.js`, `/*.jpg`, `/*.png`, `/*.webp` | `Cache-Control: public, max-age=31536000, immutable` |
| `/`, `/category/*`, `/en/*` | `Cache-Control: public, max-age=0, must-revalidate` |
| `/admin/*` | `X-Robots-Tag: noindex, nofollow` |
| `/.netlify/functions/*` | CORS headers for API |

---

## 🛒 Affiliate Setup

Guide pages include tracked affiliate links for:

| Partner | Guide Pages | Category |
|---------|------------|----------|
| Bybit | exchanges, buy-crypto, wallets | Exchange |
| Binance | exchanges, buy-crypto | Exchange |
| MEXC, KuCoin, OKX | exchanges | Exchange |
| Coinbase, Kraken | exchanges | Exchange |
| Changelly | exchanges, buy-crypto | Swap |
| SafeLynx, Payset | exchanges | Exchange |
| Ledger | wallets | Hardware wallet |
| Trezor | wallets | Hardware wallet |
| Koinly | crypto-tax-guide | Tax software |

Clicks tracked via: `/aff/:platform` → `track-affiliate-click` function → Supabase `affiliate_tracking` table.

---

## 🔄 Automated Content Pipeline

### Daily Trending Articles

Scheduled Netlify Function (`scheduled-trending-seo`, 9am UTC):

1. Fetch trending tokens from CoinGecko API
2. Select top trending token not yet published today
3. Generate 600-word SEO article via Claude API
4. Create `/{slug}/index.html` via GitHub API
5. Netlify auto-redeploys on push

### Homepage Updates

Separate scheduled function refreshes live market data and featured article blocks.

---

## 🚀 Local Development

```bash
npm install
cp .env.example .env      # Fill in credentials
npx netlify dev           # Runs at http://localhost:8888
```

### Deploy

```bash
git push origin main      # Auto-deploy via Netlify CI/CD
```

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | ✅ | Supabase service role key |
| `HUBSPOT_API_KEY` | ✅ | HubSpot private app key |
| `ANTHROPIC_API_KEY` | ✅ | Claude API key (article generation) |
| `SYNC_API_KEY` | ⚠️ | Auth for manual HubSpot sync endpoint |
| `ADMIN_API_KEY` | ⚠️ | Auth for admin portal API |

---

## 🗺️ Roadmap

### ✅ Done
- Netlify static site + serverless backend
- Supabase PostgreSQL + HubSpot CRM integration
- 6 SEO-optimised `/en/` guide pages with full metadata
- Claude AI chat widgets on all guide + 3 category pages
- Multilingual routing (7 languages, 42 URL combinations)
- FAQPage + Article JSON-LD schema on all guide pages
- Full SEO audit: canonicals, OG tags, meta descriptions, sitemap index, clean URLs
- Daily automated trending article pipeline
- Affiliate click tracking system
- Admin portal

### 🔄 Planned
- [ ] Hero + FAQ + AI widget on `ai-news`, `crypto-news`, `reviews`, `stock-news`
- [ ] Social Open Graph banner images for guide pages (1200×630)
- [ ] Admin revenue analytics dashboard
- [ ] Social media auto-posting from trending articles
- [ ] Email newsletter integration

---

**Built for [CryptoLoveYou.com](https://cryptoloveyou.com) · Operated by AegisIQ Limited, Hong Kong**
