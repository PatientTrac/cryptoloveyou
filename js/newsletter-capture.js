/**
 * CryptoLoveYou — Newsletter Capture Widget
 * Injects: inline forms, homepage banner, exit-intent popup
 * Submits to: /.netlify/functions/beehiiv-subscribe
 */
(function () {
  var ENDPOINT = '/.netlify/functions/beehiiv-subscribe';

  // ── Styles ────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = `
    .clv-nl-wrap { font-family: system-ui, -apple-system, sans-serif; }

    /* Inline banner (homepage + category top) */
    .clv-nl-banner {
      background: linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(59,130,246,0.10) 100%);
      border: 1px solid rgba(124,58,237,0.2);
      border-radius: 14px;
      padding: 24px 28px;
      margin: 24px 0;
      display: flex;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    html.clv-dark .clv-nl-banner {
      background: linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(59,130,246,0.12) 100%);
      border-color: rgba(167,139,250,0.25);
    }
    .clv-nl-banner-text { flex: 1; min-width: 200px; }
    .clv-nl-banner-text strong {
      display: block; font-size: 16px; font-weight: 700;
      color: #1e1b4b; margin-bottom: 3px;
    }
    html.clv-dark .clv-nl-banner-text strong { color: #f5f3ff; }
    .clv-nl-banner-text span { font-size: 13px; color: #6d28d9; }
    html.clv-dark .clv-nl-banner-text span { color: #c4b5fd; }
    .clv-nl-form { display: flex; gap: 8px; flex-wrap: wrap; }
    .clv-nl-input {
      padding: 10px 14px; border-radius: 8px; font-size: 14px;
      border: 1.5px solid rgba(124,58,237,0.25); outline: none;
      background: rgba(255,255,255,0.9); color: #1e1b4b;
      min-width: 220px; flex: 1;
      transition: border-color 0.2s;
    }
    html.clv-dark .clv-nl-input {
      background: rgba(18,5,38,0.7); color: #f5f3ff;
      border-color: rgba(167,139,250,0.3);
    }
    .clv-nl-input:focus { border-color: #7c3aed; }
    .clv-nl-btn {
      padding: 10px 20px; border-radius: 8px; font-size: 14px;
      font-weight: 600; cursor: pointer; border: none; white-space: nowrap;
      background: linear-gradient(135deg, #7c3aed, #3b82f6);
      color: #fff; transition: opacity 0.2s, transform 0.15s;
    }
    .clv-nl-btn:hover { opacity: 0.88; transform: translateY(-1px); }
    .clv-nl-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .clv-nl-msg {
      font-size: 13px; margin-top: 8px; width: 100%;
      padding: 8px 12px; border-radius: 6px;
    }
    .clv-nl-msg.ok { background: rgba(34,197,94,0.1); color: #15803d; }
    .clv-nl-msg.err { background: rgba(239,68,68,0.1); color: #b91c1c; }

    /* Mid-article inline strip */
    .clv-nl-strip {
      background: linear-gradient(90deg, #7c3aed 0%, #3b82f6 100%);
      border-radius: 12px; padding: 20px 24px;
      display: flex; align-items: center; gap: 16px;
      flex-wrap: wrap; margin: 32px 0;
    }
    .clv-nl-strip-text { flex: 1; min-width: 160px; }
    .clv-nl-strip-text strong { display: block; color: #fff; font-size: 15px; margin-bottom: 2px; }
    .clv-nl-strip-text span { color: rgba(255,255,255,0.8); font-size: 12px; }

    /* Exit-intent popup */
    .clv-nl-overlay {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(10,2,30,0.65); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
    }
    .clv-nl-popup {
      background: linear-gradient(135deg, #f5f0ff 0%, #e0f2fe 100%);
      border: 1px solid rgba(124,58,237,0.2);
      border-radius: 20px; padding: 36px 32px;
      max-width: 480px; width: 100%;
      position: relative; text-align: center;
    }
    html.clv-dark .clv-nl-popup {
      background: linear-gradient(135deg, #12051e 0%, #0d1f3c 100%);
      border-color: rgba(167,139,250,0.3);
    }
    .clv-nl-popup-close {
      position: absolute; top: 14px; right: 16px;
      background: none; border: none; font-size: 20px;
      cursor: pointer; color: #6d28d9; line-height: 1;
    }
    html.clv-dark .clv-nl-popup-close { color: #a78bfa; }
    .clv-nl-popup-icon { font-size: 40px; margin-bottom: 12px; }
    .clv-nl-popup h3 {
      font-size: 22px; font-weight: 700; color: #1e1b4b;
      margin: 0 0 8px;
    }
    html.clv-dark .clv-nl-popup h3 { color: #f5f3ff; }
    .clv-nl-popup p {
      font-size: 14px; color: #4c1d95; margin: 0 0 20px; line-height: 1.5;
    }
    html.clv-dark .clv-nl-popup p { color: #c4b5fd; }
    .clv-nl-popup .clv-nl-form { justify-content: center; }
    .clv-nl-popup .clv-nl-input { min-width: 0; }
    .clv-nl-popup-skip {
      display: block; margin-top: 12px; font-size: 12px;
      color: #9ca3af; cursor: pointer; background: none; border: none;
    }
    .clv-nl-popup-skip:hover { color: #6d28d9; }
    .clv-nl-badges {
      display: flex; justify-content: center; gap: 12px;
      margin-bottom: 16px; flex-wrap: wrap;
    }
    .clv-nl-badge {
      font-size: 11px; padding: 3px 10px; border-radius: 20px;
      background: rgba(124,58,237,0.1); color: #5b21b6; font-weight: 600;
    }
    html.clv-dark .clv-nl-badge { background: rgba(167,139,250,0.15); color: #c4b5fd; }
  `;
  document.head.appendChild(style);

  // ── Submit helper ─────────────────────────────────────────
  function subscribe(email, source, btn, msgEl, onSuccess) {
    btn.disabled = true;
    btn.textContent = 'Subscribing…';
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source })
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.success) {
        msgEl.className = 'clv-nl-msg ok';
        msgEl.textContent = "🎉 You're in! Check your inbox for a confirmation.";
        btn.textContent = '✓ Subscribed!';
        if (onSuccess) onSuccess();
      } else {
        throw new Error(data.error || 'Subscription failed');
      }
    })
    .catch(function (err) {
      msgEl.className = 'clv-nl-msg err';
      msgEl.textContent = err.message || 'Something went wrong. Please try again.';
      btn.disabled = false;
      btn.textContent = 'Subscribe';
    });
  }

  function buildForm(source, btnText) {
    var wrap = document.createElement('div');
    wrap.className = 'clv-nl-wrap';
    wrap.innerHTML =
      '<div class="clv-nl-form">' +
        '<input class="clv-nl-input" type="email" placeholder="Enter your email…" autocomplete="email">' +
        '<button class="clv-nl-btn">' + btnText + '</button>' +
      '</div>' +
      '<div class="clv-nl-msg" style="display:none"></div>';

    var input = wrap.querySelector('.clv-nl-input');
    var btn   = wrap.querySelector('.clv-nl-btn');
    var msg   = wrap.querySelector('.clv-nl-msg');

    function trySubscribe() {
      msg.style.display = 'none';
      var email = input.value.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        msg.style.display = 'block';
        msg.className = 'clv-nl-msg err';
        msg.textContent = 'Please enter a valid email address.';
        return;
      }
      msg.style.display = 'block';
      subscribe(email, source, btn, msg, null);
    }

    btn.addEventListener('click', trySubscribe);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') trySubscribe(); });
    return wrap;
  }

  // ── 1. Homepage banner ────────────────────────────────────
  function injectHomepageBanner() {
    var priceGrid = document.getElementById('clv-price-grid');
    if (!priceGrid) return;
    var banner = document.createElement('div');
    banner.className = 'clv-nl-banner clv-nl-wrap';
    banner.innerHTML =
      '<div class="clv-nl-banner-text">' +
        '<strong>📬 Free weekly crypto + AI newsletter</strong>' +
        '<span>Top picks, price analysis & AI money guides. No spam, ever.</span>' +
      '</div>';
    var form = buildForm('homepage_banner', 'Subscribe free');
    form.querySelector('.clv-nl-form').style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    banner.appendChild(form);
    priceGrid.parentNode.insertBefore(banner, priceGrid);
  }

  // ── 2. Mid-article strip (guide pages) ───────────────────
  function injectGuideStrip() {
    var faq = document.querySelector('.faq-section, [id*="faq"], [class*="faq"]');
    if (!faq) return;
    var strip = document.createElement('div');
    strip.className = 'clv-nl-strip clv-nl-wrap';
    strip.innerHTML =
      '<div class="clv-nl-strip-text">' +
        '<strong>🚀 Get the best AI + crypto picks weekly</strong>' +
        '<span>Free newsletter · 5,000+ subscribers · Unsubscribe anytime</span>' +
      '</div>';
    var form = buildForm('guide_strip', 'Join free →');
    form.querySelector('.clv-nl-input').style.background = 'rgba(255,255,255,0.15)';
    form.querySelector('.clv-nl-input').style.color = '#fff';
    form.querySelector('.clv-nl-input').style.borderColor = 'rgba(255,255,255,0.3)';
    form.querySelector('.clv-nl-input').placeholder = 'your@email.com';
    form.querySelector('.clv-nl-btn').style.background = '#fff';
    form.querySelector('.clv-nl-btn').style.color = '#7c3aed';
    strip.appendChild(form);
    faq.parentNode.insertBefore(strip, faq);
  }

  // ── 3. Exit-intent popup ──────────────────────────────────
  function injectExitPopup() {
    var shown = false;
    try { if (localStorage.getItem('clv-nl-dismissed')) return; } catch(e) {}

    function showPopup() {
      if (shown) return;
      shown = true;

      var overlay = document.createElement('div');
      overlay.className = 'clv-nl-overlay';
      overlay.innerHTML =
        '<div class="clv-nl-popup">' +
          '<button class="clv-nl-popup-close" aria-label="Close">×</button>' +
          '<div class="clv-nl-popup-icon">₿</div>' +
          '<h3>Wait — don\'t miss out</h3>' +
          '<div class="clv-nl-badges">' +
            '<span class="clv-nl-badge">Weekly AI picks</span>' +
            '<span class="clv-nl-badge">Crypto signals</span>' +
            '<span class="clv-nl-badge">Earning strategies</span>' +
          '</div>' +
          '<p>Join 5,000+ readers getting the best AI crypto opportunities every week. Free forever.</p>' +
          '<div id="clv-popup-form"></div>' +
          '<button class="clv-nl-popup-skip">No thanks, I\'ll miss out</button>' +
        '</div>';

      document.body.appendChild(overlay);

      var form = buildForm('exit_popup', 'Send me the newsletter →');
      document.getElementById('clv-popup-form').appendChild(form);

      function close() {
        overlay.remove();
        try { localStorage.setItem('clv-nl-dismissed', '1'); } catch(e) {}
      }

      overlay.querySelector('.clv-nl-popup-close').addEventListener('click', close);
      overlay.querySelector('.clv-nl-popup-skip').addEventListener('click', close);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

      // Auto-close after success
      var origBtn = form.querySelector('.clv-nl-btn');
      var origClick = origBtn.onclick;
      form.querySelector('.clv-nl-btn').addEventListener('click', function () {
        setTimeout(function () {
          if (form.querySelector('.clv-nl-msg.ok')) {
            setTimeout(close, 3000);
          }
        }, 1500);
      });
    }

    // Desktop: mouse leaves viewport top
    document.addEventListener('mouseleave', function (e) {
      if (e.clientY < 20) showPopup();
    });

    // Mobile: scroll 70% then back up
    var maxScroll = 0;
    window.addEventListener('scroll', function () {
      var pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (pct > maxScroll) maxScroll = pct;
      if (maxScroll > 0.7 && pct < maxScroll - 0.15) showPopup();
    }, { passive: true });
  }

  // ── Init ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    injectHomepageBanner();
    injectGuideStrip();
    injectExitPopup();
  });
})();
