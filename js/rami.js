import { createScoreGame } from './scoreGameEngine.js';

export function init(container) {
  createScoreGame(container, {
    slug: 'rami',
    title: 'Rami',
    description: 'Compteur de Rami. Par défaut, le plus petit total gagne et le seuil sert de limite de fin de partie.',
    minPlayers: 2,
    maxPlayers: 6,
    defaultTarget: 500,
    scoringMode: 'lower',
    roundHelp: 'Entre les points de pénalité de chaque joueur sur la manche.',
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
