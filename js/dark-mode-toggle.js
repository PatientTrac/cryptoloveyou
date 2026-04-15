(function () {
  var KEY = 'clv-theme';
  var html = document.documentElement;

  function applyTheme(dark) {
    if (dark) {
      html.classList.add('clv-dark');
    } else {
      html.classList.remove('clv-dark');
    }
    var btn = document.getElementById('clv-dark-toggle');
    if (btn) {
      btn.textContent = dark ? '☀️' : '🌙';
      btn.setAttribute('data-tip', dark ? 'Switch to light' : 'Switch to dark');
    }
  }

  function getSaved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function setSaved(val) {
    try { localStorage.setItem(KEY, val); } catch (e) {}
  }

  var saved = getSaved();
  var isDark = saved === 'dark';
  applyTheme(isDark);

  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.createElement('button');
    btn.id = 'clv-dark-toggle';
    btn.setAttribute('aria-label', 'Toggle dark mode');
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.setAttribute('data-tip', isDark ? 'Switch to light' : 'Switch to dark');
    document.body.appendChild(btn);

    btn.addEventListener('click', function () {
      isDark = !isDark;
      applyTheme(isDark);
      setSaved(isDark ? 'dark' : 'light');
    });
  });
})();
