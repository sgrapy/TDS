// appUi.js — V0.6.6
// Modales générales. Le système de thèmes/personnalisation a été retiré.
(function () {
  'use strict';

  const ICON_PATH = 'assets/icons/';

  function makeIcon(name) {
    const img = document.createElement('img');
    img.className = 'ui-icon';
    img.src = ICON_PATH + 'icon-' + name + '.png';
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    return img;
  }

  function makeButton(label, iconName, className) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className || 'round-btn';
    if (iconName) btn.appendChild(makeIcon(iconName));
    btn.appendChild(document.createTextNode(label));
    return btn;
  }

  function closeOnOverlayClick(overlay) {
    overlay.addEventListener('click', event => {
      if (event.target === overlay) overlay.remove();
    });
  }

  window.showConfirm = function showConfirm(message, onYes, onNo, options) {
    const opts = options || {};
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    closeOnOverlayClick(overlay);

    const box = document.createElement('div');
    box.className = 'confirm-box';

    const title = document.createElement('h2');
    title.textContent = opts.title || 'Confirmation';

    const p = document.createElement('p');
    p.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'modal-actions-row';

    const yes = makeButton(opts.yesLabel || 'Supprimer', opts.yesIcon || 'trash', opts.yesClass || 'yes-btn score-danger-action');
    const no = makeButton(opts.noLabel || 'Annuler', opts.noIcon || 'close', opts.noClass || 'no-btn score-secondary-action');

    yes.addEventListener('click', () => {
      if (typeof onYes === 'function') onYes();
      overlay.remove();
    });
    no.addEventListener('click', () => {
      if (typeof onNo === 'function') onNo();
      overlay.remove();
    });

    actions.append(yes, no);
    box.append(title, p, actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  };

  window.showError = function showError(msg) {
    const err = document.createElement('div');
    err.className = 'error-modal';
    err.textContent = msg;
    document.body.appendChild(err);
    setTimeout(() => err.remove(), 2600);
  };

  window.openAboutModal = function openAboutModal() {
    const overlay = document.createElement('div');
    overlay.className = 'options-overlay';
    closeOnOverlayClick(overlay);

    const about = document.createElement('div');
    about.className = 'about-modal';

    const content = document.createElement('div');
    content.className = 'modal-content';

    const kicker = document.createElement('p');
    kicker.className = 'modal-kicker';
    kicker.textContent = 'La Taverne des Scores';

    const title = document.createElement('h2');
    title.textContent = 'À propos';

    const lines = [
      ['Version 0.6.6', 'affinage Belote/Coinche : contrats, annonces, coinche/surcoinche, capot et calcul automatique des donnes.'],
      ['Versionnage', '1.x.x = version en ligne, x.1.x = évolution majeure, x.x.1 = correction mineure.'],
      ['Développé par', 'Parkaf.'],
      ['Sauvegarde', 'locale automatique dans le navigateur pour les parties en cours.'],
      ['Jeux branchés', 'Skyjo, Simonette, Belote/Coinche, Tarot, Rami, Tarot africain, Papayoo, Uno, Palet breton, Mölkky et Pétanque.'],
      ['Personnalisation', 'retirée pour repartir sur une base claire. Un vrai mode nuit pourra être ajouté plus tard.']
    ];

    content.append(kicker, title);
    lines.forEach(([label, text]) => {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = label + ' : ';
      p.append(strong, document.createTextNode(text));
      content.appendChild(p);
    });

    const actions = document.createElement('div');
    actions.className = 'modal-actions-row';
    const close = makeButton('Fermer', 'close', 'round-btn score-primary-action');
    close.addEventListener('click', () => overlay.remove());
    actions.appendChild(close);
    content.appendChild(actions);

    about.appendChild(content);
    overlay.appendChild(about);
    document.body.appendChild(overlay);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const aboutButton = document.getElementById('aboutFooterButton');
    if (aboutButton) aboutButton.addEventListener('click', window.openAboutModal);
  });
})();
