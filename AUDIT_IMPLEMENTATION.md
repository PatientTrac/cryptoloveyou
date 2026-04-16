# CryptoLoveYou — Audit Implementation Guide
## Based on: Michael Belgeri audit, 16 April 2026

---

## IMMEDIATE (deploy this week — security items)

### 1. Admin exposure + exposed dev files → netlify.toml

**What's fixed:** `/admin`, `/wp-admin`, all `.md`, `.py`, `.txt`, `test-*`, `debug-*`,
and all deployment documentation files now return 404. The admin directory confirms its
own existence when it returns 403 — returning 404 denies that it exists at all.

**Files changed:**
```
netlify.toml   ← replace current file with the new version
```

**Deploy:** commit + push → Netlify auto-deploys. Verify with:
```
curl -I https://www.cryptoloveyou.com/admin
# Expected: HTTP/2 404

curl -I https://www.cryptoloveyou.com/DEPLOYMENT_GUIDE.md
# Expected: HTTP/2 404
```

---

### 2. Content Security Policy → netlify.toml (same file)

**What's fixed:** The `Content-Security-Policy` header in `netlify.toml` closes the
affiliate link hijacking vector. The critical directive is `base-uri 'self'` — this
prevents `<base href="...">` injection which would redirect all relative affiliate
links to an attacker's domain without touching the link text.

**Current risk without CSP:**
- XSS injection can silently modify affiliate parameters
- A compromised plugin can inject `<base>` tag to redirect all outbound links
- No browser enforcement of which scripts/frames load

**After CSP deployment:**
Run a scan at https://securityheaders.com/?q=cryptoloveyou.com and verify A or A+ rating.

**Next step (after initial deployment):**
Remove `'unsafe-inline'` from `script-src` by implementing nonces. Until nonces are
added, `'unsafe-inline'` is required for SmartMag's inline scripts. This is a known
trade-off. The `base-uri 'self'` directive protects affiliate links regardless.

---

### 3. Dual-domain email configuration

**Audit finding:** cryptoloveyou.com and www.cryptoloveyou.com are configured
separately for email. Resend sends from one domain, contact forms another.
This creates SPF/DKIM mismatches that land in spam and split delivery reporting.

**Fix:**
1. Log into your DNS provider
2. Verify you have ONE set of SPF/DKIM/DMARC records, on `cryptoloveyou.com` (not `www`)
3. Your SPF record should be: `v=spf1 include:_spf.resend.com ~all`
4. DKIM: add the CNAME record from Resend dashboard → Domain Settings
5. DMARC: `v=DMARC1; p=quarantine; rua=mailto:dmarc@cryptoloveyou.com; pct=100`
6. In `netlify.toml` (already done): all http://cryptoloveyou.com/* → https://www.cryptoloveyou.com/*
   This ensures the canonical domain is `www.` — email should match.
7. In Resend dashboard: set sending domain to `cryptoloveyou.com` (no www for email)

**Verify at:** https://dmarcanalyzer.com or `dig TXT cryptoloveyou.com`

---

## SHORT TERM (this month — behavioral infrastructure)

### 4. Server-side event tracking → Netlify Function

**Files to add:**
```
netlify/functions/track-event.js   ← new file
js/clv-track.js                    ← new file
```

**Environment variables to set in Netlify dashboard > Site Settings > Environment:**
```
GA4_MEASUREMENT_ID   = G-XXXXXXXXXX   (from Google Analytics > Admin > Data Streams)
GA4_API_SECRET       = xxxxxxxxxxxx   (from GA4 > Admin > Data Streams > Measurement Protocol)
```

**Add to every page before </body>:**
```html
<script src="/js/clv-track.js" defer></script>
```

In SmartMag child theme, add to `functions.php`:
```php
add_action('wp_enqueue_scripts', function() {
    wp_enqueue_script('clv-track', get_stylesheet_directory_uri() . '/../../js/clv-track.js', [], '1.0.0', true);
});
```

For the static export, add the script tag to the base HTML template.

