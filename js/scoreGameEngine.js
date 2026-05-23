// js/scoreGameEngine.js
// Moteur commun V0.6.6 : configuration, scores, édition des manches et sauvegarde automatique.

const APP_VERSION = '0.6.6';
const DEFAULT_AVATAR = 'avatar24.png';
const AVATAR_PATH = 'assets/avatars/';
const ICON_PATH = 'assets/icons/';

function avatarSrc(file = DEFAULT_AVATAR) {
  return `${AVATAR_PATH}${escapeHTML(file || DEFAULT_AVATAR)}`;
}

function iconMarkup(name, label = '') {
  const alt = label ? ` alt="${escapeHTML(label)}"` : ' alt=""';
  return `<img class="ui-icon" src="${ICON_PATH}icon-${escapeHTML(name)}.png"${alt}>`;
}

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readPlayers() {
  try {
    const players = JSON.parse(localStorage.getItem('players') || '[]');
    return Array.isArray(players)
      ? players
          .filter(p => p && typeof p.name === 'string')
          .map((p, index) => ({
            id: p.id || `player-${index}-${p.name}`,
            name: p.name.trim() || `Joueur ${index + 1}`,
            avatar: p.avatar || DEFAULT_AVATAR,
            isGuest: false
          }))
      : [];
  } catch (error) {
    console.warn('Impossible de lire les joueurs sauvegardés.', error);
    return [];
  }
}

function defaultOptionValues(options = []) {
  return options.reduce((acc, opt) => {
    acc[opt.key] = opt.default;
    return acc;
  }, {});
}

function getStorageKey(slug) {
  return `taverne_score_${slug}`;
}

function getDateLabel(iso) {
  if (!iso) return 'jamais';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return 'maintenant';
  }
}

