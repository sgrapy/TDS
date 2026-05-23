import { createScoreGame } from './scoreGameEngine.js';

export function init(container) {
  createScoreGame(container, {
    slug: 'skyjo',
    title: 'Skyjo',
    description: 'Compteur Skyjo harmonisé. Choisis les joueurs, le score limite et la variante avant de démarrer.',
    minPlayers: 2,
    maxPlayers: 8,
    defaultTarget: 100,
    getScoringMode(options) {
      return options.inverseVariant ? 'higher' : 'lower';
    },
    roundHelp: 'Entre le score marqué par chaque joueur sur la manche.',
    getModeLabel(options) {
      const target = Number(options.target || 100);
      return options.inverseVariant
        ? `Variante inversée • premier à ${target} gagne`
        : `Skyjo classique • le plus petit score gagne • limite ${target}`;
    },
    options: [
      {
        key: 'target',
        label: 'Score limite',
        type: 'number',
        default: 100,
        min: 1,
        step: 5,
        help: 'En classique, le seuil sert surtout d’alerte de fin. En inversé, il devient l’objectif à atteindre.'
      },
      {
        key: 'inverseVariant',
        label: 'Variante inversée',
        type: 'checkbox',
        default: false,
        help: 'Active le mode où le premier joueur à atteindre le score limite gagne.'
      }
    ]
  });
}
