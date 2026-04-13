/**
 * CryptoLoveYou — Unified Language Switcher
 * - Auto-detects browser language (navigator.languages) on first visit
 * - Respects saved cookie preference (nf_lang) on return visits
 * - Manual override via dropdown stores preference in cookie
 * - Updates flag + label in all .clu-lang-switch dropdowns on the page
 * - Version: 2.0.0
 */
(function () {
  'use strict';

  var SUPPORTED = ['en', 'fr', 'de', 'pt', 'es', 'zh', 'ru'];
  var LABELS    = { en: 'English', fr: 'Français', de: 'Deutsch', pt: 'Português', es: 'Español', zh: '中文', ru: 'Русский' };
  var FLAGS     = { en: '🇬🇧', fr: '🇫🇷', de: '🇩🇪', pt: '🇵🇹', es: '🇪🇸', zh: '🇨🇳', ru: '🇷🇺' };
  var NAV_LANG  = { en: 'Language', fr: 'Langue', de: 'Sprache', pt: 'Idioma', es: 'Idioma', zh: '语言', ru: 'Язык' };

  /* ── Cookie helpers ─────────────────────────────────── */
  function getCookieLang() {
    var m = document.cookie.match(/(?:^|;\s*)nf_lang=([^;]+)/);
    if (!m) return null;
    var c = decodeURIComponent(m[1]).replace(/"/g, '').split('-')[0].toLowerCase();
    return SUPPORTED.indexOf(c) !== -1 ? c : null;
  }

  function setCookieLang(code) {
    document.cookie = 'nf_lang=' + encodeURIComponent(code) + '; path=/; max-age=31536000; SameSite=Lax';
  }

  /* ── Locale resolution ─────────────────────────────── */
  function resolveLocale() {
    // 1. URL path segment takes priority (e.g. /fr/ → fr)
    var m = location.pathname.match(/^\/(en|fr|de|pt|es|zh|ru)(\/|$)/);
    if (m) return m[1];

    // 2. Saved cookie preference
    var ck = getCookieLang();
    if (ck) return ck;

    // 3. Browser language auto-detect
    var langs = navigator.languages || [navigator.language || 'en'];
    for (var i = 0; i < langs.length; i++) {
      var code = (langs[i] || '').split('-')[0].toLowerCase();
      if (SUPPORTED.indexOf(code) !== -1) return code;
    }
    return 'en';
  }

  /* ── Update all switcher UI elements on page ────────── */
  function applyLocale() {
    var loc = resolveLocale();
    document.querySelectorAll('.clu-lang-switch .clu-lang-label').forEach(function (el) {
      el.textContent = LABELS[loc] || LABELS.en;
    });
    document.querySelectorAll('.clu-lang-switch .clu-lang-flag').forEach(function (el) {
      el.textContent = FLAGS[loc] || FLAGS.en;
    });
    document.querySelectorAll('.clu-lang-switch .clu-lang-btn').forEach(function (btn) {
      btn.setAttribute('aria-label', (NAV_LANG[loc] || NAV_LANG.en) + ': ' + (LABELS[loc] || LABELS.en));
    });
    document.querySelectorAll('.clu-lang-switch[role="navigation"]').forEach(function (el) {
      el.setAttribute('aria-label', NAV_LANG[loc] || NAV_LANG.en);
    });
  }

  /* ── Wire click handlers on all lang-menu links ─────── */
  function wireClicks() {
    document.querySelectorAll('.clu-lang-menu a[data-clu-lang], .clu-portal-lang-menu a[data-clu-lang]').forEach(function (link) {
      link.addEventListener('click', function () {
        var code = this.getAttribute('data-clu-lang');
        if (code && SUPPORTED.indexOf(code) !== -1) setCookieLang(code);
      });
    });
  }

  /* ── Root redirect (fires only on / or /index.html) ─── */
  function maybeRedirectRoot() {
    var p = location.pathname;
    if (p !== '/' && p !== '/index.html') return;

    // Don't redirect if user deliberately navigated here already
    var ck = getCookieLang();
    if (ck && ck !== 'en') {
      location.replace('/' + ck + '/');
      return;
    }

    // First-time visit: auto-detect browser language
    if (!ck) {
      var langs = navigator.languages || [navigator.language || 'en'];
      for (var i = 0; i < langs.length; i++) {
        var code = (langs[i] || '').split('-')[0].toLowerCase();
        if (SUPPORTED.indexOf(code) !== -1 && code !== 'en') {
          setCookieLang(code);
          location.replace('/' + code + '/');
          return;
        }
      }
    }
  }

  /* ── Init ──────────────────────────────────────────── */
  maybeRedirectRoot();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { applyLocale(); wireClicks(); });
  } else {
    applyLocale();
    wireClicks();
  }

})();
