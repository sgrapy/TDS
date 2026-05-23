import { createScoreGame } from './scoreGameEngine.js';

export function init(container) {
  createScoreGame(container, {
    slug: 'uno',
    title: 'Uno',
    description: 'Compteur Uno avec deux façons de jouer : score officiel du gagnant ou points de pénalité.',
    minPlayers: 2,
    maxPlayers: 10,
    defaultTarget: 500,
    getScoringMode(options) {
      return options.scoreMode === 'penalty' ? 'lower' : 'higher';
    },
    roundHelp: 'Entre les points de la manche selon le mode choisi au départ.',
    getModeLabel(options) {
      const mode = options.scoreMode === 'penalty'
        ? 'Pénalités • score le plus bas gagnant'
        : 'Mode officiel • score le plus haut gagnant';
      return `${mode} • objectif ${options.target || 500}`;
    },
    options: [
      {
        key: 'scoreMode',
        label: 'Mode de score',
        type: 'select',
        default: 'winner',
        choices: [
          { value: 'winner', label: 'Officiel : points au gagnant de la manche' },
          { value: 'penalty', label: 'Familial : points de pénalité aux autres' }
        ]
      },
      {
        key: 'target',
        label: 'Objectif / seuil',
        type: 'number',
        default: 500,
        min: 50,
        step: 10
      }
    ]
  });
}
