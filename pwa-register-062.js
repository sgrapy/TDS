// Enregistrement PWA - La Taverne des Scores v0.6.9
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw-v063.js')
      .then(function (registration) {
        console.info('TDS PWA v0.6.9 active', registration.scope);
      })
      .catch(function (error) {
        console.warn('TDS PWA : enregistrement impossible', error);
      });
  });
})();