**What you gain:**
- Full article chain before each affiliate click (which 3 articles preceded the Bybit click?)
- Return visitor signals (day 0 vs day 14 visitor — completely different conversion intent)
- Traffic source quality at click moment (organic search vs "make money with AI" social)
- Scroll depth at click (user who clicked from 20% scroll ≠ user who read 90% of page)

**The Axon shift this enables:**
You can now report on *deposit conversion rate per content pathway*, not just clicks.
When Bybit asks "what's your conversion quality?", you have data beyond click volume.

---

### 5. Affiliate link integrity monitor → Netlify Function (scheduled)

**Files to add:**
```
netlify/functions/link-integrity.js   ← new file
```

**Environment variables:**
```
AFFILIATE_LINKS_JSON = {"bybit":{"url":"https://www.bybit.com/register","params":{"affiliate_id":"YOUR_ID"}},"kraken":{"url":"https://www.kraken.com/sign-up","params":{"referral":"YOUR_CODE"}}}
RESEND_API_KEY       = re_xxxxxxxxxxxx
ALERT_EMAIL          = michael@cryptoloveyou.com
SITE_URL             = https://www.cryptoloveyou.com
```

**Add scheduled invocation to netlify.toml:**
```toml
[functions."link-integrity"]
  schedule = "0 */6 * * *"   # Every 6 hours
```

