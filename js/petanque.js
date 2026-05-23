import { createScoreGame } from './scoreGameEngine.js';

export function init(container) {
  createScoreGame(container, {
    slug: 'petanque',
    title: 'Pétanque',
    description: 'Compteur Pétanque. Par défaut : deux équipes, première à 13 points.',
    minPlayers: 2,
    maxPlayers: 8,
    defaultTarget: 13,
    scoringMode: 'higher',
    teamHint: 'Les joueurs sont répartis en alternance dans Équipe 1 / Équipe 2.',
    roundHelp: 'Entre les points marqués sur la mène.',
    getModeLabel(options) {
      return `2 équipes • score le plus haut gagnant • objectif ${options.target || 13}`;
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
        default: 13,
        min: 1,
        step: 1
      }
    ]
  });
}
