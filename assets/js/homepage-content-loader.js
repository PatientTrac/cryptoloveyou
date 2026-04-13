/**
 * Homepage Content Loader
 *
 * Dynamically loads and renders homepage content sections from JSON files.
 * SAFETY: Skips any section containing iframe or YouTube embeds.
 */

(function() {
  'use strict';

  // Detect language from URL path (e.g. /es/, /fr/) and use lang-specific content if available
  const _pathLang = (location.pathname.match(/^\/(en|fr|de|pt|es|zh|ru)(\/|$)/) || [])[1] || 'en';
  const CONTENT_BASE = _pathLang === 'en' ? '/content/homepage' : '/content/homepage/' + _pathLang;
  const EUR_SYMBOL = '€';

  // HTML ticker: map symbols to `data-live-price` slugs; otherwise use string `coin.id` (CoinGecko id) from ticker.json
  const TICKER_LIVE_PRICE_SLUG = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    USDT: 'tether',
    XRP: 'ripple',
    BNB: 'bnb',
    USDC: 'usdc',
    SOL: 'solana',
    TRX: 'tron',
    STETH: 'lido-staked-ether',
    ADA: 'cardano',
    WBTC: 'wrapped-bitcoin',
    DOGE: 'dogecoin',
    LINK: 'chainlink',
    DOT: 'polkadot',
    MATIC: 'matic-network',
    AVAX: 'avalanche-2'
  };

  function tickerDomSlug(coin) {
    const sym = (coin.symbol || '').toUpperCase();
    if (TICKER_LIVE_PRICE_SLUG[sym]) return TICKER_LIVE_PRICE_SLUG[sym];
    if (typeof coin.id === 'string' && coin.id && !/^\d+$/.test(coin.id)) return coin.id.toLowerCase();
    return sym ? sym.toLowerCase() : '';
  }

  // Real media under /wp-content/uploads (placeholders from the generator do not exist on disk)
  const HOMEPAGE_STOCK_IMAGES = {
    featured: '/wp-content/uploads/2025/09/SBET-Quantitative-Stock-Analysis-Nasdaq-450x225.jpg',
    small: [
      '/wp-content/uploads/2026/03/Stocks-Settle-Sharply-Higher-as-Crude-Oil-Slumps-300x200.jpg',
      '/wp-content/uploads/2026/03/AI-Biggest-Surprise-is-Coming-These-are-the-Stocks-to-300x169.jpg',
      '/wp-content/uploads/2025/09/SBET-Quantitative-Stock-Analysis-Nasdaq-300x150.jpg'
    ]
  };

  const HOMEPAGE_AI_IMAGES = {
    featured: '/wp-content/uploads/2026/03/Trustpilot-partners-with-big-model-vendors.webp-1024x683.webp',
    list: [
      '/wp-content/uploads/2026/03/Google-AI-Releases-WAXAL-A-Multilingual-African-Speech-Dataset-for-450x321.png',
      '/wp-content/uploads/2026/03/US-Holds-Off-on-New-AI-Chip-Export-Rules-in-450x225.jpg',
      '/wp-content/uploads/2026/03/Can-AI-help-predict-which-heart-failure-patients-will-worsen-within-450x300.jpg',
      '/wp-content/uploads/2026/03/NanoClaw-and-Docker-partner-to-make-sandboxes-the-safest-way.png'
    ]
  };

  function isPlaceholderSidebarImage(url) {
    if (!url || typeof url !== 'string') return true;
    return /\/(stock|ai)-news-\d+\.(jpe?g|png|webp)$/i.test(url.trim());
  }

  function stockFeaturedImage(url) {
    return isPlaceholderSidebarImage(url) ? HOMEPAGE_STOCK_IMAGES.featured : url.trim();
  }

  function stockSmallImage(url, index) {
    if (!isPlaceholderSidebarImage(url)) return url.trim();
    return HOMEPAGE_STOCK_IMAGES.small[index % HOMEPAGE_STOCK_IMAGES.small.length];
  }

  function aiFeaturedImage(url) {
    return isPlaceholderSidebarImage(url) ? HOMEPAGE_AI_IMAGES.featured : url.trim();
  }

  function aiListImage(url, index) {
    if (!isPlaceholderSidebarImage(url)) return url.trim();
    return HOMEPAGE_AI_IMAGES.list[index % HOMEPAGE_AI_IMAGES.list.length];
  }

  /** Internal paths use trailing slash (matches static HTML); allow legacy `url` field */
  function articleHref(obj) {
    if (!obj) return '#';
    const raw = String(obj.slug || obj.url || '').trim();
    if (!raw) return '#';
    if (/^https?:\/\//i.test(raw)) return raw;
    let s = raw.startsWith('/') ? raw : `/${raw}`;
    if (s.length > 1 && !s.endsWith('/')) s += '/';
    return s;
  }

  // Helper: Check if element or its children contain iframes
  function containsIframe(element) {
    if (!element) return false;
    return element.querySelector('iframe') !== null;
  }

  // Helper: Format date to match existing site format (e.g., "March 18, 2026")
  function formatDate(dateString) {
    return dateString; // Already formatted from JSON
  }

  // Helper: Get category color class
  function getCategoryColorClass(categorySlug) {
    const colorMap = {
      'crypto-news/bitcoin': 'term-color-136',
      'crypto-news/ethereum': 'term-color-137',
      'crypto-news/altcoins': 'term-color-138',
      'crypto-news/blockchain': 'term-color-139',
      'crypto-news/defi': 'term-color-140',
      'stock-news': 'term-color-141',
      'ai-news': 'term-color-110'
    };
    return colorMap[categorySlug] || 'term-color-136';
  }

  // Render featured article section
  function renderFeaturedSection(data) {
    const section = document.querySelector('[data-section="featured"]');
    if (!section || containsIframe(section)) {
      console.log('Featured section skipped (not found or contains iframe)');
      return;
    }

    const categoryColorClass = getCategoryColorClass(data.categorySlug);

    const html = `
<article class="l-post grid-post grid-base-post">
  <div class="media">
    <a href="${articleHref(data)}" class="image-link media-ratio ratio-16-9" title="${data.title}">
      <span data-bgsrc="${data.imageUrl}" class="img bg-cover wp-post-image lazyload" role="img" aria-label="${data.title}"></span>
    </a>
  </div>
  <div class="content">
    <div class="post-meta post-meta-a has-below">
      <div class="post-meta-items meta-above">
        <span class="meta-item cat-labels">
          <a href="/category/${data.categorySlug}/" class="category ${categoryColorClass}" rel="category">${data.category}</a>
        </span>
      </div>
      <h2 class="is-title post-title"><a href="${articleHref(data)}">${data.title}</a></h2>
      <div class="post-meta-items meta-below">
        <span class="meta-item date"><span class="date-link"><time class="post-date">${data.date}</time></span></span>
      </div>
    </div>
    <div class="excerpt">
      <p>${data.excerpt}</p>
    </div>
  </div>
</article>
    `;

    const loopContainer = section.querySelector('.loop');
    if (loopContainer) {
      loopContainer.innerHTML = html;
      console.log('✅ Featured section updated');
    }
  }

  // Render latest news section
  function renderLatestNewsSection(data) {
    const section = document.querySelector('[data-section="latest-news"]');
    if (!section || containsIframe(section)) {
      console.log('Latest news section skipped (not found or contains iframe)');
      return;
    }

    const items = data.items || [];
    const html = items.map(item => {
      const categoryColorClass = getCategoryColorClass(item.categorySlug);
      return `
<article class="l-post list-post list-post-on-sm m-pos-left">
  <div class="media">
    <a href="${articleHref(item)}" class="image-link media-ratio ratio-16-9" title="${item.title}">
      <span data-bgsrc="${item.imageUrl}" class="img bg-cover wp-post-image lazyload" role="img" aria-label="${item.title}"></span>
    </a>
  </div>
  <div class="content">
    <div class="post-meta post-meta-a has-below">
      <div class="post-meta-items meta-above">
        <span class="meta-item cat-labels">
          <a href="/category/${item.categorySlug}/" class="category ${categoryColorClass}" rel="category">${item.category}</a>
        </span>
      </div>
      <h2 class="is-title post-title"><a href="${articleHref(item)}">${item.title}</a></h2>
      <div class="post-meta-items meta-below">
        <span class="meta-item date"><span class="date-link"><time class="post-date">${item.date}</time></span></span>
      </div>
    </div>
    ${item.excerpt ? `<div class="excerpt"><p>${item.excerpt}</p></div>` : ''}
  </div>
</article>
      `;
    }).join('');

    const loopContainer = section.querySelector('.loop');
    if (loopContainer) {
      loopContainer.innerHTML = html;
      console.log(`✅ Latest news section updated (${items.length} items)`);
    }
  }

  // Render stock news section
  function renderStockNewsSection(data) {
    const section = document.querySelector('[data-section="stock-news"]');
    if (!section || containsIframe(section)) {
      console.log('Stock news section skipped (not found or contains iframe)');
      return;
    }

    const featured = data.featured;
    const items = data.items || [];
    const featuredImg = stockFeaturedImage(featured.imageUrl);

    // Featured article
    const featuredHtml = `
<article class="l-post grid-post grid-base-post">
  <div class="media">
    <a href="${articleHref(featured)}" class="image-link media-ratio ratio-16-9" title="${featured.title}">
      <span data-bgsrc="${featuredImg}" class="img bg-cover wp-post-image lazyload" role="img" aria-label="${featured.title}"></span>
    </a>
  </div>
  <div class="content">
    <div class="post-meta post-meta-a has-below">
      <div class="post-meta-items meta-above">
        <span class="meta-item cat-labels">
          <a href="/category/${featured.categorySlug}/" class="category term-color-141" rel="category">${featured.category}</a>
        </span>
      </div>
      <h2 class="is-title post-title"><a href="${articleHref(featured)}">${featured.title}</a></h2>
      <div class="post-meta-items meta-below">
        <span class="meta-item date"><span class="date-link"><time class="post-date">${featured.date}</time></span></span>
      </div>
    </div>
  </div>
</article>
    `;

    // Small items
    const itemsHtml = items.map((item, index) => `
<article class="l-post small-post m-pos-left">
  <div class="media">
    <a href="${articleHref(item)}" class="image-link media-ratio ratio-4-3" title="${item.title}">
      <span data-bgsrc="${stockSmallImage(item.imageUrl, index)}" class="img bg-cover wp-post-image lazyload" role="img" aria-label="${item.title}"></span>
    </a>
  </div>
  <div class="content">
    <div class="post-meta post-meta-a post-meta-left has-below">
      <h4 class="is-title post-title limit-lines l-lines-2"><a href="${articleHref(item)}">${item.title}</a></h4>
      <div class="post-meta-items meta-below">
        <span class="meta-item date"><span class="date-link"><time class="post-date">${item.date}</time></span></span>
      </div>
    </div>
  </div>
</article>
    `).join('');

    // Featured: markup is one div with classes `loop loop-grid loop-grid-base` (not .loop inside .loop-grid-base)
    const featuredContainer = section.querySelector('.loop.loop-grid-base');
    // Small list lives in a sibling Elementor widget (smartmag-postssmall), still same sidebar column
    const sidebarColumn = section.closest('.elementor-column');
    const smallItemsContainer = sidebarColumn
      ? sidebarColumn.querySelector('.loop-small')
      : null;

    if (featuredContainer) {
      featuredContainer.innerHTML = featuredHtml;
    } else {
      console.warn('Stock news: featured container .loop.loop-grid-base not found');
    }
    if (smallItemsContainer) {
      smallItemsContainer.innerHTML = itemsHtml;
    } else {
      console.warn('Stock news: small list .loop-small not found (check sidebar column)');
    }

    if (featuredContainer || smallItemsContainer) {
      console.log('✅ Stock news section updated');
    }
  }

  // Render AI news section
  function renderAINewsSection(data) {
    const section = document.querySelector('[data-section="ai-news"]');
    if (!section || containsIframe(section)) {
      console.log('AI news section skipped (not found or contains iframe)');
      return;
    }

    const featured = data.featured;
    const items = data.items || [];
    const aiFeaturedImg = aiFeaturedImage(featured.imageUrl);

    // Featured overlay article
    const featuredHtml = `
<article class="l-post grid-overlay overlay-post grid-overlay-a overlay-base-post">
  <div class="media">
    <a href="${articleHref(featured)}" class="image-link media-ratio ratio-16-9" title="${featured.title}">
      <span data-bgsrc="${aiFeaturedImg}" class="img bg-cover wp-post-image lazyload" role="img" aria-label="${featured.title}"></span>
    </a>
  </div>
  <div class="content-wrap">
    <div class="content">
      <div class="post-meta post-meta-a meta-contrast has-below">
        <div class="post-meta-items meta-above">
          <span class="meta-item cat-labels">
            <a href="/category/${featured.categorySlug}/" class="category term-color-110" rel="category" tabindex="-1">${featured.category}</a>
          </span>
        </div>
        <h2 class="is-title post-title"><a href="${articleHref(featured)}">${featured.title}</a></h2>
        <div class="post-meta-items meta-below">
          <span class="meta-item date"><span class="date-link"><time class="post-date">${featured.date}</time></span></span>
        </div>
      </div>
    </div>
  </div>
</article>
    `;

    // List items
    const itemsHtml = items.map((item, index) => `
<article class="l-post list-post list-post-on-sm m-pos-right">
  <div class="media">
    <a href="${articleHref(item)}" class="image-link media-ratio ratio-16-9" title="${item.title}">
      <span data-bgsrc="${aiListImage(item.imageUrl, index)}" class="img bg-cover wp-post-image lazyload" role="img" aria-label="${item.title}"></span>
    </a>
  </div>
  <div class="content">
    <div class="post-meta post-meta-a">
      <div class="post-meta-items meta-above">
        <span class="meta-item cat-labels">
          <a href="/category/${item.categorySlug}/" class="category term-color-110" rel="category">${item.category}</a>
        </span>
      </div>
      <h2 class="is-title post-title limit-lines l-lines-2"><a href="${articleHref(item)}">${item.title}</a></h2>
    </div>
  </div>
</article>
    `).join('');

    // Find both containers - AI news has two different sections
    const featuredContainer = section.querySelector('.loop-overlay');
    const listContainer = section.querySelector('.loop-list');

    if (featuredContainer) {
      featuredContainer.innerHTML = featuredHtml;
    }
    if (listContainer) {
      listContainer.innerHTML = itemsHtml;
    }

    console.log('✅ AI news section updated');
  }

  // Update ticker prices
  function updateTicker(data) {
    const ticker = document.querySelector('[data-section="ticker"]');
    if (!ticker || containsIframe(ticker)) {
      console.log('Ticker skipped (not found or contains iframe)');
      return;
    }

    const coins = data.coins || [];

    coins.forEach(coin => {
      const slug = tickerDomSlug(coin);
      if (!slug) return;
      // Update prices in both ticker bar and sidebar widget
      const priceElements = document.querySelectorAll(`[data-live-price="${slug}"]`);
      priceElements.forEach(el => {
        const priceSpan = el.querySelector('span');
        const changeSpan = el.closest('.cc-coin, .mcw-list-row')?.querySelector('.mcw-list-change, .cc-change');

        if (priceSpan) {
          priceSpan.textContent = coin.price_eur;
        }

        if (changeSpan) {
          const change = parseFloat(coin.change_24h);
          changeSpan.textContent = Math.abs(change).toFixed(2) + '%';
          changeSpan.className = change >= 0 ? 'mcw-list-change up' : 'mcw-list-change down';
        }
      });
    });

    console.log(`✅ Ticker updated (${coins.length} coins)`);
  }

  // Fetch JSON file — falls back to English if lang-specific file does not exist
  async function fetchJSON(filename) {
    try {
      const response = await fetch(`${CONTENT_BASE}/${filename}`, { cache: 'no-store' });
      if (!response.ok) {
        // Fall back to English content
        if (_pathLang !== 'en') {
          const fallback = await fetch(`/content/homepage/${filename}`, { cache: 'no-store' });
          if (fallback.ok) return await fallback.json();
        }
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch ${filename}:`, error.message);
      return null;
    }
  }

  // Initialize all sections
  async function initializeHomepageContent() {
    console.log('🚀 Homepage content loader starting...');

    // Ticker
    const tickerData = await fetchJSON('ticker.json');
    if (tickerData) updateTicker(tickerData);

    // Featured
    const featuredData = await fetchJSON('featured.json');
    if (featuredData) renderFeaturedSection(featuredData);

    // Latest News
    const latestNewsData = await fetchJSON('latest-news.json');
    if (latestNewsData) renderLatestNewsSection(latestNewsData);

    // Stock News
    const stockNewsData = await fetchJSON('stock-news.json');
    if (stockNewsData) renderStockNewsSection(stockNewsData);

    // AI News
    const aiNewsData = await fetchJSON('ai-news.json');
    if (aiNewsData) renderAINewsSection(aiNewsData);

    // Re-initialize lazy loading for new images
    if (window.BunyadLazy && window.BunyadLazy.load) {
      window.BunyadLazy.load.initBgImages(true);
    }

    console.log('✅ Homepage content loader complete');
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHomepageContent);
  } else {
    initializeHomepageContent();
  }

})();
