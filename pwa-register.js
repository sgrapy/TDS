// Enregistrement PWA - La Taverne des Scores v0.6.8
(function () {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw-v068.js')
      .then(registration => {
        console.info('TDS PWA v0.6.8 active', registration.scope);
        registration.update?.();
      })
      .catch(error => console.warn('TDS PWA non enregistrée', error));
  });
})();
