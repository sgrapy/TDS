// Enregistrement PWA - La Taverne des Scores v0.6.4
(function () {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw-v064.js')
      .then(registration => {
        console.info('TDS PWA v0.6.4 active', registration.scope);
        registration.update?.();
      })
      .catch(error => console.warn('TDS PWA non enregistrée', error));
  });
})();
