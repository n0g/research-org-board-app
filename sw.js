const CACHE = 'rb-v31';
const ASSETS = ['./', './index.html', './app.js', './manifest.json',
  './icons/icon-32.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png',
  './fonts/ibm-plex-mono-300.woff2', './fonts/ibm-plex-mono-300-italic.woff2',
  './fonts/ibm-plex-mono-400.woff2', './fonts/ibm-plex-mono-500.woff2',
  './fonts/playfair-display.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first for app shell, network-first for API calls
self.addEventListener('fetch', e => {
  if (e.request.url.includes('todoist.com')) {
    // Always go to network for API; fall through on failure
    e.respondWith(fetch(e.request).catch(() => new Response('{}', { headers: {'Content-Type':'application/json'} })));
    return;
  }
  // App shell: cache-first, fall back to network
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
