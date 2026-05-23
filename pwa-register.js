// Enregistrement PWA - La Taverne des Scores v0.6.5
(function () {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw-v065.js')
      .then(registration => {
        console.info('TDS PWA v0.6.5 active', registration.scope);
        registration.update?.();
      })
      .catch(error => console.warn('TDS PWA non enregistrée', error));
  });
})();
