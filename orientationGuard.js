// orientationGuard.js — V0.6.9
// Aide mobile non bloquante : on conseille le paysage, mais on laisse une sortie
// si la rotation automatique du téléphone ou le navigateur bloque l'orientation.
(function () {
  const VERSION = '0.6.9';
  const SESSION_BYPASS_KEY = 'tds.orientation.bypass';
  const MAX_MOBILE_WIDTH = 900;

  function isMobilePortrait() {
    return window.matchMedia(`(max-width: ${MAX_MOBILE_WIDTH}px)`).matches &&
      window.matchMedia('(orientation: portrait)').matches;
  }

  function getOverlay() {
    let overlay = document.querySelector('.orientation-guard');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.className = 'orientation-guard';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Conseil orientation paysage');
    overlay.innerHTML = `
      <div class="orientation-guard-card">
        <div class="orientation-guard-icon" aria-hidden="true">↻</div>
        <h2 class="orientation-guard-title">Passe ton téléphone en paysage</h2>
        <p class="orientation-guard-text">
          Les tableaux de scores sont beaucoup plus lisibles en mode paysage.
          Si l’écran ne tourne pas, vérifie que la rotation automatique du téléphone est activée.
        </p>
        <div class="orientation-guard-actions">
          <button type="button" class="btn btn-primary" data-orientation-check>
            J’ai tourné le téléphone
          </button>
          <button type="button" class="btn btn-secondary" data-orientation-bypass>
            Continuer quand même
          </button>
        </div>
        <small class="orientation-guard-hint">
          La PWA demande bien le paysage, mais Android/iOS peuvent l’ignorer si la rotation système est verrouillée.
        </small>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('[data-orientation-check]')?.addEventListener('click', () => {
      setTimeout(updateOrientationGuard, 80);
    });

    overlay.querySelector('[data-orientation-bypass]')?.addEventListener('click', () => {
      sessionStorage.setItem(SESSION_BYPASS_KEY, '1');
      hideGuard();
    });

    return overlay;
  }

  function showGuard() {
    const overlay = getOverlay();
    overlay.classList.add('is-visible');
    document.body.classList.add('orientation-guard-active');
  }

  function hideGuard() {
    const overlay = document.querySelector('.orientation-guard');
    overlay?.classList.remove('is-visible');
    document.body.classList.remove('orientation-guard-active');
  }

  function updateOrientationGuard() {
    if (!document.body) return;

    const bypassed = sessionStorage.getItem(SESSION_BYPASS_KEY) === '1';
    if (isMobilePortrait() && !bypassed) {
      showGuard();
    } else {
      hideGuard();
    }
  }

  window.TDS_ORIENTATION_GUARD_VERSION = VERSION;
  window.addEventListener('resize', updateOrientationGuard);
  window.addEventListener('orientationchange', () => setTimeout(updateOrientationGuard, 220));
  document.addEventListener('visibilitychange', updateOrientationGuard);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateOrientationGuard);
  } else {
    updateOrientationGuard();
  }
})();
