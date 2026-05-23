// sw-v063.js — V0.6.6
// Service worker assaini : pas de fallback HTML pour les JS/CSS/images.
const CACHE_NAME = 'taverne-des-scores-v0-6-6-safe';
const APP_SHELL = [
  './', './index.html', './home.html', './jeu.html', './loading.html',
  './style.css?v=0.6.6',
  './appUi-062.js?v=0.6.6', './managePlayers-062.js?v=0.6.6', './saveManager-062.js?v=0.6.6',
  './pwa-register-062.js?v=0.6.6', './site.webmanifest?v=0.6.6',
  './js/gameLoader.js?v=0.6.6', './js/scoreGameEngine.js?v=0.6.6',
  './js/skyjo.js?v=0.6.6', './js/simonette.js?v=0.6.6', './js/belote-coinche.js?v=0.6.6',
  './js/tarot.js?v=0.6.6', './js/rami.js?v=0.6.6', './js/tarotafricain.js?v=0.6.6',
  './js/papayoo.js?v=0.6.6', './js/uno.js?v=0.6.6', './js/paletbreton.js?v=0.6.6',
  './js/molkky.js?v=0.6.6', './js/petanque.js?v=0.6.6',
  './assets/pwa/taverne-icon-192.png', './assets/pwa/taverne-icon-512.png',
  './assets/pwa/taverne-maskable-192.png', './assets/pwa/taverne-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('taverne-des-scores-') && key !== CACHE_NAME).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok && response.type !== 'opaque') await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate' || request.destination === 'document') return cache.match('./home.html');
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: false });
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok && new URL(request.url).origin === self.location.origin) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const req = event.request;
  if (req.mode === 'navigate' || req.destination === 'document' || req.destination === 'manifest') {
    event.respondWith(networkFirst(req));
    return;
  }
  event.respondWith(cacheFirst(req));
});
