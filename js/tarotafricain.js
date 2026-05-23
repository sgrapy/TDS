import { createScoreGame } from './scoreGameEngine.js';

export function init(container) {
  createScoreGame(container, {
    slug: 'tarotafricain',
    title: 'Tarot africain',
    description: 'Compteur souple pour le Tarot africain. Cette V0.6.9 permet de noter les points manche par manche, avant d’affiner les règles exactes.',
    minPlayers: 3,
    maxPlayers: 8,
    defaultTarget: 0,
    scoringMode: 'higher',
    roundHelp: 'Entre les points de chaque joueur. On pourra ajouter plus tard les contrats/plis automatiques.',
    getModeLabel(options) {
      return Number(options.target || 0) > 0
        ? `Score le plus haut gagnant • objectif ${options.target}`
        : 'Score libre • total le plus haut gagnant';
    },
    options: [
      {
        key: 'target',
        label: 'Objectif de points (0 = libre)',
        type: 'number',
        default: 0,
        min: 0,
        step: 10
      }
    ]
  });
}
