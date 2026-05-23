// pwa-register-062.js — V0.6.4
// Nom unique pour éviter les anciens caches JS corrompus.
(function registerTavernePwa062() {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  const SW_URL = './sw-v063.js';
  let alreadyReloaded = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (alreadyReloaded) return;
    alreadyReloaded = true;
    window.location.reload();
  });

  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
        if (url && !url.endsWith('/sw-v063.js')) {
          await reg.unregister();
        }
      }

      const registration = await navigator.serviceWorker.register(SW_URL, { updateViaCache: 'none' });
      await registration.update();

      if (registration.waiting) registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (error) {
      console.warn('Service worker non enregistré :', error);
    }
  });
})();