function normalizeSavedState(raw, config) {
  if (!raw || raw.gameSlug !== config.slug || !Array.isArray(raw.entities) || !Array.isArray(raw.rounds)) {
    return null;
  }
  return {
    version: raw.version || APP_VERSION,
    gameSlug: config.slug,
    gameTitle: config.title,
    started: Boolean(raw.started),
    ended: Boolean(raw.ended),
    options: { ...defaultOptionValues(config.options), ...(raw.options || {}) },
    selectedPlayers: Array.isArray(raw.selectedPlayers) ? raw.selectedPlayers : [],
    entities: raw.entities,
    rounds: raw.rounds.map(r => ({
      values: Array.isArray(r.values) ? r.values.map(v => toNumber(v, 0)) : [],
      note: r.note || '',
      createdAt: r.createdAt || new Date().toISOString()
    })),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

function defaultBuildEntities(selectedPlayers, options, config) {
  const mode = options.entityMode || config.entityMode || 'individual';

  if (mode === 'teams2') {
    const teamA = selectedPlayers.filter((_, idx) => idx % 2 === 0);
    const teamB = selectedPlayers.filter((_, idx) => idx % 2 === 1);
    return [teamA, teamB].map((team, idx) => ({
      id: `team-${idx + 1}`,
      name: idx === 0 ? 'Équipe 1' : 'Équipe 2',
      subtitle: team.map(p => p.name).join(' + '),
      avatars: team.map(p => p.avatar || DEFAULT_AVATAR),
      members: team
    }));
  }

  return selectedPlayers.map((p, idx) => ({
    id: p.id || `entity-${idx}`,
    name: p.name,
    subtitle: p.isGuest ? 'Invité' : '',
    avatars: [p.avatar || DEFAULT_AVATAR],
    members: [p]
  }));
}

export function createScoreGame(container, config) {
  const storageKey = getStorageKey(config.slug);
  const allPlayers = readPlayers();
  let selectedPlayers = [];
  let optionValues = defaultOptionValues(config.options);
  let state = loadState();

  document.getElementById('gameTitle').textContent = config.title;

  if (state && state.started && !state.ended) {
    renderGame(true);
  } else {
    renderConfig(Boolean(state && state.ended));
  }

  function loadState() {
    try {
      return normalizeSavedState(JSON.parse(localStorage.getItem(storageKey) || 'null'), config);
    } catch (error) {
      console.warn('Sauvegarde illisible, démarrage à zéro.', error);
      return null;
    }
  }

  function saveState() {
    if (!state) return;
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(storageKey, JSON.stringify(state));
    updateSaveBadge();
  }

  function clearState() {
    localStorage.removeItem(storageKey);
    state = null;
  }

  function minPlayersForCurrentOptions() {
    if (typeof config.minPlayers === 'function') return config.minPlayers(optionValues);
    return config.minPlayers ?? 2;
  }

  function maxPlayersForCurrentOptions() {
    if (typeof config.maxPlayers === 'function') return config.maxPlayers(optionValues);
    return config.maxPlayers ?? 8;
  }

  function renderConfig(showEndedNotice = false) {
    optionValues = defaultOptionValues(config.options);
    selectedPlayers = [];

    container.innerHTML = `
      <div class="score-setup-overlay" role="dialog" aria-modal="true" aria-labelledby="scoreSetupTitle">
        <section class="score-setup-modal">
          <div class="score-setup-hero">
            <div class="score-setup-kicker">Préparation de la partie</div>
            <div class="score-setup-title-row">
              <div>
                <h2 id="scoreSetupTitle">${escapeHTML(config.title)}</h2>
                <p>${escapeHTML(config.description || 'Choisis les joueurs, règle les options, puis lance la partie.')}</p>
              </div>
              <span class="score-version">V${APP_VERSION}</span>
            </div>
            ${showEndedNotice ? `<div class="score-notice">Dernière partie terminée. Tu peux relancer une nouvelle partie proprement.</div>` : ''}
          </div>

          <div class="score-setup-steps" aria-label="Étapes de préparation">
            <button class="score-step-pill is-active" type="button" data-prep-step="rules">1 · Règles</button>
            <button class="score-step-pill" type="button" data-prep-step="players">2 · Joueurs</button>
          </div>

          <div class="score-setup-grid">
            <section class="score-setup-panel score-rules-panel">
              <div class="score-panel-head">
                <span class="score-panel-icon">${iconMarkup('rules')}</span>
                <div>
                  <h3>Règles de départ</h3>
                  <p>Les options propres à ce jeu sont regroupées ici.</p>
                </div>
              </div>
              <div class="score-options-grid" id="scoreOptions"></div>
            </section>

            <section class="score-setup-panel score-players-panel">
              <div class="score-panel-head">
                <span class="score-panel-icon">${iconMarkup('players')}</span>
                <div>
                  <h3>Joueurs</h3>
                  <p class="score-helper" id="playerRuleText"></p>
                </div>
              </div>
              <div class="score-selected-tray" id="selectedPlayersTray"></div>
              <div class="score-player-tiles" id="playerTiles"></div>
            </section>
          </div>

          <div class="score-setup-footer">
            <button class="round-btn score-secondary prep-back-btn" id="prepBackStep" type="button">${iconMarkup('home')} Règles</button>
            <button class="round-btn score-primary-action prep-next-btn" id="prepNextStep" type="button">${iconMarkup('players')} Choisir les joueurs</button>
            <button class="round-btn score-primary-action prep-start-btn" id="startScoreGame">${iconMarkup('start')} Lancer la partie</button>
            <button class="round-btn score-secondary prep-clear-btn" id="clearSavedGame">${iconMarkup('clear')} Effacer sauvegarde</button>
            <a class="round-btn score-secondary prep-home-btn" href="home.html">${iconMarkup('home')} Accueil</a>
          </div>
        </section>
      </div>
    `;

    renderOptions();
    renderPlayerTiles();
    updatePlayerRuleText();
    setupPrepSteps();

    container.querySelector('#startScoreGame').addEventListener('click', startGame);
    container.querySelector('#clearSavedGame').addEventListener('click', () => {
      clearState();
      showToast('Sauvegarde effacée.');
      renderConfig(false);
    });
  }


  function setupPrepSteps() {
    const modal = container.querySelector('.score-setup-modal');
    if (!modal) return;

    const stepButtons = [...modal.querySelectorAll('[data-prep-step]')];
    const backButton = modal.querySelector('#prepBackStep');
    const nextButton = modal.querySelector('#prepNextStep');
    const startButton = modal.querySelector('#startScoreGame');

    function setStep(step) {
      modal.dataset.mobileStep = step;
      stepButtons.forEach(button => button.classList.toggle('is-active', button.dataset.prepStep === step));
      if (startButton) startButton.classList.toggle('is-visible-step', step === 'players');
      if (backButton) backButton.classList.toggle('is-visible-step', step === 'players');
      if (nextButton) nextButton.classList.toggle('is-hidden-step', step === 'players');
    }

    stepButtons.forEach(button => {
      button.addEventListener('click', () => setStep(button.dataset.prepStep));
    });

    nextButton?.addEventListener('click', () => setStep('players'));
    backButton?.addEventListener('click', () => setStep('rules'));

    setStep('rules');
  }

  function renderOptions() {
    const box = container.querySelector('#scoreOptions');
    box.innerHTML = '';

    (config.options || []).forEach(opt => {
      const wrapper = document.createElement('label');
      wrapper.className = 'score-option-field';
      wrapper.innerHTML = `<span>${escapeHTML(opt.label)}</span>`;

      let input;
      if (opt.type === 'select') {
        input = document.createElement('select');
        (opt.choices || []).forEach(choice => {
          const option = document.createElement('option');
          option.value = choice.value;
          option.textContent = choice.label;
          input.appendChild(option);
        });
      } else if (opt.type === 'checkbox') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = Boolean(opt.default);
      } else {
        input = document.createElement('input');
        input.type = opt.type || 'number';
        if (opt.min !== undefined) input.min = opt.min;
        if (opt.max !== undefined) input.max = opt.max;
        if (opt.step !== undefined) input.step = opt.step;
      }

      input.id = `opt-${opt.key}`;
      input.value = opt.default ?? '';
      input.addEventListener('change', () => {
        optionValues[opt.key] = opt.type === 'checkbox' ? input.checked : input.value;
        updatePlayerRuleText();
        renderPlayerTiles();
      });
      wrapper.appendChild(input);

      if (opt.help) {
        const help = document.createElement('small');
        help.textContent = opt.help;
        wrapper.appendChild(help);
      }

      box.appendChild(wrapper);
    });
  }

  function updatePlayerRuleText() {
    const el = container.querySelector('#playerRuleText');
    if (!el) return;
    const min = minPlayersForCurrentOptions();
    const max = maxPlayersForCurrentOptions();
    const selected = selectedPlayers.length;
    let text = `Sélection : ${selected}/${max} — minimum ${min} joueur${min > 1 ? 's' : ''}.`;
    if (config.teamHint) text += ` ${typeof config.teamHint === 'function' ? config.teamHint(optionValues) : config.teamHint}`;
    el.textContent = text;
  }

  function renderPlayerTiles() {
    const tiles = container.querySelector('#playerTiles');
    if (!tiles) return;
    tiles.innerHTML = '';

    if (!allPlayers.length) {
      const empty = document.createElement('div');
      empty.className = 'score-empty-players';
      empty.innerHTML = `
        <strong>Aucun joueur enregistré</strong>
        <span>Ajoute un invité pour cette partie, ou crée tes joueurs depuis les options de l’accueil.</span>
      `;
      tiles.appendChild(empty);
    }

    allPlayers.forEach((player, index) => {
      tiles.appendChild(createPlayerTile(player, index));
    });

    selectedPlayers.filter(p => p.isGuest).forEach(player => {
      const guestTile = document.createElement('button');
      guestTile.type = 'button';
      guestTile.className = 'score-player-tile score-guest-tile selected';
      guestTile.innerHTML = `
        <img src="${avatarSrc(player.avatar)}" alt="">
        <span>${escapeHTML(player.name)}</span>
      `;
      guestTile.title = 'Cliquer pour retirer cet invité';
      guestTile.addEventListener('click', () => {
        selectedPlayers = selectedPlayers.filter(p => p.id !== player.id);
        renderPlayerTiles();
        updatePlayerRuleText();
      });
      tiles.appendChild(guestTile);
    });

    const guest = document.createElement('button');
    guest.type = 'button';
    guest.className = 'score-player-tile score-guest-tile score-add-guest-tile';
    guest.innerHTML = `
      <img src="${avatarSrc(DEFAULT_AVATAR)}" alt="">
      <span>+ Invité</span>
      <small>Partie rapide</small>
    `;
    guest.addEventListener('click', addGuestPlayer);
    tiles.appendChild(guest);
    renderSelectedTray();
  }

  function renderSelectedTray() {
    const tray = container.querySelector('#selectedPlayersTray');
    if (!tray) return;
    if (!selectedPlayers.length) {
      tray.innerHTML = '<span class="score-selection-placeholder">Aucun joueur sélectionné pour l’instant.</span>';
      return;
    }

    tray.innerHTML = selectedPlayers.map((player, index) => `
      <button class="score-selected-chip" type="button" data-player-id="${escapeHTML(player.id)}" data-local-index="${escapeHTML(player.localIndex)}" title="Retirer ${escapeHTML(player.name)}">
        <span class="score-chip-order">${index + 1}</span>
        <img src="${avatarSrc(player.avatar)}" alt="">
        <span>${escapeHTML(player.name)}</span>
        <b>×</b>
      </button>
    `).join('');

    tray.querySelectorAll('.score-selected-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const id = chip.dataset.playerId;
        const localIndex = chip.dataset.localIndex;
        selectedPlayers = selectedPlayers.filter(p => String(p.id) !== id || String(p.localIndex) !== localIndex);
        renderPlayerTiles();
        updatePlayerRuleText();
      });
    });
  }

  function createPlayerTile(player, index) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'score-player-tile';
    tile.dataset.index = String(index);
    const selectedIndex = selectedPlayers.findIndex(p => p.localIndex === index && !p.isGuest);
    if (selectedIndex >= 0) {
      tile.classList.add('selected');
      tile.setAttribute('aria-pressed', 'true');
    } else {
      tile.setAttribute('aria-pressed', 'false');
    }
    tile.innerHTML = `
      <span class="score-player-order">${selectedIndex >= 0 ? selectedIndex + 1 : ''}</span>
      <img src="${avatarSrc(player.avatar)}" alt="">
      <span>${escapeHTML(player.name)}</span>
    `;
    tile.addEventListener('click', () => togglePlayer(player, index));
    return tile;
  }

  function togglePlayer(player, index) {
    const existing = selectedPlayers.findIndex(p => p.localIndex === index && !p.isGuest);
    if (existing >= 0) {
      selectedPlayers.splice(existing, 1);
    } else {
      const max = maxPlayersForCurrentOptions();
      if (selectedPlayers.length >= max) return showToast(`Maximum ${max} joueurs.`);
      selectedPlayers.push({ ...player, localIndex: index, isGuest: false });
    }
    renderPlayerTiles();
    updatePlayerRuleText();
  }

  function addGuestPlayer() {
    const max = maxPlayersForCurrentOptions();
    if (selectedPlayers.length >= max) return showToast(`Maximum ${max} joueurs.`);
    openGuestModal(name => {
      if (!name) return;
      const uid = `guest-${Date.now()}`;
      selectedPlayers.push({
        id: uid,
        name: name.trim(),
        avatar: DEFAULT_AVATAR,
        isGuest: true,
        localIndex: uid
      });
      renderPlayerTiles();
      updatePlayerRuleText();
    });
  }

  function openGuestModal(callback) {
    const overlay = document.createElement('div');
    overlay.className = 'score-guest-overlay';
    overlay.innerHTML = `
      <div class="score-guest-modal" role="dialog" aria-modal="true">
        <h2>Ajouter un invité</h2>
        <p>Parfait pour une partie rapide sans créer de joueur enregistré.</p>
        <input id="scoreGuestName" type="text" maxlength="28" placeholder="Nom de l’invité…" autocomplete="off">
        <div class="score-actions-bar">
          <button class="round-btn" id="scoreGuestOk">Ajouter</button>
          <button class="round-btn score-secondary" id="scoreGuestCancel">Annuler</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#scoreGuestName');
    input.focus();

    function close(value) {
      overlay.remove();
      callback(value && value.trim() ? value.trim() : null);
    }

    overlay.querySelector('#scoreGuestOk').addEventListener('click', () => close(input.value));
    overlay.querySelector('#scoreGuestCancel').addEventListener('click', () => close(null));
    overlay.addEventListener('click', event => {
      if (event.target === overlay) close(null);
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') close(input.value);
      if (event.key === 'Escape') close(null);
    });
  }

  function readCurrentOptions() {
    (config.options || []).forEach(opt => {
      const input = container.querySelector(`[id="opt-${opt.key}"]`);
      if (!input) return;
      optionValues[opt.key] = opt.type === 'checkbox' ? input.checked : input.value;
    });
    return { ...optionValues };
  }

  function startGame() {
    const options = readCurrentOptions();
    const min = minPlayersForCurrentOptions();
    const max = maxPlayersForCurrentOptions();

    if (selectedPlayers.length < min) return showToast(`Il faut au moins ${min} joueur${min > 1 ? 's' : ''}.`);
    if (selectedPlayers.length > max) return showToast(`Maximum ${max} joueurs.`);

    if (config.requireEvenPlayers && selectedPlayers.length % 2 !== 0) {
      return showToast('Il faut un nombre pair de joueurs pour jouer en équipes.');
    }

    const buildEntities = config.buildEntities || defaultBuildEntities;
    const entities = buildEntities(selectedPlayers, options, config);
    if (!entities || entities.length < 1) return showToast('Configuration de partie impossible.');

    state = {
      version: APP_VERSION,
      gameSlug: config.slug,
      gameTitle: config.title,
      started: true,
      ended: false,
      options,
      selectedPlayers: selectedPlayers.map(p => ({ ...p })),
      entities,
      rounds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveState();
    renderGame(false);
  }

  function renderGame(restored = false) {
    const totals = getTotals();
    const rankings = getRankings(totals);
    const target = getTarget();

    container.innerHTML = `
      <section class="score-game-card">
        <div class="score-game-topline">
          <div>
            <h2>${escapeHTML(config.title)}</h2>
            <p>${escapeHTML(getModeLabel())}</p>
          </div>
          <div class="score-save-badge" id="saveBadge">${iconMarkup('save')} Sauvegarde auto</div>
        </div>
        ${restored ? `<div class="score-notice">Partie récupérée automatiquement.</div>` : ''}
        <div class="score-summary-grid" id="scoreSummary"></div>
        <div class="table-wrapper">
          <table id="gameTable" class="score-table">
            <thead id="scoreHead"></thead>
            <tbody id="scoreBody"></tbody>
          </table>
        </div>
        <div class="score-actions-bar round-controls">
          <button class="round-btn" id="addRoundBtn">${iconMarkup('add')} Ajouter une manche</button>
          <button class="round-btn" id="editRoundsBtn">${iconMarkup('edit')} Modifier manches</button>
          <button class="round-btn" id="finishGameBtn">${iconMarkup('finish')} Fin de partie</button>
          <button class="round-btn score-secondary" id="newGameBtn">${iconMarkup('refresh')} Nouvelle partie</button>
        </div>
      </section>
    `;

    container.querySelector('#addRoundBtn').addEventListener('click', () => openRoundModal());
    container.querySelector('#editRoundsBtn').addEventListener('click', openEditModal);
    container.querySelector('#finishGameBtn').addEventListener('click', () => openEndModal('manual'));
    container.querySelector('#newGameBtn').addEventListener('click', () => confirmNewGame());

    refreshGameView();
    updateSaveBadge();
  }

  function refreshGameView() {
    if (!state) return;
    renderSummary();
    renderScoreTable();
    updateSaveBadge();
  }

  function getTarget() {
    const value = state?.options?.target ?? config.defaultTarget ?? 0;
    return toNumber(value, 0);
  }

  function getScoringMode() {
    if (typeof config.getScoringMode === 'function') return config.getScoringMode(state.options);
    return config.scoringMode || 'higher';
  }

  function getModeLabel() {
    if (typeof config.getModeLabel === 'function') return config.getModeLabel(state.options);
    const target = getTarget();
    const mode = getScoringMode() === 'lower' ? 'score le plus bas gagnant' : 'score le plus haut gagnant';
    return `${mode}${target ? ` • objectif ${target}` : ''}`;
  }

  function getTotals() {
    const count = state.entities.length;
    const totals = new Array(count).fill(0);
    const target = getTarget();

    if (config.totalMode === 'molkkyExact50') {
      state.rounds.forEach(round => {
        round.values.forEach((value, idx) => {
          const raw = Math.max(0, toNumber(value, 0));
          const next = totals[idx] + raw;
          totals[idx] = target && next > target ? 25 : next;
        });
      });
      return totals;
    }

    state.rounds.forEach(round => {
      round.values.forEach((value, idx) => {
        totals[idx] += toNumber(value, 0);
      });
    });
    return totals;
  }

  function getRankings(totals = getTotals()) {
    const mode = getScoringMode();
    return totals
      .map((total, index) => ({ index, total, entity: state.entities[index] }))
      .sort((a, b) => mode === 'lower' ? a.total - b.total : b.total - a.total);
  }

  function renderSummary() {
    const box = container.querySelector('#scoreSummary');
    if (!box) return;
    const totals = getTotals();
    const rankings = getRankings(totals);
    const target = getTarget();
    const leader = rankings[0];
    const danger = getTargetStatus(totals);

    box.innerHTML = `
      <div class="score-summary-card">
        <span>Leader</span>
        <strong>${escapeHTML(leader?.entity?.name || '-')}</strong>
        <small>${leader?.total ?? 0} point${Math.abs(leader?.total ?? 0) > 1 ? 's' : ''}</small>
      </div>
      <div class="score-summary-card">
        <span>Manches</span>
        <strong>${state.rounds.length}</strong>
        <small>${target ? `Objectif ${target}` : 'Objectif libre'}</small>
      </div>
      <div class="score-summary-card ${danger ? 'score-alert-card' : ''}">
        <span>Statut</span>
        <strong>${danger ? escapeHTML(danger) : 'En cours'}</strong>
        <small>${config.totalMode === 'molkkyExact50' ? 'Règle exacte 50 active' : 'Sauvegarde automatique'}</small>
      </div>
    `;
  }

  function getTargetStatus(totals) {
    const target = getTarget();
    if (!target) return '';

    if (config.totalMode === 'molkkyExact50') {
      const winner = totals.findIndex(total => total === target);
      return winner >= 0 ? `${state.entities[winner].name} atteint ${target}` : '';
    }

    if (getScoringMode() === 'higher') {
      const winner = totals.findIndex(total => total >= target);
      return winner >= 0 ? `${state.entities[winner].name} atteint l’objectif` : '';
    }

    const limit = totals.findIndex(total => total >= target);
    return limit >= 0 ? `Seuil ${target} atteint` : '';
  }

  function renderScoreTable() {
    const thead = container.querySelector('#scoreHead');
    const tbody = container.querySelector('#scoreBody');
    if (!thead || !tbody) return;

    const totals = getTotals();
    const rankings = getRankings(totals);
    const rankMap = new Map(rankings.map((r, idx) => [r.index, idx + 1]));

    thead.innerHTML = `
      <tr>
        <th>Manche</th>
        ${state.entities.map(entity => `<th>${renderEntity(entity)}</th>`).join('')}
      </tr>
    `;

    const medal = rank => `<span class="score-rank-badge rank-${rank}">${rank}</span>`;
    const totalRows = `
      <tr class="ranking-row">
        <td>Rang</td>
        ${state.entities.map((_, idx) => `<td>${medal(rankMap.get(idx))}</td>`).join('')}
      </tr>
      <tr class="total-row">
        <td>Total</td>
        ${totals.map(total => `<td>${total}</td>`).join('')}
      </tr>
    `;

    const roundRows = state.rounds.map((round, rIdx) => `
      <tr class="round-row ${rIdx % 2 ? 'round-even' : 'round-odd'}">
        <td>M${rIdx + 1}</td>
        ${state.entities.map((_, idx) => `<td>${round.values[idx] ?? 0}</td>`).join('')}
      </tr>
    `).join('');

    tbody.innerHTML = totalRows + (roundRows || `<tr class="round-row"><td colspan="${state.entities.length + 1}">Aucune manche pour le moment.</td></tr>`);
  }

  function renderEntity(entity) {
    const avatars = (entity.avatars || [DEFAULT_AVATAR]).slice(0, 4);
    return `
      <div class="score-entity-head">
        <div class="score-avatar-stack">
          ${avatars.map(src => `<img src="${avatarSrc(src)}" alt="">`).join('')}
        </div>
        <strong>${escapeHTML(entity.name)}</strong>
        ${entity.subtitle ? `<small>${escapeHTML(entity.subtitle)}</small>` : ''}
      </div>
    `;
  }

  function openRoundModal(existingIndex = null) {
    const isEdit = existingIndex !== null;
    const existing = isEdit ? state.rounds[existingIndex] : null;
    const overlay = document.createElement('div');
    overlay.className = 'round-overlay';
    overlay.innerHTML = `
      <div class="round-modal score-round-modal">
        <h2>${isEdit ? 'Modifier' : 'Nouvelle'} manche</h2>
        <p class="score-helper">${escapeHTML(config.roundHelp || 'Entre les points de cette manche.')}</p>
        <div class="score-round-inputs">
          ${state.entities.map((entity, idx) => `
            <label>
              <span>${escapeHTML(entity.name)}</span>
              <input class="round-score-input" data-idx="${idx}" type="number" inputmode="numeric" value="${existing?.values?.[idx] ?? 0}">
            </label>
          `).join('')}
        </div>
        <div class="round-actions">
          <button class="round-btn score-primary-action" id="saveRoundBtn">${iconMarkup('save')} Valider</button>
          <button class="round-btn score-secondary" id="cancelRoundBtn">Annuler</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const firstInput = overlay.querySelector('input');
    if (firstInput) firstInput.select();

    overlay.querySelector('#cancelRoundBtn').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#saveRoundBtn').addEventListener('click', () => {
      const values = Array.from(overlay.querySelectorAll('.round-score-input'))
        .map(input => toNumber(input.value, 0));

      if (isEdit) {
        state.rounds[existingIndex].values = values;
      } else {
        state.rounds.push({ values, note: '', createdAt: new Date().toISOString() });
      }
      state.ended = false;
      saveState();
      overlay.remove();
      refreshGameView();
      maybeSuggestEnd();
    });
  }

  function openEditModal() {
    const overlay = document.createElement('div');
    overlay.className = 'edit-overlay';
    overlay.innerHTML = `
      <div class="edit-modal score-edit-modal">
        <h2>Modifier les manches</h2>
        ${state.rounds.length ? renderEditTable() : '<p>Aucune manche à modifier.</p>'}
        <div class="edit-actions">
          <button class="round-btn score-primary-action" id="saveEditBtn">${iconMarkup('save')} Enregistrer</button>
          <button class="round-btn score-secondary" id="cancelEditBtn">Fermer</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#cancelEditBtn').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#saveEditBtn').addEventListener('click', () => {
      const rows = Array.from(overlay.querySelectorAll('tbody tr[data-round]'));
      state.rounds = rows
        .filter(row => !row.querySelector('.delete-round-check')?.checked)
        .map(row => ({
          values: Array.from(row.querySelectorAll('.edit-input')).map(input => toNumber(input.value, 0)),
          note: '',
          createdAt: state.rounds[toNumber(row.dataset.round, 0)]?.createdAt || new Date().toISOString()
        }));
      state.ended = false;
      saveState();
      overlay.remove();
      refreshGameView();
    });
  }

  function renderEditTable() {
    return `
      <div class="edit-table-wrapper">
        <table class="edit-table">
          <thead>
            <tr>
              <th>Manche</th>
              ${state.entities.map(entity => `<th>${escapeHTML(entity.name)}</th>`).join('')}
              <th>Supprimer</th>
            </tr>
          </thead>
          <tbody>
            ${state.rounds.map((round, rIdx) => `
              <tr data-round="${rIdx}">
                <td>M${rIdx + 1}</td>
                ${state.entities.map((_, idx) => `<td><input class="edit-input" type="number" value="${round.values[idx] ?? 0}"></td>`).join('')}
                <td><input class="delete-round-check" type="checkbox"></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function maybeSuggestEnd() {
    const status = getTargetStatus(getTotals());
    if (status) openEndModal('auto', status);
  }

  function openEndModal(reason = 'manual', status = '') {
    if (!state) return;
    state.ended = true;
    saveState();

    const rankings = getRankings();
    const overlay = document.createElement('div');
    overlay.className = 'endgame-overlay';
    overlay.innerHTML = `
      <div class="endgame-modal">
        <h2>${reason === 'auto' ? 'Objectif atteint' : 'Fin de partie'}</h2>
        ${status ? `<p>${escapeHTML(status)}</p>` : ''}
        <table class="endgame-table">
          <thead><tr><th>Rang</th><th>Joueur / équipe</th><th>Total</th></tr></thead>
          <tbody>
            ${rankings.map((row, idx) => `
              <tr>
                <td><span class="score-rank-badge rank-${idx + 1}">${idx + 1}</span></td>
                <td>${escapeHTML(row.entity.name)}</td>
                <td>${row.total}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="endgame-actions">
          <button class="round-btn score-secondary" id="continueGameBtn">Continuer</button>
          <button class="round-btn score-primary-action" id="restartGameBtn">Nouvelle partie</button>
          <button class="round-btn score-secondary" id="homeGameBtn">Accueil</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    if (typeof confetti === 'function') {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    overlay.querySelector('#continueGameBtn').addEventListener('click', () => {
      state.ended = false;
      saveState();
      overlay.remove();
      refreshGameView();
    });
    overlay.querySelector('#restartGameBtn').addEventListener('click', () => {
      clearState();
      overlay.remove();
      renderConfig(false);
    });
    overlay.querySelector('#homeGameBtn').addEventListener('click', () => {
      window.location.href = 'home.html';
    });
  }

  function confirmNewGame() {
    const restart = () => {
      clearState();
      renderConfig(false);
    };

    if (typeof window.showConfirm === 'function') {
      window.showConfirm(
        'Commencer une nouvelle partie ? La sauvegarde actuelle sera effacée.',
        restart,
        null,
        {
          title: 'Nouvelle partie',
          yesLabel: 'Nouvelle partie',
          yesIcon: 'refresh',
          yesClass: 'yes-btn score-primary-action',
          noLabel: 'Annuler',
          noIcon: 'close',
          noClass: 'no-btn score-secondary-action'
        }
      );
      return;
    }

    if (window.confirm('Commencer une nouvelle partie ? La sauvegarde actuelle sera effacée.')) restart();
  }

  function updateSaveBadge() {
    const badge = document.getElementById('saveBadge');
    if (!badge || !state) return;
    badge.innerHTML = `${iconMarkup('save')} Sauvegardé • ${getDateLabel(state.updatedAt)}`;
  }

  function showToast(message) {
    const old = document.querySelector('.score-toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.className = 'score-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2400);
  }
}
