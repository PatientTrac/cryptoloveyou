/**
 * CryptoLoveYou — Service Worker
 * File: /sw.js (must be at root for full-scope registration)
 *
 * Provides:
 * 1. Cache-first strategy for static assets (CSS, JS, images)
 * 2. Network-first for HTML pages (always fresh content)
 * 3. Offline fallback page
 * 4. Push notification reception foundation (Axon Key 3)
 *
 * To register: add to every page <head>:
 * <script>
 *   if ('serviceWorker' in navigator) {
 *     navigator.serviceWorker.register('/sw.js').catch(console.error);
 *   }
 * </script>
 */

const CACHE_NAME    = 'clv-v1';
const STATIC_ASSETS = [
  '/css/brand-theme.css',
  '/js/clv-track.js',
  '/js/mobile-comparison.js',
  '/images/logo-heart-brand.jpg',
  '/images/logo-neon-vertical.jpg',
  '/images/crypto_theme.jpg',
  '/manifest.json',
];

const OFFLINE_PAGE = '/offline.html';

// ── INSTALL: cache static assets ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS.filter(url => !url.includes('undefined'))))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: clean old caches ────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: cache strategy ─────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, Netlify functions, analytics
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/.netlify/')) return;
  if (url.hostname.includes('google-analytics')) return;
  if (url.hostname.includes('googletagmanager')) return;

  // HTML pages — network first, fallback to offline page
  if (request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(OFFLINE_PAGE))
    );
    return;
  }

  // Static assets — cache first
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        // Cache valid same-origin static responses
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        // Last resort: return a placeholder for images
        if (request.destination === 'image') {
          return new Response('', { status: 200, headers: { 'Content-Type': 'image/svg+xml' } });
        }
      });
    })
  );
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
// Receives push messages when user has granted permission
// Use with a push service like OneSignal, Firebase, or web-push npm package
self.addEventListener('push', event => {
  let data = { title: 'CryptoLoveYou', body: 'New crypto update', url: '/' };

  try {
    data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/images/logo-heart-brand.jpg',
      badge: '/images/logo-heart-brand.jpg',
      data: { url: data.url },
      tag: 'clv-push',
      renotify: true,
    })
  );
});

// Open the linked page when notification is clicked
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      const existing = windowClients.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus().then(c => c.navigate(url));
      return clients.openWindow(url);
    })
  );
});
