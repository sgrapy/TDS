// sw-v060.js — V0.6.4
// Nouveau nom de service worker pour sortir des anciens caches corrompus.
const CACHE_NAME = 'taverne-des-scores-v0-6-4-tarot';
const APP_SHELL = [
  './',
  './index.html',
  './home.html',
  './jeu.html',
  './loading.html',
  './style.css?v=0.6.4',
  './appUi.js?v=0.6.4',
  './managePlayers.js?v=0.6.4',
  './saveManager.js?v=0.6.4',
  './pwa-register.js?v=0.6.4',
  './site.webmanifest',
  './js/gameLoader.js?v=0.6.4',
  './js/scoreGameEngine.js',
  './js/skyjo.js',
  './js/simonette.js',
  './js/belote-coinche.js',
  './js/tarot.js',
  './js/rami.js',
  './js/tarotafricain.js',
  './js/papayoo.js',
  './js/uno.js',
  './js/paletbreton.js',
  './js/molkky.js',
  './js/petanque.js',
  './assets/pwa/taverne-icon-192.png',
  './assets/pwa/taverne-icon-512.png',
  './assets/pwa/taverne-maskable-192.png',
  './assets/pwa/taverne-maskable-512.png',
  './assets/pwa/taverne-icon.png',
  './assets/games/belote.png',
  './assets/games/creation.png',
  './assets/games/molkky.png',
  './assets/games/paletbreton.png',
  './assets/games/papayoo.png',
  './assets/games/petanque.png',
  './assets/games/rami.png',
  './assets/games/simonette.png',
  './assets/games/skyjo.png',
  './assets/games/tarot.png',
  './assets/games/tarotafricain.png',
  './assets/games/uno.png',
  './assets/icons/icon-about.png',
  './assets/icons/icon-add.png',
  './assets/icons/icon-close.png',
  './assets/icons/icon-home.png',
  './assets/icons/icon-players.png',
  './assets/icons/icon-version.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('taverne-des-scores-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok && response.type !== 'opaque') {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    return cached || cache.match('./home.html');
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
  const request = event.request;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Aucun fallback HTML pour les scripts/manifest/images : si un asset manque, on laisse l'erreur visible.
  event.respondWith(cacheFirst(request));
});
