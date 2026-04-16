/* CryptoLoveYou theme toggle — dark default, light optional */
(function () {
  'use strict';
  var saved = localStorage.getItem('clv-theme');
  // Default = dark. Only switch to light if user has explicitly chosen.
  if (saved === 'light') {
    document.documentElement.classList.add('clv-light');
  }

  function createToggle() {
    if (document.getElementById('clv-theme-toggle')) return;
    var btn = document.createElement('button');
    btn.id = 'clv-theme-toggle';
    btn.setAttribute('aria-label', 'Toggle light/dark theme');
    btn.textContent = document.documentElement.classList.contains('clv-light') ? '🌙' : '☀️';
    btn.addEventListener('click', function () {
      document.documentElement.classList.toggle('clv-light');
      var isLight = document.documentElement.classList.contains('clv-light');
      localStorage.setItem('clv-theme', isLight ? 'light' : 'dark');
      btn.textContent = isLight ? '🌙' : '☀️';
    });
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createToggle);
  } else {
    createToggle();
  }
})();