**What it does:** Fetches your key pages every 6 hours, extracts all outbound affiliate
link hrefs, and compares the URL parameters against the trusted reference stored in env
variables. If a parameter changes (e.g. your Bybit affiliate ID is replaced with someone
else's), it fires an email alert immediately via Resend.

**Why this matters:** Affiliate parameter hijacking on WordPress is silent. The redirect
chain looks intact. You only discover it at the end of the month when commissions don't
match. This catches it within 6 hours.

---

## MEDIUM TERM (next 30–60 days — mobile and measurement)

### 6. Mobile comparison cards → JS component

**Files to add:**
```
js/mobile-comparison.js   ← new file
```

**Add to comparison pages:**
```html
<script src="/js/clv-track.js" defer></script>
<script src="/js/mobile-comparison.js" defer></script>
```

**Mark your existing comparison table:**
```html
<table class="exchange-comparison-table">
  <!-- existing table content stays — mobile-comparison.js hides it on mobile -->
</table>
```

**Update `EXCHANGE_DATA` in mobile-comparison.js** with your actual affiliate URLs
and any exchange-specific features you want highlighted.

**Expected impact:** Mobile sessions currently see a broken horizontal table.
A 48px-height thumb-friendly CTA button on a card layout is the single highest-ROI
conversion change for mobile traffic. Benchmark before/after with:
- GA4: Mobile conversion rate on comparison pages
- Your affiliate dashboard: click-to-registration ratio, mobile vs desktop split

---

### 7. PWA installation + push notifications

**Files to add:**
```
manifest.json   ← new file (at root)
sw.js           ← new file (at root — must be at root for scope)
offline.html    ← new file
```

**Add to every page `<head>`:**
```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#7c3aed">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/images/logo-heart-brand.jpg">

<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }
</script>
```

**Push notification provider (choose one):**
- OneSignal (free tier: 10,000 subscribers) — easiest setup for WordPress
- Firebase Cloud Messaging (free, requires Google account)
- Web-push npm package via Netlify function (most control, requires VAPID keys)

**The retention argument:**
A mobile user who adds CryptoLoveYou to their home screen visits 3–5× more frequently
than a browser bookmark user (industry average for news/finance PWAs). The push
notification channel replaces paid re-engagement — you own the channel.

---

## STRATEGIC (60–90 days — Axon measurement framework)

### 8. Content segmentation — editorial architecture fix

**Audit finding (Axon Key 2):** "I discovered how to make $100K with Nano Banana AI"
shares domain authority with exchange comparison guides. This is the single biggest
SEO drag on high-value commercial pages.

**Options (in order of preference):**

**Option A — Subdomain isolation (recommended)**
Move low-quality AI content to `news.cryptoloveyou.com`
Keep exchange guides, reviews, and crypto-specific content on `www.cryptoloveyou.com`
This preserves the content revenue while insulating the commercial domain's authority.

**Option B — Internal canonical signaling**
Add `<meta name="robots" content="noindex">` to the lowest-quality AI content
(the "make $100K with Nano Banana" category specifically)
This removes them from Google's authority calculation without deleting the URLs.

**Option C — Quality bar enforcement**
Set a minimum article standard: any crypto-adjacent AI article stays. Any article
that is purely a YouTube video summary with "make money" framing gets noindexed.
Implement as a WordPress category filter.

**The SEO math:** If your top exchange comparison pages rank position 8–12, moving them
to position 4–6 through domain authority improvement (by removing quality dilution)
doubles organic traffic to those pages. That compounds affiliate revenue without
additional content spend.

---

### 9. Sub-affiliate network — when to start

**Audit finding:** Sub-affiliate structure is the highest-leverage path forward.
The compliance infrastructure (legal pages, exchange partner relationships) is already in place.

**Prerequisites before launching:**
1. ✅ Security hardening (items 1–3 above) — must be done first
2. ✅ Server-side tracking (item 4) — you need behavioral data before vetting sub-affiliates
3. ✅ Affiliate link integrity monitoring (item 5) — network fraud protection required
4. Post Affiliate Pro, Trackier, or Impact — dedicated affiliate platform, not WordPress plugin

**Platform recommendation: Trackier**
- Purpose-built for crypto/finance affiliate networks
- Real-time postback with cryptographic signature verification (closes attribution manipulation)
- Bot traffic detection built-in
- Sub-affiliate management with tiered commission structure
- Approximate cost: $299/mo starter tier

**Commission structure to propose to exchanges:**
When you approach Bybit/Kraken/Binance about sub-affiliate rates:
- Ask for the "media buyer" or "agency" tier
- These programs pay 20–40% revenue share on sub-affiliates
- Your role: verify quality, pass through to exchange, retain spread
- The compliance infrastructure already built (legal pages, KYC awareness) is your differentiator

---

## ENVIRONMENT VARIABLES — MASTER LIST

Set all of these in Netlify dashboard > Site Settings > Environment Variables.
**Never commit these to the repository.**

```
# Google Analytics (server-side tracking)
GA4_MEASUREMENT_ID       = G-XXXXXXXXXX
GA4_API_SECRET           = xxxxxxxxxxxxxxxxxxxx

# Affiliate link integrity monitoring
AFFILIATE_LINKS_JSON     = {"bybit":{"url":"...","params":{"affiliate_id":"..."}}}
ALERT_EMAIL              = your-email@cryptoloveyou.com
SITE_URL                 = https://www.cryptoloveyou.com

# Email (already configured — verify domain alignment)
RESEND_API_KEY           = re_xxxxxxxxxxxxxxxxxxxx

# Future: sub-affiliate platform
TRACKIER_API_KEY         = (when Trackier is implemented)
TRACKIER_WEBHOOK_SECRET  = (for postback signature verification)
```

---

## DEPLOYMENT SEQUENCE

```
Week 1 (security):
  1. netlify.toml → commit → push → verify headers at securityheaders.com
  2. DNS: verify/fix SPF, DKIM, DMARC alignment
  3. Set AFFILIATE_LINKS_JSON env var with your actual affiliate parameters

Week 2–3 (tracking):
  4. Add track-event.js Netlify function
  5. Add clv-track.js to all pages
  6. Set GA4_MEASUREMENT_ID + GA4_API_SECRET env vars
  7. Add link-integrity.js + schedule + RESEND env vars
  8. Verify events firing in GA4 DebugView

Week 4 (mobile):
  9. Add mobile-comparison.js to comparison pages
  10. Update EXCHANGE_DATA with actual affiliate URLs
  11. Add manifest.json, sw.js, offline.html
  12. Test PWA install prompt on Android Chrome

Month 2 (editorial):
  13. Audit 50 lowest-quality articles — noindex or move to news subdomain
  14. Build a "Beginner track" content pillar with internal linking to exchange CTAs
  15. Benchmark comparison page rankings before/after authority cleanup

Month 3 (network):
  16. Evaluate Trackier vs Post Affiliate Pro
  17. Approach exchange partner contacts about sub-affiliate tier
  18. Draft sub-affiliate agreement (legal review required)
```
