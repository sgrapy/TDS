import { createScoreGame } from './scoreGameEngine.js';

export function init(container) {
  createScoreGame(container, {
    slug: 'papayoo',
    title: 'Papayoo',
    description: 'Compteur Papayoo. Les points sont des pénalités : le plus petit total gagne.',
    minPlayers: 3,
    maxPlayers: 8,
    defaultTarget: 500,
    scoringMode: 'lower',
    roundHelp: 'Entre les points de pénalité reçus par chaque joueur.',
    getModeLabel(options) {
      return `Pénalités • score le plus bas gagnant • seuil ${options.target || 500}`;
    },
    options: [
      {
        key: 'target',
        label: 'Seuil de fin',
        type: 'number',
        default: 500,
        min: 50,
        step: 10
      }
    ]
  });
}
