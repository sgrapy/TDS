import { createScoreGame } from './scoreGameEngine.js';

export function init(container) {
  createScoreGame(container, {
    slug: 'paletbreton',
    title: 'Palet breton',
    description: 'Compteur Palet breton. Joue en solo ou en deux équipes, avec objectif personnalisable.',
    minPlayers(options) {
      return options.entityMode === 'teams2' ? 2 : 2;
    },
    maxPlayers(options) {
      return options.entityMode === 'teams2' ? 8 : 8;
    },
    defaultTarget: 12,
    scoringMode: 'higher',
    requireEvenPlayers: false,
    teamHint(options) {
      return options.entityMode === 'teams2' ? 'En équipe, les joueurs sont répartis en alternance dans Équipe 1 / Équipe 2.' : '';
    },
    roundHelp: 'Entre les points marqués sur la mène.',
    getModeLabel(options) {
      const mode = options.entityMode === 'teams2' ? '2 équipes' : 'solo';
      return `${mode} • score le plus haut gagnant • objectif ${options.target || 12}`;
    },
    options: [
      {
        key: 'entityMode',
        label: 'Mode',
        type: 'select',
        default: 'teams2',
        choices: [
          { value: 'teams2', label: '2 équipes' },
          { value: 'individual', label: 'Chacun pour soi' }
        ]
      },
      {
        key: 'target',
        label: 'Score à atteindre',
        type: 'number',
        default: 12,
        min: 1,
        step: 1
      }
    ]
  });
}
