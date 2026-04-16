/**
 * CryptoLoveYou — Mobile Exchange Comparison Cards
 * File: /js/mobile-comparison.js
 *
 * Audit finding (Axon Key 3): The comparison table renders as a wide horizontal
 * table on desktop. On mobile it collapses into a broken scrollable element.
 * A mobile-native card layout converts materially better.
 *
 * This script:
 * 1. Detects if the visitor is on mobile (< 768px)
 * 2. Finds .exchange-comparison-table elements on the page
 * 3. Replaces them with a card-per-exchange layout
 * 4. CTA button is thumb-sized (min 48px height) and full-width
 * 5. Primary exchange gets a "Top Pick" badge
 *
 * To add tracking to CTA clicks:
 *   Uses window.clvTrack if clv-track.js is loaded (load that first)
 */

(function () {
  'use strict';

  const MOBILE_BREAKPOINT = 768;

  // Exchange data — update these with your actual affiliate links and commission rates
  // In production: load this from a Netlify function to keep affiliate IDs server-side
  const EXCHANGE_DATA = [
    {
      id: 'bybit',
      name: 'Bybit',
      logo: '/images/exchanges/bybit-logo.png',
      badge: 'Top Pick',
      badge_color: '#7c3aed',
      rating: 4.8,
      headline: 'Best for derivatives & spot trading',
      features: [
        '0% maker fees on spot',
        'Up to 100x leverage on perpetuals',
        'USDT & USDC margined contracts',
        '$30,000 welcome bonus for new users',
      ],
      cta_text: 'Start Trading on Bybit',
      cta_url: '#bybit-affiliate-link', // Replace with actual affiliate URL
      cta_color: '#7c3aed',
    },
    {
      id: 'kraken',
      name: 'Kraken',
      logo: '/images/exchanges/kraken-logo.png',
      badge: null,
      badge_color: null,
      rating: 4.6,
      headline: 'Best for security & regulated markets',
      features: [
        'Licensed in US, UK, EU',
        'Kraken Pro: 0.16% maker fee',
        'Proof of Reserves audited',
        'USD, EUR, GBP deposits',
      ],
      cta_text: 'Open a Kraken Account',
      cta_url: '#kraken-affiliate-link',
      cta_color: '#5841d8',
    },
    {
      id: 'binance',
      name: 'Binance',
      logo: '/images/exchanges/binance-logo.png',
      badge: 'Largest Volume',
      badge_color: '#b45309',
      rating: 4.5,
      headline: 'Highest liquidity globally',
      features: [
        'Lowest fees in spot: 0.1%',
        '600+ trading pairs',
        'BNB fee discount: up to 25%',
        'Launchpad for new tokens',
      ],
      cta_text: 'Join Binance Today',
      cta_url: '#binance-affiliate-link',
      cta_color: '#d97706',
    },
  ];

  function renderStars(rating) {
    const full  = Math.floor(rating);
    const half  = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
  }

  function buildCard(exchange, index) {
    const card = document.createElement('div');
    card.className = 'clv-exchange-card';
    card.style.cssText = `
      background: #ffffff;
      border-radius: 16px;
      border: 1.5px solid ${index === 0 ? exchange.cta_color : '#e5e7eb'};
      padding: 20px;
      margin-bottom: 16px;
      position: relative;
      font-family: system-ui, -apple-system, sans-serif;
    `;

    // Badge
    if (exchange.badge) {
      const badge = document.createElement('div');
      badge.style.cssText = `
        position: absolute;
        top: -12px;
        left: 20px;
        background: ${exchange.badge_color};
        color: #fff;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 12px;
        border-radius: 20px;
        letter-spacing: 0.03em;
        text-transform: uppercase;
      `;
      badge.textContent = exchange.badge;
      card.appendChild(badge);
    }

    // Header: logo + name + rating
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:12px;';

    const logoImg = document.createElement('img');
    logoImg.src = exchange.logo;
    logoImg.alt = exchange.name;
    logoImg.style.cssText = 'width:40px;height:40px;object-fit:contain;border-radius:8px;';
    logoImg.onerror = function() {
      // Fallback to text initial if logo fails to load
      this.style.display = 'none';
      const initial = document.createElement('div');
      initial.style.cssText = `width:40px;height:40px;border-radius:8px;background:${exchange.cta_color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;`;
      initial.textContent = exchange.name[0];
      this.parentNode.insertBefore(initial, this);
    };

    const nameRating = document.createElement('div');
    nameRating.innerHTML = `
      <div style="font-weight:700;font-size:17px;color:#111;">${exchange.name}</div>
      <div style="font-size:13px;color:#f59e0b;">${renderStars(exchange.rating)}
        <span style="color:#6b7280;font-size:12px;">${exchange.rating}/5</span>
      </div>`;

    header.appendChild(logoImg);
    header.appendChild(nameRating);
    card.appendChild(header);

    // Headline
    const headline = document.createElement('p');
    headline.style.cssText = 'margin:0 0 12px;font-size:14px;color:#374151;font-weight:500;';
    headline.textContent = exchange.headline;
    card.appendChild(headline);

    // Features list
    const ul = document.createElement('ul');
    ul.style.cssText = 'margin:0 0 16px;padding:0;list-style:none;';
    for (const feature of exchange.features) {
      const li = document.createElement('li');
      li.style.cssText = 'font-size:13px;color:#4b5563;padding:4px 0;display:flex;align-items:flex-start;gap:8px;';
      li.innerHTML = `<span style="color:${exchange.cta_color};flex-shrink:0;margin-top:1px;">✓</span>${feature}`;
      ul.appendChild(li);
    }
    card.appendChild(ul);

    // CTA Button — thumb-sized per audit recommendation
    const cta = document.createElement('a');
    cta.href = exchange.cta_url;
    cta.target = '_blank';
    cta.rel = 'noopener sponsored';
    cta.style.cssText = `
      display: block;
      width: 100%;
      min-height: 48px;
      background: ${exchange.cta_color};
      color: #ffffff;
      text-align: center;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      line-height: 48px;
      text-decoration: none;
      box-sizing: border-box;
      transition: opacity 0.15s ease;
    `;
    cta.textContent = exchange.cta_text;
    cta.addEventListener('mouseenter', () => { cta.style.opacity = '0.88'; });
    cta.addEventListener('mouseleave', () => { cta.style.opacity = '1'; });

    // Track CTA click with behavioral context
    cta.addEventListener('click', () => {
      if (typeof window.clvTrack === 'function') {
        window.clvTrack('comparison_cta_click', {
          partner: exchange.id,
          card_position: index + 1,
          destination: exchange.cta_url,
          is_top_pick: exchange.badge === 'Top Pick',
          layout: 'mobile_card',
        });
      }
    });

    card.appendChild(cta);
    return card;
  }

  function initMobileCards() {
    if (window.innerWidth >= MOBILE_BREAKPOINT) return;

    const tables = document.querySelectorAll(
      '.exchange-comparison-table, .comparison-table, [data-exchange-table], table.exchanges'
    );

    if (tables.length === 0) {
      // If no table exists, inject the card grid into any .comparison-section
      const containers = document.querySelectorAll(
        '.comparison-section, #exchange-comparison, .exchange-list'
      );
      containers.forEach(container => injectCardGrid(container));
      return;
    }

    tables.forEach(table => {
      const wrapper = document.createElement('div');
      wrapper.className = 'clv-mobile-cards';
      wrapper.setAttribute('aria-label', 'Exchange comparison');

      EXCHANGE_DATA.forEach((exchange, i) => {
        wrapper.appendChild(buildCard(exchange, i));
      });

      table.parentNode.insertBefore(wrapper, table);
      table.style.display = 'none'; // Hide desktop table on mobile
    });
  }

  function injectCardGrid(container) {
    if (!container || container.querySelector('.clv-mobile-cards')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'clv-mobile-cards';
    EXCHANGE_DATA.forEach((exchange, i) => wrapper.appendChild(buildCard(exchange, i)));
    container.appendChild(wrapper);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileCards);
  } else {
    initMobileCards();
  }

  // Re-run on resize (orientation change)
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(initMobileCards, 200);
  });

})();
