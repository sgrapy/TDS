import { createScoreGame } from './scoreGameEngine.js';

export function init(container) {
  createScoreGame(container, {
    slug: 'molkky',
    title: 'Mölkky',
    description: 'Compteur Mölkky avec règle du 50 exact : si un joueur dépasse 50, il revient automatiquement à 25.',
    minPlayers: 2,
    maxPlayers: 12,
    defaultTarget: 50,
    scoringMode: 'higher',
    totalMode: 'molkkyExact50',
    roundHelp: 'Entre les points bruts de chaque lancer. Le retour à 25 en cas de dépassement est calculé automatiquement.',
    getModeLabel() {
      return 'Objectif exact 50 • dépassement = retour à 25';
    },
    options: [
      {
        key: 'target',
        label: 'Objectif exact',
        type: 'number',
        default: 50,
        min: 10,
        step: 1,
        help: 'Classique : 50.'
      }
    ]
  });
}
