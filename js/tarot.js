// js/tarot.js
// V0.6.9 — Tarot avancé : contrats, bouts, petit au bout, poignées, chelem, 3/4/5 joueurs et sauvegarde automatique.

const APP_VERSION = '0.6.9';
const SLUG = 'tarot';
const STORAGE_KEY = `taverne_score_${SLUG}`;
const DEFAULT_AVATAR = 'avatar24.png';
const AVATAR_PATH = 'assets/avatars/';
const ICON_PATH = 'assets/icons/';

const CONTRACTS = [
  { value: 'petite', label: 'Petite', coefficient: 1 },
  { value: 'garde', label: 'Garde', coefficient: 2 },
  { value: 'garde-sans', label: 'Garde sans le chien', coefficient: 4 },
  { value: 'garde-contre', label: 'Garde contre le chien', coefficient: 6 }
];

const OUDLER_TARGETS = { 0: 56, 1: 51, 2: 41, 3: 36 };
const POIGNEE_VALUES = { none: 0, simple: 20, double: 30, triple: 40 };

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toNumber(value, fallback = 0) {
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function avatarSrc(file = DEFAULT_AVATAR) {
  return `${AVATAR_PATH}${escapeHTML(file || DEFAULT_AVATAR)}`;
}

function iconMarkup(name, label = '') {
  const alt = label ? ` alt="${escapeHTML(label)}"` : ' alt=""';
  return `<img class="ui-icon" src="${ICON_PATH}icon-${escapeHTML(name)}.png"${alt}>`;
}

function readPlayers() {
  try {
    const players = JSON.parse(localStorage.getItem('players') || '[]');
    return Array.isArray(players)
      ? players.filter(p => p && typeof p.name === 'string').map((p, index) => ({
          id: p.id || `player-${index}-${p.name}`,
          name: p.name.trim() || `Joueur ${index + 1}`,
          avatar: p.avatar || DEFAULT_AVATAR,
          isGuest: false,
          localIndex: index
        }))
      : [];
  } catch (error) {
    console.warn('Impossible de lire les joueurs sauvegardés.', error);
    return [];
  }
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

function defaultOptions() {
  return {
    playerCount: 4,
    target: 0,
    fivePlayersPartner: true,
    allowHalfPoints: true,
    petitAuBout: true,
    poignee: true,
    chelem: true,
    defensePoignee: true,
    misereVariant: false,
    misereValue: 10
  };
}

function emptyState() {
  return {
    version: APP_VERSION,
    gameSlug: SLUG,
    started: false,
    ended: false,
    options: defaultOptions(),
    players: [],
    rounds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function normalizeState(raw) {
  if (!raw || raw.gameSlug !== SLUG || !Array.isArray(raw.players) || !Array.isArray(raw.rounds)) return null;
  return {
    version: raw.version || APP_VERSION,
    gameSlug: SLUG,
    started: Boolean(raw.started),
    ended: Boolean(raw.ended),
    options: { ...defaultOptions(), ...(raw.options || {}) },
    players: raw.players,
    rounds: raw.rounds.map((r, i) => normalizeRound(r, i)),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

function normalizeRound(round, index = 0) {
  return {
    number: round.number || index + 1,
    takerIndex: String(round.takerIndex ?? '0'),
    partnerIndex: String(round.partnerIndex ?? 'none'),
    contract: round.contract || 'garde',
    oudlerCount: clamp(toNumber(round.oudlerCount, 1), 0, 3),
    takerPoints: toNumber(round.takerPoints, 51),
    petitAuBoutSide: round.petitAuBoutSide || 'none',
    takerPoignee: round.takerPoignee || 'none',
    defensePoignee: round.defensePoignee || 'none',
    chelem: round.chelem || 'none',
    misereCount: clamp(toNumber(round.misereCount, 0), 0, 5),
    manual: Boolean(round.manual),
    manualValues: Array.isArray(round.manualValues) ? round.manualValues.map(v => toNumber(v, 0)) : [],
    values: Array.isArray(round.values) ? round.values.map(v => toNumber(v, 0)) : [],
    success: Boolean(round.success),
    baseScore: toNumber(round.baseScore, 0),
    attackScore: toNumber(round.attackScore, 0),
    targetPoints: toNumber(round.targetPoints, 51),
    difference: toNumber(round.difference, 0),
    detail: round.detail || '',
    createdAt: round.createdAt || new Date().toISOString()
  };
}

export function init(container) {
  const allPlayers = readPlayers();
  let selectedPlayers = [];
  let options = defaultOptions();
  let state = loadState() || emptyState();

  document.getElementById('gameTitle').textContent = 'Tarot';

  if (state.started && !state.ended) renderGame(true);
  else renderSetup(Boolean(state.ended));

  function loadState() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
    } catch (error) {
      console.warn('Sauvegarde Tarot illisible.', error);
      return null;
    }
  }

  function saveState() {
    state.updatedAt = new Date().toISOString();
    state.version = APP_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateSaveBadge();
  }

  function clearState() {
    localStorage.removeItem(STORAGE_KEY);
    state = emptyState();
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'score-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2400);
  }

  function renderSetup(showEndedNotice = false) {
    selectedPlayers = [];
    options = { ...defaultOptions(), ...(state?.options || {}) };

    container.innerHTML = `
      <div class="score-setup-overlay tarot-setup-overlay" role="dialog" aria-modal="true" aria-labelledby="tarotSetupTitle">
        <section class="score-setup-modal tarot-setup-modal">
          <div class="score-setup-hero">
            <div class="score-setup-kicker">Préparation de la partie</div>
            <div class="score-setup-title-row">
              <div>
                <h2 id="tarotSetupTitle">Tarot</h2>
                <p>Score complet avec contrats, bouts, petit au bout, poignées, chelem et partie à 3, 4 ou 5 joueurs.</p>
              </div>
              <span class="score-version">V${APP_VERSION}</span>
            </div>
            ${showEndedNotice ? `<div class="score-notice tarot-readable-notice">Dernière partie terminée. Tu peux relancer une nouvelle partie proprement.</div>` : ''}
          </div>

          <div class="score-setup-grid tarot-setup-grid">
            <section class="score-setup-panel score-rules-panel tarot-rules-panel">
              <div class="score-panel-head">
                <span class="score-panel-icon">${iconMarkup('rules')}</span>
                <div>
                  <h3>Règles de départ</h3>
                  <p>Choisis le format de table et les variantes actives.</p>
                </div>
              </div>
              <div class="score-options-grid tarot-options-grid">
                ${selectField('playerCount', 'Nombre de joueurs', options.playerCount, [[3, '3 joueurs'], [4, '4 joueurs'], [5, '5 joueurs']])}
                ${numberField('target', 'Objectif de points (0 = libre)', options.target, 0, 5000, 10)}
                ${checkboxField('fivePlayersPartner', 'À 5 joueurs : appel au roi / partenaire possible', options.fivePlayersPartner)}
                ${checkboxField('allowHalfPoints', 'Autoriser les demi-points', options.allowHalfPoints)}
                ${checkboxField('petitAuBout', 'Petit au bout ±10', options.petitAuBout)}
                ${checkboxField('poignee', 'Poignées : simple/double/triple', options.poignee)}
                ${checkboxField('defensePoignee', 'Poignée possible côté défense', options.defensePoignee)}
                ${checkboxField('chelem', 'Chelem annoncé / non annoncé', options.chelem)}
                ${checkboxField('misereVariant', 'Variante : misère', options.misereVariant)}
                ${numberField('misereValue', 'Valeur d’une misère', options.misereValue, 0, 100, 5)}
              </div>
            </section>

            <section class="score-setup-panel score-players-panel tarot-players-panel">
              <div class="score-panel-head">
                <span class="score-panel-icon">${iconMarkup('players')}</span>
                <div>
                  <h3>Joueurs</h3>
                  <p class="score-helper" id="tarotPlayerHelp"></p>
                </div>
              </div>
              <div class="score-selected-tray" id="selectedPlayersTray"></div>
              <div class="score-player-tiles" id="playerTiles"></div>
            </section>
          </div>

          <div class="score-setup-footer">
            <button class="round-btn score-primary-action" id="startTarotGame">${iconMarkup('start')} Lancer la partie</button>
            <button class="round-btn score-secondary" id="clearTarotSave">${iconMarkup('clear')} Effacer sauvegarde</button>
            <a class="round-btn score-secondary" href="home.html">${iconMarkup('home')} Accueil</a>
          </div>
        </section>
      </div>
    `;

    bindSetupOptions();
    renderPlayerTiles();

    container.querySelector('#startTarotGame').addEventListener('click', startGame);
    container.querySelector('#clearTarotSave').addEventListener('click', () => {
      clearState();
      showToast('Sauvegarde Tarot effacée.');
      renderSetup(false);
    });
  }

  function selectField(key, label, value, choices) {
    return `
      <label class="score-option-field">
        <span>${escapeHTML(label)}</span>
        <select id="opt-${key}">
          ${choices.map(([v, l]) => `<option value="${escapeHTML(v)}" ${String(v) === String(value) ? 'selected' : ''}>${escapeHTML(l)}</option>`).join('')}
        </select>
      </label>
    `;
  }

  function numberField(key, label, value, min, max, step) {
    return `
      <label class="score-option-field">
        <span>${escapeHTML(label)}</span>
        <input id="opt-${key}" type="number" min="${min}" max="${max}" step="${step}" value="${escapeHTML(value)}">
      </label>
    `;
  }

  function checkboxField(key, label, checked) {
    return `
      <label class="score-option-check">
        <input id="opt-${key}" type="checkbox" ${checked ? 'checked' : ''}>
        <span>${escapeHTML(label)}</span>
      </label>
    `;
  }

  function bindSetupOptions() {
    container.querySelectorAll('[id^="opt-"]').forEach(input => {
      input.addEventListener('change', () => {
        readSetupOptions();
        selectedPlayers = selectedPlayers.slice(0, options.playerCount);
        renderPlayerTiles();
      });
    });
  }

  function readSetupOptions() {
    options = {
      playerCount: clamp(toNumber(container.querySelector('#opt-playerCount')?.value, 4), 3, 5),
      target: toNumber(container.querySelector('#opt-target')?.value, 0),
      fivePlayersPartner: Boolean(container.querySelector('#opt-fivePlayersPartner')?.checked),
      allowHalfPoints: Boolean(container.querySelector('#opt-allowHalfPoints')?.checked),
      petitAuBout: Boolean(container.querySelector('#opt-petitAuBout')?.checked),
      poignee: Boolean(container.querySelector('#opt-poignee')?.checked),
      defensePoignee: Boolean(container.querySelector('#opt-defensePoignee')?.checked),
      chelem: Boolean(container.querySelector('#opt-chelem')?.checked),
      misereVariant: Boolean(container.querySelector('#opt-misereVariant')?.checked),
      misereValue: toNumber(container.querySelector('#opt-misereValue')?.value, 10)
    };
  }

  function renderPlayerTiles() {
    const tiles = container.querySelector('#playerTiles');
    const tray = container.querySelector('#selectedPlayersTray');
    const help = container.querySelector('#tarotPlayerHelp');
    if (!tiles || !tray) return;

    readSetupOptions();
    if (help) help.textContent = `Sélection : ${selectedPlayers.length}/${options.playerCount} — minimum ${options.playerCount} joueurs.`;

    tiles.innerHTML = '';
    allPlayers.forEach((player, index) => {
      const selectedIndex = selectedPlayers.findIndex(p => p.localIndex === index && !p.isGuest);
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'score-player-tile tarot-player-tile';
      if (selectedIndex >= 0) tile.classList.add('selected');
      tile.innerHTML = `
        <span class="score-player-order">${selectedIndex >= 0 ? selectedIndex + 1 : ''}</span>
        <img src="${avatarSrc(player.avatar)}" alt="">
        <span>${escapeHTML(player.name)}</span>
      `;
      tile.addEventListener('click', () => togglePlayer(player, index));
      tiles.appendChild(tile);
    });

    const guest = document.createElement('button');
    guest.type = 'button';
    guest.className = 'score-player-tile score-add-guest-tile';
    guest.innerHTML = `<img src="${avatarSrc(DEFAULT_AVATAR)}" alt=""><span>+ Invité</span><small>Partie rapide</small>`;
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
      <button class="score-selected-chip" type="button" data-key="${escapeHTML(player.localIndex)}" title="Retirer ${escapeHTML(player.name)}">
        <span class="score-chip-order">${index + 1}</span>
        <img src="${avatarSrc(player.avatar)}" alt="">
        <span>${escapeHTML(player.name)}</span>
        <b>×</b>
      </button>
    `).join('');
    tray.querySelectorAll('.score-selected-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        selectedPlayers = selectedPlayers.filter(p => String(p.localIndex) !== String(chip.dataset.key));
        renderPlayerTiles();
      });
    });
  }

  function togglePlayer(player, index) {
    const existing = selectedPlayers.findIndex(p => p.localIndex === index && !p.isGuest);
    if (existing >= 0) selectedPlayers.splice(existing, 1);
    else {
      if (selectedPlayers.length >= options.playerCount) return showToast(`Tarot configuré pour ${options.playerCount} joueurs.`);
      selectedPlayers.push({ ...player, localIndex: index, isGuest: false });
    }
    renderPlayerTiles();
  }

  function addGuestPlayer() {
    if (selectedPlayers.length >= options.playerCount) return showToast(`Tarot configuré pour ${options.playerCount} joueurs.`);
    openGuestModal(name => {
      if (!name) return;
      const uid = `guest-${Date.now()}`;
      selectedPlayers.push({ id: uid, name, avatar: DEFAULT_AVATAR, isGuest: true, localIndex: uid });
      renderPlayerTiles();
    });
  }

  function openGuestModal(callback) {
    const overlay = document.createElement('div');
    overlay.className = 'score-guest-overlay';
    overlay.innerHTML = `
      <div class="score-guest-modal" role="dialog" aria-modal="true">
        <h2>Ajouter un invité</h2>
        <p>Parfait pour une partie rapide.</p>
        <input id="tarotGuestName" type="text" maxlength="28" placeholder="Nom de l’invité…" autocomplete="off">
        <div class="score-actions-bar">
          <button class="round-btn score-primary-action" id="tarotGuestOk">${iconMarkup('add')} Ajouter</button>
          <button class="round-btn score-secondary" id="tarotGuestCancel">Annuler</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#tarotGuestName');
    input.focus();
    function close(value) {
      overlay.remove();
      callback(value && value.trim() ? value.trim() : null);
    }
    overlay.querySelector('#tarotGuestOk').addEventListener('click', () => close(input.value));
    overlay.querySelector('#tarotGuestCancel').addEventListener('click', () => close(null));
    overlay.addEventListener('click', event => { if (event.target === overlay) close(null); });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') close(input.value);
      if (event.key === 'Escape') close(null);
    });
  }

  function startGame() {
    readSetupOptions();
    if (selectedPlayers.length !== options.playerCount) return showToast(`Il faut exactement ${options.playerCount} joueurs.`);
    state = {
      ...emptyState(),
      started: true,
      ended: false,
      options,
      players: selectedPlayers.map(p => ({ ...p })),
      rounds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveState();
    renderGame(false);
  }

  function getTotals() {
    const totals = new Array(state.players.length).fill(0);
    state.rounds.forEach(round => {
      (round.values || []).forEach((value, index) => { totals[index] += toNumber(value, 0); });
    });
    return totals;
  }

  function getRanks(totals = getTotals()) {
    const sorted = totals.map((total, index) => ({ total, index })).sort((a, b) => b.total - a.total);
    const ranks = new Array(totals.length).fill(1);
    sorted.forEach((item, pos) => {
      if (pos > 0 && item.total === sorted[pos - 1].total) ranks[item.index] = ranks[sorted[pos - 1].index];
      else ranks[item.index] = pos + 1;
    });
    return ranks;
  }

  function getLeader(totals = getTotals()) {
    const max = Math.max(...totals);
    const idx = totals.indexOf(max);
    return state.players[idx]?.name || '—';
  }

  function getModeLabel() {
    const target = toNumber(state.options.target, 0);
    const format = `${state.options.playerCount} joueurs${state.options.playerCount === 5 && state.options.fivePlayersPartner ? ' · appel au roi possible' : ''}`;
    return target > 0 ? `${format} · objectif ${target}` : `${format} · score libre`;
  }

  function renderGame(restored = false) {
    container.innerHTML = `
      <section class="score-game-card tarot-game-card">
        <div class="score-game-topline">
          <div>
            <h2>Tarot</h2>
            <p>${escapeHTML(getModeLabel())}</p>
          </div>
          <div class="score-save-badge" id="saveBadge">${iconMarkup('save')} Sauvegarde auto</div>
        </div>
        ${restored ? `<div class="score-notice">Partie récupérée automatiquement.</div>` : ''}
        <div class="score-summary-grid" id="scoreSummary"></div>
        <div class="tarot-score-wrap">
          <table class="tarot-table">
            <thead>
              <tr>
                <th>Donne</th>
                <th>Preneur</th>
                <th>Contrat</th>
                <th>Bouts</th>
                <th>Résultat</th>
                ${state.players.map(player => `<th>${renderPlayerHeader(player)}</th>`).join('')}
                <th>Détail</th>
              </tr>
            </thead>
            <tbody id="tarotScoreBody"></tbody>
          </table>
        </div>
        <div class="score-actions-bar round-controls tarot-controls">
          <button class="round-btn score-primary-action" id="addTarotRound">${iconMarkup('add')} Ajouter une donne</button>
          <button class="round-btn" id="editTarotRounds">${iconMarkup('edit')} Modifier les donnes</button>
          <button class="round-btn" id="finishTarotGame">${iconMarkup('finish')} Fin de partie</button>
          <button class="round-btn score-secondary" id="newTarotGame">${iconMarkup('refresh')} Nouvelle partie</button>
        </div>
      </section>
    `;
    container.querySelector('#addTarotRound').addEventListener('click', () => openRoundModal());
    container.querySelector('#editTarotRounds').addEventListener('click', openEditModal);
    container.querySelector('#finishTarotGame').addEventListener('click', () => openEndModal('manual'));
    container.querySelector('#newTarotGame').addEventListener('click', confirmNewGame);
    refreshGame();
  }

  function renderPlayerHeader(player) {
    return `
      <div class="score-entity-head tarot-player-head">
        <img src="${avatarSrc(player.avatar)}" alt="">
        <strong>${escapeHTML(player.name)}</strong>
      </div>
    `;
  }

  function refreshGame() {
    renderSummary();
    renderTable();
    updateSaveBadge();
  }

  function updateSaveBadge() {
    const badge = container.querySelector('#saveBadge');
    if (badge && state?.updatedAt) badge.innerHTML = `${iconMarkup('save')} Sauvegardé · ${getDateLabel(state.updatedAt)}`;
  }

  function renderSummary() {
    const totals = getTotals();
    const target = toNumber(state.options.target, 0);
    const status = target > 0 && totals.some(total => total >= target) ? `${getLeader(totals)} atteint l’objectif` : 'En cours';
    const box = container.querySelector('#scoreSummary');
    box.innerHTML = `
      <div class="score-summary-card"><span>Leader</span><strong>${escapeHTML(getLeader(totals))}</strong><small>${Math.max(...totals)} points</small></div>
      <div class="score-summary-card"><span>Donnes</span><strong>${state.rounds.length}</strong><small>${target > 0 ? `Objectif ${target}` : 'Objectif libre'}</small></div>
      <div class="score-summary-card"><span>Statut</span><strong>${escapeHTML(status)}</strong><small>${state.options.playerCount} joueurs</small></div>
    `;
  }

  function renderTable() {
    const body = container.querySelector('#tarotScoreBody');
    const totals = getTotals();
    const ranks = getRanks(totals);
    const colCount = 6 + state.players.length;
    const rows = [];
    rows.push(`
      <tr class="ranking-row">
        <td colspan="5">Rang</td>
        ${ranks.map(rank => `<td><span class="score-rank-badge rank-${Math.min(rank, 4)}">${rank}</span></td>`).join('')}
        <td></td>
      </tr>
      <tr class="total-row">
        <td colspan="5">Total</td>
        ${totals.map(total => `<td>${formatScore(total)}</td>`).join('')}
        <td></td>
      </tr>
    `);
    if (!state.rounds.length) rows.push(`<tr><td colspan="${colCount}" class="tarot-empty-row">Aucune donne pour le moment.</td></tr>`);
    else state.rounds.forEach((round, index) => rows.push(renderRoundRow(round, index)));
    body.innerHTML = rows.join('');
  }

  function renderRoundRow(round, index) {
    const taker = state.players[toNumber(round.takerIndex, 0)]?.name || '—';
    const partner = round.partnerIndex !== 'none' ? state.players[toNumber(round.partnerIndex, -1)]?.name : '';
    const contract = CONTRACTS.find(c => c.value === round.contract) || CONTRACTS[1];
    return `
      <tr>
        <td>D${index + 1}</td>
        <td><strong>${escapeHTML(taker)}</strong>${partner ? `<br><small>avec ${escapeHTML(partner)}</small>` : ''}</td>
        <td>${escapeHTML(contract.label)}<br><small>×${contract.coefficient}</small></td>
        <td>${round.oudlerCount}<br><small>${formatScore(round.targetPoints)} à faire</small></td>
        <td><span class="belote-result ${round.success ? 'is-success' : 'is-fail'}">${round.success ? 'Réussi' : 'Chuté'}</span></td>
        ${(round.values || []).map(v => `<td>${formatScore(v)}</td>`).join('')}
        <td><small>${escapeHTML(round.detail || makeDetail(round))}</small></td>
      </tr>
    `;
  }

  function formatScore(value) {
    const n = toNumber(value, 0);
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
  }

  function calculateRound(data) {
    const contract = CONTRACTS.find(c => c.value === data.contract) || CONTRACTS[1];
    const targetPoints = OUDLER_TARGETS[clamp(toNumber(data.oudlerCount, 1), 0, 3)];
    const takerPoints = toNumber(data.takerPoints, targetPoints);
    const difference = takerPoints - targetPoints;
    const success = difference >= 0;
    const sign = success ? 1 : -1;

    const petitValue = state.options.petitAuBout ? getPetitBonus(data.petitAuBoutSide, data.takerIndex, data.partnerIndex) : 0;
    const poigneeValue = state.options.poignee ? getPoigneeBonus(data.takerPoignee, data.defensePoignee) : 0;
    const chelemValue = state.options.chelem ? getChelemBonus(data.chelem) : 0;
    const misereValue = state.options.misereVariant ? toNumber(data.misereCount, 0) * toNumber(state.options.misereValue, 10) : 0;

    const baseScore = 25 + Math.abs(difference);
    let attackScore = sign * ((baseScore + petitValue) * contract.coefficient + poigneeValue + chelemValue + misereValue);
    if (!state.options.allowHalfPoints) attackScore = Math.round(attackScore);

    let values = new Array(state.players.length).fill(0);
    if (data.manual) {
      values = state.players.map((_, index) => toNumber(data.manualValues?.[index], 0));
    } else {
      const taker = toNumber(data.takerIndex, 0);
      const partner = data.partnerIndex !== 'none' ? toNumber(data.partnerIndex, -1) : -1;
      const hasPartner = state.options.playerCount === 5 && state.options.fivePlayersPartner && partner >= 0 && partner !== taker;
      if (hasPartner) {
        values = values.map((_, index) => {
          if (index === taker) return attackScore * 2;
          if (index === partner) return attackScore;
          return -attackScore;
        });
      } else {
        values = values.map((_, index) => index === taker ? attackScore * (state.players.length - 1) : -attackScore);
      }
    }

    return { values, success, baseScore, attackScore, targetPoints, difference };
  }

  function getPetitBonus(side, takerIndex, partnerIndex) {
    if (side === 'none') return 0;
    const taker = String(takerIndex);
    const partner = String(partnerIndex);
    const attackWon = side === 'attack' || side === taker || (partner !== 'none' && side === partner);
    return attackWon ? 10 : -10;
  }

  function getPoigneeBonus(takerPoignee, defensePoignee) {
    return toNumber(POIGNEE_VALUES[takerPoignee] || 0, 0) - toNumber(POIGNEE_VALUES[defensePoignee] || 0, 0);
  }

  function getChelemBonus(chelem) {
    if (chelem === 'announced-success') return 400;
    if (chelem === 'unannounced-success') return 200;
    if (chelem === 'announced-fail') return -200;
    return 0;
  }

  function makeDetail(round) {
    const contract = CONTRACTS.find(c => c.value === round.contract) || CONTRACTS[1];
    const petit = round.petitAuBoutSide && round.petitAuBoutSide !== 'none' ? 'petit au bout' : 'sans petit au bout';
    const chelem = round.chelem !== 'none' ? ` · chelem ${chelemLabel(round.chelem)}` : '';
    const poignee = [round.takerPoignee !== 'none' ? `attaque ${poigneeLabel(round.takerPoignee)}` : '', round.defensePoignee !== 'none' ? `défense ${poigneeLabel(round.defensePoignee)}` : ''].filter(Boolean).join(' / ');
    return `${contract.label} · ${formatScore(round.takerPoints)} pts preneur · ${petit}${poignee ? ` · poignée ${poignee}` : ''}${chelem}`;
  }

  function openRoundModal(existingIndex = null) {
    const isEdit = existingIndex !== null;
    const existing = isEdit ? state.rounds[existingIndex] : null;
    const round = existing || {
      takerIndex: '0', partnerIndex: 'none', contract: 'garde', oudlerCount: 1, takerPoints: 51,
      petitAuBoutSide: 'none', takerPoignee: 'none', defensePoignee: 'none', chelem: 'none', misereCount: 0,
      manual: false, manualValues: new Array(state.players.length).fill(0)
    };
    const overlay = document.createElement('div');
    overlay.className = 'round-overlay tarot-round-overlay';
    overlay.innerHTML = `
      <div class="round-modal score-round-modal tarot-round-modal" role="dialog" aria-modal="true">
        <h2>${isEdit ? 'Modifier la donne' : 'Nouvelle donne'}</h2>
        <p class="score-helper">Indique le preneur, le contrat, les bouts et les primes. Le calcul applique automatiquement la répartition attaque / défense.</p>

        <div class="tarot-round-grid">
          <label><span>Preneur</span>${playerSelect('tarotTakerIndex', round.takerIndex)}</label>
          ${state.options.playerCount === 5 && state.options.fivePlayersPartner ? `<label><span>Partenaire appelé</span>${partnerSelect(round.partnerIndex, round.takerIndex)}</label>` : ''}
          <label><span>Contrat</span>${contractSelect(round.contract)}</label>
          <label><span>Bouts / Oudlers</span>${oudlerSelect(round.oudlerCount)}</label>
          <label><span>Points du preneur</span><input id="tarotTakerPoints" type="number" step="0.5" min="0" max="91" value="${escapeHTML(round.takerPoints)}"></label>
          ${state.options.petitAuBout ? `<label><span>Petit au bout</span>${petitSelect(round.petitAuBoutSide)}</label>` : ''}
        </div>

        <div class="tarot-subpanel">
          <h3>Primes et variantes</h3>
          <div class="tarot-round-grid compact">
            ${state.options.poignee ? `<label><span>Poignée attaque</span>${poigneeSelect('tarotTakerPoignee', round.takerPoignee)}</label>` : ''}
            ${state.options.poignee && state.options.defensePoignee ? `<label><span>Poignée défense</span>${poigneeSelect('tarotDefensePoignee', round.defensePoignee)}</label>` : ''}
            ${state.options.chelem ? `<label><span>Chelem</span>${chelemSelect(round.chelem)}</label>` : ''}
            ${state.options.misereVariant ? `<label><span>Nombre de misères</span><input id="tarotMisereCount" type="number" min="0" max="${state.players.length}" value="${escapeHTML(round.misereCount || 0)}"></label>` : ''}
          </div>
        </div>

        <label class="score-option-check tarot-manual-check"><input id="tarotManual" type="checkbox" ${round.manual ? 'checked' : ''}><span>Corriger le score manuellement</span></label>
        <div class="tarot-manual-values" id="tarotManualValues">
          ${state.players.map((player, index) => `<label><span>${escapeHTML(player.name)}</span><input id="tarotScore${index}" type="number" step="0.5" value="${escapeHTML(round.values?.[index] || round.manualValues?.[index] || 0)}"></label>`).join('')}
        </div>

        <div class="tarot-preview" id="tarotPreview"></div>

        <div class="round-actions">
          <button class="round-btn score-primary-action" id="saveTarotRound">${iconMarkup('save')} Valider la donne</button>
          <button class="round-btn score-secondary" id="cancelTarotRound">Annuler</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const updatePreview = () => {
      const data = readRoundForm(overlay);
      const calc = calculateRound(data);
      const manualBox = overlay.querySelector('#tarotManualValues');
      if (manualBox) manualBox.classList.toggle('is-visible', data.manual);
      overlay.querySelector('#tarotPreview').innerHTML = `
        <strong>${calc.success ? 'Contrat réussi' : 'Contrat chuté'}</strong>
        <span>Seuil : ${formatScore(calc.targetPoints)} · Écart : ${formatScore(calc.difference)}</span>
        <span>Score attaque : ${formatScore(calc.attackScore)}</span>
        <div>${calc.values.map((v, i) => `<small>${escapeHTML(state.players[i].name)} : ${formatScore(v)}</small>`).join('')}</div>
      `;
    };

    overlay.querySelectorAll('input, select').forEach(el => el.addEventListener('input', updatePreview));
    overlay.querySelectorAll('input, select').forEach(el => el.addEventListener('change', () => {
      if (el.id === 'tarotTakerIndex') {
        const partner = overlay.querySelector('#tarotPartnerIndex');
        if (partner && partner.value === el.value) partner.value = 'none';
      }
      updatePreview();
    }));
    updatePreview();

    overlay.querySelector('#cancelTarotRound').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#saveTarotRound').addEventListener('click', () => {
      const data = readRoundForm(overlay);
      const calc = calculateRound(data);
      const saved = normalizeRound({ ...data, ...calc, createdAt: existing?.createdAt || new Date().toISOString() }, existingIndex ?? state.rounds.length);
      saved.detail = makeDetail(saved);
      if (isEdit) state.rounds[existingIndex] = saved;
      else state.rounds.push(saved);
      state.ended = false;
      saveState();
      overlay.remove();
      refreshGame();
      maybeSuggestEnd();
    });
  }

  function readRoundForm(root) {
    return {
      takerIndex: root.querySelector('#tarotTakerIndex')?.value || '0',
      partnerIndex: root.querySelector('#tarotPartnerIndex')?.value || 'none',
      contract: root.querySelector('#tarotContract')?.value || 'garde',
      oudlerCount: toNumber(root.querySelector('#tarotOudlerCount')?.value, 1),
      takerPoints: toNumber(root.querySelector('#tarotTakerPoints')?.value, 51),
      petitAuBoutSide: root.querySelector('#tarotPetitSide')?.value || 'none',
      takerPoignee: root.querySelector('#tarotTakerPoignee')?.value || 'none',
      defensePoignee: root.querySelector('#tarotDefensePoignee')?.value || 'none',
      chelem: root.querySelector('#tarotChelem')?.value || 'none',
      misereCount: toNumber(root.querySelector('#tarotMisereCount')?.value, 0),
      manual: Boolean(root.querySelector('#tarotManual')?.checked),
      manualValues: state.players.map((_, index) => toNumber(root.querySelector(`#tarotScore${index}`)?.value, 0))
    };
  }

  function playerSelect(id, value) {
    return `<select id="${id}">${state.players.map((p, i) => `<option value="${i}" ${String(value) === String(i) ? 'selected' : ''}>${escapeHTML(p.name)}</option>`).join('')}</select>`;
  }

  function partnerSelect(value, takerIndex = '0') {
    return `<select id="tarotPartnerIndex"><option value="none">Aucun / solo</option>${state.players.map((p, i) => `<option value="${i}" ${String(value) === String(i) ? 'selected' : ''}>${escapeHTML(p.name)}</option>`).join('')}</select>`;
  }

  function contractSelect(value) {
    return `<select id="tarotContract">${CONTRACTS.map(c => `<option value="${c.value}" ${value === c.value ? 'selected' : ''}>${escapeHTML(c.label)} ×${c.coefficient}</option>`).join('')}</select>`;
  }

  function oudlerSelect(value) {
    return `<select id="tarotOudlerCount">${[0,1,2,3].map(count => `<option value="${count}" ${toNumber(value) === count ? 'selected' : ''}>${count} bout${count > 1 ? 's' : ''} · ${OUDLER_TARGETS[count]} pts</option>`).join('')}</select>`;
  }

  function petitSelect(value) {
    return `<select id="tarotPetitSide"><option value="none">Aucun</option><option value="attack" ${value === 'attack' ? 'selected' : ''}>Attaque</option><option value="defense" ${value === 'defense' ? 'selected' : ''}>Défense</option></select>`;
  }

  function poigneeSelect(id, value) {
    return `<select id="${id}">
      <option value="none" ${value === 'none' ? 'selected' : ''}>Aucune</option>
      <option value="simple" ${value === 'simple' ? 'selected' : ''}>Simple +20</option>
      <option value="double" ${value === 'double' ? 'selected' : ''}>Double +30</option>
      <option value="triple" ${value === 'triple' ? 'selected' : ''}>Triple +40</option>
    </select>`;
  }

  function chelemSelect(value) {
    return `<select id="tarotChelem">
      <option value="none" ${value === 'none' ? 'selected' : ''}>Aucun</option>
      <option value="unannounced-success" ${value === 'unannounced-success' ? 'selected' : ''}>Réussi non annoncé +200</option>
      <option value="announced-success" ${value === 'announced-success' ? 'selected' : ''}>Annoncé réussi +400</option>
      <option value="announced-fail" ${value === 'announced-fail' ? 'selected' : ''}>Annoncé chuté -200</option>
    </select>`;
  }

  function poigneeLabel(value) {
    return ({ simple: 'simple', double: 'double', triple: 'triple' })[value] || 'aucune';
  }

  function chelemLabel(value) {
    return ({ 'unannounced-success': 'réussi non annoncé', 'announced-success': 'annoncé réussi', 'announced-fail': 'annoncé chuté' })[value] || 'aucun';
  }

  function openEditModal() {
    const overlay = document.createElement('div');
    overlay.className = 'edit-overlay';
    overlay.innerHTML = `
      <div class="edit-modal score-edit-modal tarot-edit-modal">
        <h2>Modifier les donnes</h2>
        ${state.rounds.length ? `
          <div class="tarot-edit-list">
            ${state.rounds.map((round, index) => `
              <div class="tarot-edit-row">
                <strong>D${index + 1}</strong>
                <span>${escapeHTML(state.players[toNumber(round.takerIndex,0)].name)} · ${escapeHTML((CONTRACTS.find(c => c.value === round.contract) || CONTRACTS[1]).label)} · ${round.success ? 'réussi' : 'chuté'} · attaque ${formatScore(round.attackScore)}</span>
                <button class="round-btn" data-edit="${index}">${iconMarkup('edit')} Modifier</button>
                <label class="score-option-check"><input type="checkbox" data-delete="${index}"><span>Supprimer</span></label>
              </div>
            `).join('')}
          </div>
        ` : '<p>Aucune donne à modifier.</p>'}
        <div class="edit-actions">
          <button class="round-btn score-primary-action" id="saveTarotEdit">${iconMarkup('save')} Enregistrer</button>
          <button class="round-btn score-secondary" id="closeTarotEdit">Fermer</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
      const idx = toNumber(btn.dataset.edit, 0);
      overlay.remove();
      openRoundModal(idx);
    }));
    overlay.querySelector('#closeTarotEdit').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#saveTarotEdit').addEventListener('click', () => {
      const deleteSet = new Set(Array.from(overlay.querySelectorAll('[data-delete]:checked')).map(input => toNumber(input.dataset.delete, -1)));
      state.rounds = state.rounds.filter((_, idx) => !deleteSet.has(idx));
      state.ended = false;
      saveState();
      overlay.remove();
      refreshGame();
    });
  }

  function maybeSuggestEnd() {
    const target = toNumber(state.options.target, 0);
    if (target <= 0) return;
    const totals = getTotals();
    if (totals.some(total => total >= target)) openEndModal('auto');
  }

  function openEndModal(reason = 'manual') {
    state.ended = true;
    saveState();
    const totals = getTotals();
    const rows = totals.map((total, index) => ({ total, index })).sort((a, b) => b.total - a.total);
    const overlay = document.createElement('div');
    overlay.className = 'endgame-overlay';
    overlay.innerHTML = `
      <div class="endgame-modal tarot-end-modal">
        <h2>${reason === 'auto' ? 'Objectif atteint' : 'Fin de partie'}</h2>
        <table class="endgame-table">
          <thead><tr><th>Rang</th><th>Joueur</th><th>Total</th></tr></thead>
          <tbody>${rows.map((row, rank) => `<tr><td><span class="score-rank-badge rank-${Math.min(rank + 1, 4)}">${rank + 1}</span></td><td>${escapeHTML(state.players[row.index].name)}</td><td>${formatScore(row.total)}</td></tr>`).join('')}</tbody>
        </table>
        <div class="endgame-actions">
          <button class="round-btn score-secondary" id="continueTarot">Continuer</button>
          <button class="round-btn score-primary-action" id="restartTarot">Nouvelle partie</button>
          <button class="round-btn score-secondary" id="homeTarot">Accueil</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    if (typeof confetti === 'function') confetti({ particleCount: 140, spread: 85, origin: { y: 0.6 } });
    overlay.querySelector('#continueTarot').addEventListener('click', () => { state.ended = false; saveState(); overlay.remove(); refreshGame(); });
    overlay.querySelector('#restartTarot').addEventListener('click', () => { clearState(); overlay.remove(); renderSetup(false); });
    overlay.querySelector('#homeTarot').addEventListener('click', () => { window.location.href = 'home.html'; });
  }

  function confirmNewGame() {
    const restart = () => { clearState(); renderSetup(false); };
    if (window.showConfirm) {
      window.showConfirm('Commencer une nouvelle partie ? La sauvegarde Tarot actuelle sera effacée.', restart, null, {
        title: 'Nouvelle partie', yesLabel: 'Nouvelle partie', yesIcon: 'refresh', noLabel: 'Annuler'
      });
    } else if (confirm('Commencer une nouvelle partie ?')) restart();
  }
}
