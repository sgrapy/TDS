const CACHE_NAME = 'taverne-des-scores-v0-6-9';
const CORE_ASSETS = [
  './',
  './index.html',
  './home.html',
  './jeu.html',
  './style.css?v=0.6.9',
  './orientationGuard.js?v=0.6.9',
  './appUi.js?v=0.6.9',
  './managePlayers.js?v=0.6.9',
  './saveManager.js?v=0.6.9',
  './pwa-register.js?v=0.6.9',
  './site.webmanifest?v=0.6.9',
  './js/gameLoader.js?v=0.6.9',
  './js/scoreGameEngine.js?v=0.6.9'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => Promise.allSettled(CORE_ASSETS.map(url => cache.add(url))))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys
      .filter(key => key.startsWith('taverne-des-scores-') && key !== CACHE_NAME)
      .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const accept = request.headers.get('accept') || '';

  if (request.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request).then(cached => cached || caches.match('./home.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    }))
  );
});
