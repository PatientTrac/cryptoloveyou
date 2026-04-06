#!/usr/bin/env node
/**
 * One-time bulk sync: align legacy SmartMag HTML exports with index.html header extras:
 * - Top + footer legal links (About, Affiliate, Privacy .html)
 * - Guides 2026 dropdown in main menu
 * - Language switcher (CSS, desktop + mobile widgets, cookie script)
 *
 * Skips files that already contain clu-lang-switcher-css or lack smart-head-main.
 * Run from repo root: node scripts/sync-smartmag-header.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.cursor',
]);

const CSS_BLOCK = `
<style id="clu-lang-switcher-css" type="text/css">
.clu-lang-switch{position:relative;display:inline-flex;align-items:center;flex-shrink:0;margin-right:6px;vertical-align:middle;font-family:Poppins,system-ui,sans-serif;font-size:12px;z-index:100;line-height:1}
.clu-lang-switch .clu-lang-btn{display:inline-flex;align-items:center;gap:4px;padding:0 8px;height:30px;max-height:30px;background:#11223d;border:1px solid #2a3f5f;border-radius:4px;color:#e8ecf2;cursor:pointer;white-space:nowrap;font:inherit;font-weight:500}
.clu-lang-switch .clu-lang-btn:hover{background:#152b4b}
.clu-lang-switch .clu-lang-flag{font-size:14px;line-height:1;flex-shrink:0}
.clu-lang-switch .clu-lang-label{max-width:7.5rem;overflow:hidden;text-overflow:ellipsis}
.clu-lang-switch .clu-lang-caret{font-size:8px;opacity:.8;flex-shrink:0;margin-left:1px}
.clu-lang-switch .clu-lang-menu{visibility:hidden;opacity:0;position:absolute;right:0;top:100%;margin-top:4px;min-width:188px;padding:4px 0;background:#11223d;border:1px solid #2a3f5f;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.35);transition:opacity .15s,visibility .15s}
.clu-lang-switch:hover .clu-lang-menu,.clu-lang-switch:focus-within .clu-lang-menu{visibility:visible;opacity:1}
.clu-lang-switch .clu-lang-menu a{display:flex;align-items:center;gap:8px;padding:8px 12px;color:#e8ecf2;text-decoration:none;font-size:13px}
.clu-lang-switch .clu-lang-menu a:hover{background:#152b4b}
@media (min-width:1100px){
.smart-head-main.smart-head .smart-head-mid .navigation-main > ul.menu{flex-wrap:nowrap;white-space:nowrap}
.smart-head-main.smart-head .smart-head-mid .navigation-main > ul.menu > li > a{white-space:nowrap}
}
</style>`;

const LANG_WIDGET = `<div class="clu-lang-switch" role="navigation" aria-label="Language">
	<button type="button" class="clu-lang-btn" aria-expanded="false" aria-haspopup="listbox" aria-label="Language">
		<span class="clu-lang-flag" aria-hidden="true">🇬🇧</span>
		<span class="clu-lang-label">English</span>
		<span class="clu-lang-caret" aria-hidden="true">▼</span>
	</button>
	<div class="clu-lang-menu" role="listbox">
		<a href="/" hreflang="en" data-clu-lang="en" title="English — main site">🇬🇧 English</a>
		<a href="/fr/" hreflang="fr" data-clu-lang="fr">🇫🇷 Français</a>
		<a href="/de/" hreflang="de" data-clu-lang="de">🇩🇪 Deutsch</a>
		<a href="/pt/" hreflang="pt" data-clu-lang="pt">🇵🇹 Português</a>
		<a href="/es/" hreflang="es" data-clu-lang="es">🇪🇸 Español</a>
		<a href="/zh/" hreflang="zh" data-clu-lang="zh">🇨🇳 中文</a>
		<a href="/ru/" hreflang="ru" data-clu-lang="ru">🇷🇺 Русский</a>
	</div>
</div>
`;

const LANG_SCRIPT = `<script>
(function () {
	var LABELS = { en: 'English', fr: 'Français', de: 'Deutsch', pt: 'Português', es: 'Español', zh: '中文', ru: 'Русский' };
	var FLAGS = { en: '🇬🇧', fr: '🇫🇷', de: '🇩🇪', pt: '🇵🇹', es: '🇪🇸', zh: '🇨🇳', ru: '🇷🇺' };
	var NAV_LANG = { en: 'Language', fr: 'Langue', de: 'Sprache', pt: 'Idioma', es: 'Idioma', zh: '语言', ru: 'Язык' };
	function readCookieLang() {
		var ck = document.cookie.match(/(?:^|;\\s*)nf_lang=([^;]+)/);
		if (!ck) return null;
		var c = decodeURIComponent(ck[1]).replace(/"/g, '').split('-')[0].toLowerCase();
		return LABELS[c] ? c : null;
	}
	function resolveLocale() {
		var m = location.pathname.match(/^\\/(en|fr|de|pt|es|zh|ru)(\\/|$)/);
		if (m) return m[1];
		var ckCode = readCookieLang();
		var p = location.pathname || '/';
		if (p === '/' || p === '/index.html') {
			if (ckCode) return ckCode;
			return 'en';
		}
		if (ckCode) return ckCode;
		var langs = navigator.languages || [navigator.language || 'en'];
		for (var i = 0; i < langs.length; i++) {
			var code = (langs[i] || '').split('-')[0].toLowerCase();
			if (LABELS[code]) return code;
		}
		return 'en';
	}
	function apply() {
		var loc = resolveLocale();
		if (!LABELS[loc]) loc = 'en';
		document.querySelectorAll('.clu-lang-switch .clu-lang-label').forEach(function (el) {
			el.textContent = LABELS[loc];
		});
		document.querySelectorAll('.clu-lang-switch .clu-lang-flag').forEach(function (el) {
			el.textContent = FLAGS[loc];
		});
		document.querySelectorAll('.clu-lang-switch .clu-lang-btn').forEach(function (btn) {
			btn.setAttribute('aria-label', (NAV_LANG[loc] || NAV_LANG.en) + ': ' + LABELS[loc]);
		});
		document.querySelectorAll('.clu-lang-switch[role="navigation"]').forEach(function (el) {
			el.setAttribute('aria-label', NAV_LANG[loc] || NAV_LANG.en);
		});
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
	else apply();
	document.querySelectorAll('.clu-lang-menu a[data-clu-lang]').forEach(function (link) {
		link.addEventListener('click', function () {
			var code = this.getAttribute('data-clu-lang');
			if (code) document.cookie = 'nf_lang=' + encodeURIComponent(code) + '; path=/; max-age=31536000; SameSite=Lax';
		});
	});
})();
</script>
`;

const LEGAL_HEADER_UL = `<ul id="menu-footer-legal-menu" class="menu"><li id="menu-item-about" class="menu-item menu-item-type-post_type menu-item-object-page menu-item-about"><a href="/about-us.html">About Us</a></li>
<li id="menu-item-27" class="menu-item menu-item-type-post_type menu-item-object-page menu-item-27"><a href="/privacy-policy.html">Privacy Policy</a></li>
<li id="menu-item-affiliate" class="menu-item menu-item-type-post_type menu-item-object-page menu-item-affiliate"><a href="/affiliate-disclosure.html">Affiliate Disclosure</a></li>
<li id="menu-item-28" class="menu-item menu-item-type-post_type menu-item-object-page menu-item-28"><a href="/terms-of-service/">Terms Of Service</a></li>
<li id="menu-item-146" class="menu-item menu-item-type-post_type menu-item-object-page menu-item-146"><a href="/social-media-disclaimer/">Social Media Disclaimer</a></li>
<li id="menu-item-147" class="menu-item menu-item-type-post_type menu-item-object-page menu-item-147"><a href="/dmca-compliance/">DMCA Compliance</a></li>
<li id="menu-item-148" class="menu-item menu-item-type-post_type menu-item-object-page menu-item-148"><a href="/anti-spam-policy/">Anti-Spam Policy</a></li>
</ul>`;

const LEGAL_FOOTER_UL = `<ul id="menu-footer-legal-menu-1" class="menu"><li class="menu-item menu-item-type-post_type menu-item-object-page menu-item-about"><a href="/about-us.html">About Us</a></li>
<li class="menu-item menu-item-type-post_type menu-item-object-page menu-item-27"><a href="/privacy-policy.html">Privacy Policy</a></li>
<li class="menu-item menu-item-type-post_type menu-item-object-page menu-item-affiliate"><a href="/affiliate-disclosure.html">Affiliate Disclosure</a></li>
<li class="menu-item menu-item-type-post_type menu-item-object-page menu-item-28"><a href="/terms-of-service/">Terms Of Service</a></li>
<li class="menu-item menu-item-type-post_type menu-item-object-page menu-item-146"><a href="/social-media-disclaimer/">Social Media Disclaimer</a></li>
<li class="menu-item menu-item-type-post_type menu-item-object-page menu-item-147"><a href="/dmca-compliance/">DMCA Compliance</a></li>
<li class="menu-item menu-item-type-post_type menu-item-object-page menu-item-148"><a href="/anti-spam-policy/">Anti-Spam Policy</a></li>
</ul>`;

const GUIDES_BLOCK = `<li id="menu-item-clu-guides-2026" class="menu-item menu-item-type-custom menu-item-object-custom menu-item-has-children menu-item-clu-guides"><a href="/en/" title="Crypto &amp; AI Guides 2026">Guides 2026</a>
<ul class="sub-menu">
	<li class="menu-item"><a href="/best-ai-crypto-projects-2026">Best AI Crypto Projects 2026</a></li>
	<li class="menu-item"><a href="/how-to-buy-crypto-2026">How to Buy Cryptocurrency</a></li>
	<li class="menu-item"><a href="/best-crypto-exchanges-2026">Best Crypto Exchanges 2026</a></li>
	<li class="menu-item"><a href="/best-crypto-wallets-2026">Best Crypto Wallets 2026</a></li>
	<li class="menu-item"><a href="/make-money-with-ai-crypto-2026">Make Money with AI &amp; Crypto</a></li>
	<li class="menu-item"><a href="/crypto-tax-guide-2026">Crypto Tax Guide 2026</a></li>
</ul>
</li>`;

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && e.name.endsWith('.html')) out.push(full);
  }
}

function transform(html) {
  if (!html.includes('smart-head-main')) return null;
  if (html.includes('clu-lang-switcher-css')) return null;
  if (!html.includes('/*# sourceURL=smartmag-core-inline-css */')) return null;

  let s = html;
  let n = 0;

  s = s.replace(
    /\/\*# sourceURL=smartmag-core-inline-css \*\/\s*<\/style>/,
    (m) => {
      n++;
      return m + CSS_BLOCK;
    }
  );
  if (n === 0) return null;

  const headerLegal = s.match(/<ul id="menu-footer-legal-menu" class="menu">[\s\S]*?<\/ul>\s*<\/nav>/);
  if (headerLegal) {
    s = s.replace(headerLegal[0], LEGAL_HEADER_UL + '\t\t</nav>');
  }

  s = s.replace(
    /<ul id="menu-footer-legal-menu-1" class="menu">[\s\S]*?<\/ul>/,
    LEGAL_FOOTER_UL
  );

  if (!s.includes('menu-item-clu-guides-2026')) {
    const gr = s.replace(
      /(<li id="menu-item-5671"[^>]*>[\s\S]*?<\/li>)\s*(<li id="menu-item-5673")/,
      '$1\n' + GUIDES_BLOCK + '\n$2'
    );
    if (gr !== s) s = gr;
  }

  const desk = s.replace(
    /(<div class="items items-right ">\s*\n\s*\n)(<div class="scheme-switcher has-icon-only">)/,
    '$1\n' + LANG_WIDGET + '\n$2'
  );
  if (desk !== s) s = desk;

  const mob = s.replace(
    /(<div class="items items-right ">\s*\n\s*\n)(\s*<a href="#" class="search-icon has-icon-only is-icon" title="Search">)/,
    '$1\n' + LANG_WIDGET + '\n$2'
  );
  if (mob !== s) s = mob;

  if (!s.includes('function resolveLocale()') && s.includes('</body>')) {
    s = s.replace(/<\/body>/i, LANG_SCRIPT + '\n</body>');
  }

  return s === html ? null : s;
}

function main() {
  const files = [];
  walk(ROOT, files);
  let updated = 0;
  let skipped = 0;
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    let html;
    try {
      html = fs.readFileSync(f, 'utf8');
    } catch {
      continue;
    }
    const next = transform(html);
    if (!next) {
      skipped++;
      continue;
    }
    fs.writeFileSync(f, next, 'utf8');
    updated++;
    if (updated <= 5) console.log('updated', rel);
  }
  console.log('Done. Updated:', updated, 'Skipped (already synced or no match):', skipped);
}

main();
