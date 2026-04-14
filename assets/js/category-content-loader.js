/**
 * Category Content Loader
 * Fetches fresh articles from homepage JSON and injects them into category pages.
 * Targets the .loop.loop-grid-base grid on /category/crypto-news/* pages.
 */
(function () {
  'use strict';

  // Map URL path segments to categorySlug values used in JSON
  const CATEGORY_SLUG_MAP = {
    'bitcoin':    'crypto-news/bitcoin',
    'ethereum':   'crypto-news/ethereum',
    'altcoins':   'crypto-news/altcoins',
    'blockchain': 'crypto-news/blockchain',
    'defi':       'crypto-news/defi'
  };

  const CATEGORY_LABELS = {
    'crypto-news/bitcoin':    'Bitcoin',
    'crypto-news/ethereum':   'Ethereum',
    'crypto-news/altcoins':   'Altcoins',
    'crypto-news/blockchain': 'Blockchain',
    'crypto-news/defi':       'DeFi'
  };

  const CATEGORY_COLOR = {
    'crypto-news/bitcoin':    'term-color-136',
    'crypto-news/ethereum':   'term-color-137',
    'crypto-news/altcoins':   'term-color-138',
    'crypto-news/blockchain': 'term-color-139',
    'crypto-news/defi':       'term-color-140'
  };

  // Fallback crypto images for articles without images
  const FALLBACK_IMAGES = [
    '/wp-content/uploads/2026/03/Bitcoin-Rally-Stalls-Near-70K-Will-Altcoins-Keep-Going-450x300.jpg',
    '/wp-content/uploads/2026/03/Bitcoin-Trend-Reversal-Possible-If-74K-Holds-Will-Altcoins-Follow-450x300.jpg',
    '/wp-content/uploads/2026/03/Bitcoin-Surges-to-Six-Week-High-as-Bulls-Eye-80K-450x270.jpg',
    '/wp-content/uploads/2026/03/Bitmines-Ether-Holdings-Reach-46M-ETH-About-38-of-Supply-450x300.jpg',
    '/wp-content/uploads/2026/03/Crypto-Exchanges-Emerge-as-TradFi-Venues-amid-Tokenized-Commodities-Boom-450x300.jpg',
    '/wp-content/uploads/2026/03/1inch-and-Ondo-RWA-Volumes-Top-25B-as-RWAs-Climb-450x300.jpg',
    '/wp-content/uploads/2026/03/Aave-Rift-Bitcoin-Rebound-and-ETF-Inflows-Dominate-the-Crypto-450x300.jpg',
    '/wp-content/uploads/2026/03/78-of-Top-Alts-Beating-Bitcoin-ETH-Up-2X-450x270.jpg'
  ];

  function detectCategory() {
    // Match /category/crypto-news/bitcoin/ etc.
    const m = location.pathname.match(/\/category\/crypto-news\/([^\/]+)/);
    if (!m) return null;
    const key = m[1].toLowerCase();
    return CATEGORY_SLUG_MAP[key] ? { key, slug: CATEGORY_SLUG_MAP[key] } : null;
  }

  function articleHref(obj) {
    if (!obj) return '#';
    const raw = String(obj.slug || obj.url || '').trim();
    if (!raw) return '#';
    if (/^https?:\/\//i.test(raw)) return raw;
    let s = raw.startsWith('/') ? raw : '/' + raw;
    if (s.length > 1 && !s.endsWith('/')) s += '/';
    return s;
  }

  function getImage(item, index) {
    const url = item.imageUrl || '';
    if (url && url.startsWith('/wp-content/') && !url.includes('asdas')) return url;
    return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
  }

  function renderArticleCard(item, index) {
    const href = articleHref(item);
    const img = getImage(item, index);
    const colorClass = CATEGORY_COLOR[item.categorySlug] || 'term-color-136';
    const catLabel = CATEGORY_LABELS[item.categorySlug] || item.category || 'Crypto News';
    const catSlug = item.categorySlug || 'crypto-news/bitcoin';
    const title = item.title || '';
    const excerpt = item.excerpt || '';
    const date = item.date || '';

    return `
<article class="l-post grid-post grid-base-post">
  <div class="media">
    <a href="${href}" class="image-link media-ratio ratio-16-9" title="${title}">
      <span data-bgsrc="${img}" class="img bg-cover wp-post-image lazyload" role="img" aria-label="${title}"></span>
    </a>
  </div>
  <div class="content">
    <div class="post-meta post-meta-a has-below">
      <div class="post-meta-items meta-above">
        <span class="meta-item post-cat">
          <a href="/category/${catSlug}/" class="category ${colorClass}" rel="category">${catLabel}</a>
        </span>
      </div>
      <h2 class="is-title post-title">
        <a href="${href}">${title}</a>
      </h2>
      <div class="post-meta-items meta-below">
        <span class="meta-item date">
          <span class="date-link"><time class="post-date">${date}</time></span>
        </span>
      </div>
    </div>
    ${excerpt ? `<div class="excerpt"><p>${excerpt}</p></div>` : ''}
  </div>
</article>`;
  }

  async function fetchJSON(url) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      console.warn('Category loader: failed to fetch', url, e.message);
      return null;
    }
  }

  async function loadCategoryContent() {
    const cat = detectCategory();
    if (!cat) return;

    console.log('🚀 Category loader: loading', cat.slug);

    // Fetch featured + latest-news JSON (same files homepage uses)
    const [featured, latestNews] = await Promise.all([
      fetchJSON('/content/homepage/featured.json'),
      fetchJSON('/content/homepage/latest-news.json')
    ]);

    // Collect all articles matching this category
    const articles = [];

    if (featured && featured.categorySlug === cat.slug) {
      articles.push(featured);
    }

    if (latestNews && Array.isArray(latestNews.items)) {
      latestNews.items
        .filter(item => item.categorySlug === cat.slug)
        .forEach(item => articles.push(item));
    }

    if (articles.length === 0) {
      console.log('Category loader: no new articles for', cat.slug, '— keeping existing content');
      return;
    }

    // Find the main article grid
    const grid = document.querySelector('.loop.loop-grid-base');
    if (!grid) {
      console.warn('Category loader: .loop.loop-grid-base not found');
      return;
    }

    // Prepend new articles to existing ones (keep WordPress articles below)
    const newHTML = articles.map((item, i) => renderArticleCard(item, i)).join('\n');
    grid.innerHTML = newHTML + grid.innerHTML;

    // Re-init lazy loading
    if (window.BunyadLazy && window.BunyadLazy.load) {
      window.BunyadLazy.load.initBgImages(true);
    }

    console.log('✅ Category loader: injected', articles.length, 'new articles into', cat.slug);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCategoryContent);
  } else {
    loadCategoryContent();
  }

})();
