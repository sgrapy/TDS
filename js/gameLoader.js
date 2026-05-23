// js/gameLoader.js
// Charge le module correspondant à la carte choisie sur l'accueil.

const APP_VERSION = '0.6.6';

const GAME_ROUTES = {
  'skyjo': { title: 'Skyjo', module: './skyjo.js' },
  'simonette': { title: 'Simonette', module: './simonette.js' },
  'belote-coinche': { title: 'Belote / Coinche', module: './belote-coinche.js' },
  'tarot': { title: 'Tarot', module: './tarot.js' },
  'rami': { title: 'Rami', module: './rami.js' },
  'tarotafricain': { title: 'Tarot africain', module: './tarotafricain.js' },
  'papayoo': { title: 'Papayoo', module: './papayoo.js' },
  'uno': { title: 'Uno', module: './uno.js' },
  'palet breton': { title: 'Palet breton', module: './paletbreton.js' },
  'paletbreton': { title: 'Palet breton', module: './paletbreton.js' },
  'molkky': { title: 'Mölkky', module: './molkky.js' },
  'petanque': { title: 'Pétanque', module: './petanque.js' }
};

function getGameType() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('game')) return params.get('game');
  return localStorage.getItem('currentGame') || 'skyjo';
}

function renderUnavailable(container, gameType) {
  const safeName = String(gameType || 'ce jeu')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  container.innerHTML = `
    <section class="score-config-card">
      <h2>Jeu bientôt disponible</h2>
      <p>Le jeu <strong>${safeName}</strong> n’est pas encore branché dans cette version.</p>
      <p>La V0.6.6 affine maintenant Belote/Coinche et Tarot. La création personnalisée sera ajoutée plus tard.</p>
      <div class="score-actions-bar">
        <a class="round-btn" href="home.html"><img class="ui-icon" src="assets/icons/icon-home.png" alt=""> Retour accueil</a>
      </div>
    </section>
  `;
}

const gameType = getGameType();
const normalizedGameType = String(gameType || '').trim();
const route = GAME_ROUTES[normalizedGameType];
const container = document.getElementById('gameContainer');
const title = document.getElementById('gameTitle');

if (!route) {
  title.textContent = 'Jeu indisponible';
  renderUnavailable(container, gameType);
} else {
  localStorage.setItem('currentGame', normalizedGameType);
  title.textContent = route.title;

  import(`${route.module}?v=${APP_VERSION}`)
    .then(module => {
      if (typeof module.init !== 'function') throw new Error('Module sans fonction init(container).');
      module.init(container);
    })
    .catch(err => {
      console.error(`Impossible de charger le jeu "${gameType}"`, err);
      renderUnavailable(container, route.title);
    });
}
