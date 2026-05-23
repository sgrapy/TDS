import { createScoreGame } from './scoreGameEngine.js';

export function init(container) {
  createScoreGame(container, {
    slug: 'simonette',
    title: 'Simonette',
    description: 'Compteur Simonette harmonisé. Pour cette V0.6.7, les points sont saisis manche par manche ; on pourra remettre les contrats automatiques ensuite si tu veux.',
    minPlayers: 2,
    maxPlayers: 6,
    defaultTarget: 0,
    scoringMode: 'higher',
    roundHelp: 'Entre les points de chaque joueur pour cette manche. Exemple courant : +10 sans contrat, +14 / +18 avec réussites, valeurs négatives si échec.',
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
        step: 10,
        help: 'Laisse 0 pour une partie sans objectif fixe.'
      }
    ]
  });
}
