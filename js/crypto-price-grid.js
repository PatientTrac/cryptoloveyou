/* ============================================================
   CryptoLoveYou — Live Crypto Price Grid (USD)
   Fetches top 10 coins from CoinGecko public API
   Replaces the old EUR/white MCW widget
   ============================================================ */
(function () {
  const CONTAINER_ID = 'clv-price-grid';
  const COINS = 'bitcoin,ethereum,tether,ripple,binancecoin,usd-coin,solana,tron,staked-ether,cardano';
  const API = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${COINS}&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h`;
  const REFRESH_MS = 60000;

  const ICONS = {
    bitcoin:      'https://coin-images.coingecko.com/coins/images/1/thumb/bitcoin.png',
    ethereum:     'https://coin-images.coingecko.com/coins/images/279/thumb/ethereum.png',
    tether:       'https://coin-images.coingecko.com/coins/images/325/thumb/Tether.png',
    ripple:       'https://coin-images.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png',
    binancecoin:  'https://coin-images.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png',
    'usd-coin':   'https://coin-images.coingecko.com/coins/images/6319/thumb/USDC.png',
    solana:       'https://coin-images.coingecko.com/coins/images/4128/thumb/solana.png',
    tron:         'https://coin-images.coingecko.com/coins/images/1094/thumb/tron-logo.png',
    'staked-ether':'https://coin-images.coingecko.com/coins/images/13442/thumb/steth_logo.png',
    cardano:      'https://coin-images.coingecko.com/coins/images/975/thumb/cardano.png',
  };

  function fmt(price) {
    if (price >= 1000) return '$' + price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1)    return '$' + price.toFixed(2);
    return '$' + price.toFixed(6);
  }

  function fmtCap(n) {
    if (!n) return '—';
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2) + 'M';
    return '$' + n.toLocaleString();
  }

  function renderSkeleton(container) {
    container.innerHTML = `
      <style>
        #clv-price-grid{font-family:system-ui,-apple-system,sans-serif;border-radius:16px;overflow:hidden;background:rgba(13,5,26,0.85);border:1px solid rgba(124,58,237,0.25);backdrop-filter:blur(12px);}
        #clv-price-grid .pg-header{display:grid;grid-template-columns:2fr 1.2fr 1fr 1.3fr;padding:10px 16px;border-bottom:1px solid rgba(124,58,237,0.2);font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#7c6fa0;}
        #clv-price-grid .pg-row{display:grid;grid-template-columns:2fr 1.2fr 1fr 1.3fr;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.04);align-items:center;transition:background .15s;}
        #clv-price-grid .pg-row:last-child{border-bottom:none;}
        #clv-price-grid .pg-row:hover{background:rgba(124,58,237,0.08);}
        #clv-price-grid .pg-coin{display:flex;align-items:center;gap:10px;}
        #clv-price-grid .pg-coin img{width:26px;height:26px;border-radius:50%;}
        #clv-price-grid .pg-name{font-size:14px;font-weight:600;color:#f5f3ff;}
        #clv-price-grid .pg-symbol{font-size:11px;color:#7c6fa0;margin-top:1px;}
        #clv-price-grid .pg-price{font-size:14px;font-weight:600;color:#e2e0f0;text-align:right;}
        #clv-price-grid .pg-change{font-size:13px;font-weight:600;text-align:right;}
        #clv-price-grid .pg-change.up{color:#22c55e;}
        #clv-price-grid .pg-change.dn{color:#ef4444;}
        #clv-price-grid .pg-cap{font-size:12px;color:#7c6fa0;text-align:right;}
        #clv-price-grid .pg-footer{padding:8px 16px;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#4a3d6b;border-top:1px solid rgba(124,58,237,0.15);}
        #clv-price-grid .pg-footer a{color:#7c3aed;text-decoration:none;}
        #clv-price-grid .pg-footer a:hover{color:#a78bfa;}
        #clv-price-grid .pg-pulse{display:inline-block;width:6px;height:6px;border-radius:50%;background:#22c55e;margin-right:6px;animation:pulse 2s infinite;}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.3;}}
        #clv-price-grid .pg-skel{background:linear-gradient(90deg,rgba(124,58,237,0.08) 25%,rgba(124,58,237,0.15) 50%,rgba(124,58,237,0.08) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;border-radius:4px;height:14px;}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @media(max-width:600px){#clv-price-grid .pg-cap{display:none;}#clv-price-grid .pg-header,#clv-price-grid .pg-row{grid-template-columns:2fr 1.2fr 1fr;}}
      </style>
      <div class="pg-header">
        <span>Asset</span><span style="text-align:right">Price (USD)</span><span style="text-align:right">24h</span><span style="text-align:right">Market Cap</span>
      </div>
      ${[...Array(10)].map(() => `
        <div class="pg-row">
          <div class="pg-coin"><div class="pg-skel" style="width:26px;height:26px;border-radius:50%;flex-shrink:0"></div><div><div class="pg-skel" style="width:80px;margin-bottom:4px"></div><div class="pg-skel" style="width:40px;height:10px"></div></div></div>
          <div class="pg-skel" style="width:90px;margin-left:auto"></div>
          <div class="pg-skel" style="width:50px;margin-left:auto"></div>
          <div class="pg-skel" style="width:70px;margin-left:auto"></div>
        </div>`).join('')}
      <div class="pg-footer"><span><span class="pg-pulse"></span>Loading live prices…</span><span>Powered by <a href="https://www.coingecko.com" target="_blank" rel="noopener">CoinGecko</a></span></div>
    `;
  }

  function renderData(container, coins) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    container.innerHTML = `
      <div class="pg-header">
        <span>Asset</span><span style="text-align:right">Price (USD)</span><span style="text-align:right">24h</span><span style="text-align:right">Market Cap</span>
      </div>
      ${coins.map(c => {
        const ch = parseFloat(c.price_change_percentage_24h || 0);
        const up = ch >= 0;
        const icon = ICONS[c.id] || c.image;
        return `
        <div class="pg-row">
          <div class="pg-coin">
            <img src="${icon}" alt="${c.name}" loading="lazy">
            <div>
              <div class="pg-name">${c.name}</div>
              <div class="pg-symbol">${c.symbol.toUpperCase()}</div>
            </div>
          </div>
          <div class="pg-price">${fmt(c.current_price)}</div>
          <div class="pg-change ${up ? 'up' : 'dn'}">${up ? '▲' : '▼'} ${Math.abs(ch).toFixed(2)}%</div>
          <div class="pg-cap">${fmtCap(c.market_cap)}</div>
        </div>`;
      }).join('')}
      <div class="pg-footer">
        <span><span class="pg-pulse"></span>Live · Updated ${timestamp} UTC</span>
        <span>Powered by <a href="https://www.coingecko.com" target="_blank" rel="noopener">CoinGecko</a></span>
      </div>
    `;
  }

  function renderError(container) {
    container.innerHTML += `<div style="padding:12px 16px;font-size:12px;color:#7c6fa0;text-align:center;">Unable to load live prices. Retrying…</div>`;
  }

  async function fetchAndRender(container) {
    try {
      const res = await fetch(API, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (data && data.length) renderData(container, data);
      else renderError(container);
    } catch (e) {
      renderError(container);
    }
  }

  function init() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;
    renderSkeleton(container);
    fetchAndRender(container);
    setInterval(() => fetchAndRender(container), REFRESH_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
