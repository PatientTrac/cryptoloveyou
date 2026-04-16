/**
 * CryptoLoveYou — Behavioral Signal Layer (frontend)
 * File: /js/clv-track.js
 *
 * Add to every page before </body>:
 * <script src="/js/clv-track.js" defer></script>
 *
 * What this captures (per Axon Key 1):
 * - Scroll depth milestones (25%, 50%, 75%, 100%)
 * - Time on page at affiliate click moment
 * - Content pathway: which articles led to this page (sessionStorage chain)
 * - Traffic source quality (organic search vs social vs direct)
 * - Affiliate link click with full behavioral context
 * - Return visitor signal (localStorage first-visit timestamp)
 *
 * All data is sent to /netlify/functions/track-event (server-side)
 * which survives ad blockers and forwards to GA4 + data warehouse.
 */

(function () {
  'use strict';

  // ── CLIENT ID ──────────────────────────────────────────────
  // Persistent identifier (not PII — no name/email stored)
  function getClientId() {
    let id = localStorage.getItem('clv_cid');
    if (!id) {
      id = 'clv_' + Math.random().toString(36).slice(2) + '_' + Date.now();
      localStorage.setItem('clv_cid', id);
    }
    return id;
  }

  // ── SESSION ID ─────────────────────────────────────────────
  function getSessionId() {
    const key = 'clv_sid';
    const timeout = 30 * 60 * 1000; // 30 minute session
    const stored = sessionStorage.getItem(key);
    const now = Date.now();

    if (stored) {
      const { id, last_active } = JSON.parse(stored);
      if (now - last_active < timeout) {
        sessionStorage.setItem(key, JSON.stringify({ id, last_active: now }));
        return id;
      }
    }

    const id = 'ses_' + Math.random().toString(36).slice(2) + '_' + now;
    sessionStorage.setItem(key, JSON.stringify({ id, last_active: now }));
    return id;
  }

  // ── SESSION ARTICLE CHAIN ──────────────────────────────────
  // Tracks which articles the user read before this page (max 5)
  function getArticleChain() {
    try {
      return JSON.parse(sessionStorage.getItem('clv_chain') || '[]');
    } catch { return []; }
  }

  function addToArticleChain(slug) {
    const chain = getArticleChain();
    if (chain[chain.length - 1] !== slug) {
      chain.push(slug);
      if (chain.length > 5) chain.shift();
      sessionStorage.setItem('clv_chain', JSON.stringify(chain));
    }
  }

  // ── VISIT DEPTH ────────────────────────────────────────────
  function getSessionPageCount() {
    const n = parseInt(sessionStorage.getItem('clv_page_count') || '0', 10) + 1;
    sessionStorage.setItem('clv_page_count', n);
    return n;
  }

  function getDaysSinceFirstVisit() {
    const first = localStorage.getItem('clv_first_visit');
    if (!first) {
      localStorage.setItem('clv_first_visit', Date.now());
      return 0;
    }
    return Math.floor((Date.now() - parseInt(first, 10)) / 86400000);
  }

  function getTotalVisits() {
    const n = parseInt(localStorage.getItem('clv_visits') || '0', 10) + 1;
    localStorage.setItem('clv_visits', n);
    return n;
  }

  // ── TRAFFIC SOURCE ─────────────────────────────────────────
  function getTrafficSource() {
    const ref = document.referrer;
    const params = new URLSearchParams(window.location.search);

    if (params.get('utm_source')) {
      return {
        medium: params.get('utm_medium') || 'unknown',
        source: params.get('utm_source'),
        campaign: params.get('utm_campaign') || '',
        content: params.get('utm_content') || '',
      };
    }

    if (!ref) return { medium: 'direct', source: 'direct' };

    const refHost = new URL(ref).hostname;
    const socialDomains = ['t.co', 'twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'reddit.com', 'tiktok.com', 'youtube.com'];
    const searchDomains = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'baidu.'];

    if (socialDomains.some(d => refHost.includes(d))) return { medium: 'social', source: refHost };
    if (searchDomains.some(d => refHost.includes(d))) return { medium: 'organic', source: refHost };
    if (refHost.includes('cryptoloveyou.com')) return { medium: 'internal', source: refHost };

    return { medium: 'referral', source: refHost };
  }

  // ── CORE TRACKING ──────────────────────────────────────────
  const CLIENT_ID  = getClientId();
  const SESSION_ID = getSessionId();
  const PAGE_SLUG  = window.location.pathname.replace(/^\/|\/$/g, '') || 'home';
  const TRAFFIC    = getTrafficSource();
  const PAGE_COUNT = getSessionPageCount();
  const TOTAL_VISITS = getTotalVisits();
  const DAYS_SINCE_FIRST = getDaysSinceFirstVisit();
  const PAGE_START = Date.now();

  addToArticleChain(PAGE_SLUG);

  function sendEvent(event_name, extra_params = {}) {
    const payload = {
      event_name,
      client_id: CLIENT_ID,
      session_id: SESSION_ID,
      params: {
        page_slug: PAGE_SLUG,
        page_url: window.location.href,
        referrer: document.referrer,
        traffic_medium: TRAFFIC.medium,
        traffic_source: TRAFFIC.source,
        traffic_campaign: TRAFFIC.campaign || '',
        session_depth: PAGE_COUNT,
        total_visits: TOTAL_VISITS,
        days_since_first_visit: DAYS_SINCE_FIRST,
        article_chain: getArticleChain().join(' > '),
        ...extra_params,
      },
    };

    // Use navigator.sendBeacon for reliability on page unload
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    if (event_name === 'page_exit') {
      navigator.sendBeacon('/.netlify/functions/track-event', blob);
      return;
    }

    // Standard fetch for other events
    fetch('/.netlify/functions/track-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {}); // Silent fail — never break user experience
  }

  // ── SCROLL DEPTH ───────────────────────────────────────────
  let maxScroll = 0;
  const scrollMilestones = [25, 50, 75, 100];
  const firedMilestones = new Set();

  function onScroll() {
    const el = document.documentElement;
    const scrolled = ((el.scrollTop + el.clientHeight) / el.scrollHeight) * 100;
    maxScroll = Math.max(maxScroll, scrolled);

    for (const milestone of scrollMilestones) {
      if (scrolled >= milestone && !firedMilestones.has(milestone)) {
        firedMilestones.add(milestone);
        sendEvent('scroll_depth', {
          scroll_percent: milestone,
          time_to_scroll: Math.floor((Date.now() - PAGE_START) / 1000),
        });
      }
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // ── AFFILIATE CLICK CAPTURE ────────────────────────────────
  // This is the most valuable event — captures full behavioral context at click
  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.href;
    let url;
    try { url = new URL(href); } catch { return; }

    // Only track outbound affiliate links
    if (url.hostname === window.location.hostname) return;

    // Identify exchange partner from domain
    const exchangeMap = {
      'bybit.com': 'bybit',
      'kraken.com': 'kraken',
      'binance.com': 'binance',
      'coinbase.com': 'coinbase',
      'kucoin.com': 'kucoin',
      'okx.com': 'okx',
      'bitget.com': 'bitget',
      'ledger.com': 'ledger',
      'trezor.io': 'trezor',
    };

    const partner = Object.entries(exchangeMap).find(([domain]) =>
      url.hostname.includes(domain)
    )?.[1] || 'external';

    sendEvent('affiliate_click', {
      partner,
      destination_url: href,
      link_text: link.textContent.trim().slice(0, 60),
      link_position: link.getBoundingClientRect().top,
      time_on_page: Math.floor((Date.now() - PAGE_START) / 1000),
      scroll_depth_at_click: Math.round(maxScroll),
      // This is the key Axon metric: quality signal at click moment
      // High session_depth + high scroll + multiple return visits = high-value user
      user_quality_signals: {
        session_depth: PAGE_COUNT,
        total_visits: TOTAL_VISITS,
        days_since_first: DAYS_SINCE_FIRST,
        article_chain_length: getArticleChain().length,
        scroll_at_click: Math.round(maxScroll),
      },
    });
  });

  // ── PAGE EXIT ──────────────────────────────────────────────
  window.addEventListener('beforeunload', () => {
    sendEvent('page_exit', {
      time_on_page: Math.floor((Date.now() - PAGE_START) / 1000),
      max_scroll_depth: Math.round(maxScroll),
    });
  });

  // ── PAGE VIEW ──────────────────────────────────────────────
  sendEvent('page_view');

  // ── PUBLIC API ─────────────────────────────────────────────
  // Expose for inline use in comparison pages, CTAs, etc.
  window.clvTrack = sendEvent;

})();
