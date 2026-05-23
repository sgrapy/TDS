// js/belote-coinche.js
// V0.6.3 — Belote / Coinche affinée : contrats, annonces, coinche/surcoinche, capot et sauvegarde automatique.

const APP_VERSION = '0.6.3';
const SLUG = 'belote-coinche';
const STORAGE_KEY = `taverne_score_${SLUG}`;
const DEFAULT_AVATAR = 'avatar24.png';
const AVATAR_PATH = 'assets/avatars/';
const ICON_PATH = 'assets/icons/';

const CONTRACTS = [80, 90, 100, 110, 120, 130, 140, 150, 160, 250];
const TRUMPS = [
  { value: 'clubs', label: '♣ Trèfle' },
  { value: 'diamonds', label: '♦ Carreau' },
  { value: 'hearts', label: '♥ Cœur' },
  { value: 'spades', label: '♠ Pique' },
  { value: 'no-trump', label: 'Sans atout' },
  { value: 'all-trump', label: 'Tout atout' }
];

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

function round10(value) {
  return Math.round(value / 10) * 10;
}

function buildTeams(players) {
  const team1 = [players[0], players[2]].filter(Boolean);
  const team2 = [players[1], players[3]].filter(Boolean);
  return [team1, team2].map((members, index) => ({
    id: `belote-team-${index + 1}`,
    name: `Équipe ${index + 1}`,
    subtitle: members.map(p => p.name).join(' + '),
    avatars: members.map(p => p.avatar || DEFAULT_AVATAR),
    members
  }));
}

function defaultOptions() {
  return {
    mode: 'belote',
    target: 1000,
    dealTotal: 162,
    roundTo10: true,
    announcements: true,
    beloteRebelote: true,
    capot: true,
    failedContractBeloteKeeps: true
  };
}

function normalizeState(raw) {
  if (!raw || raw.gameSlug !== SLUG || !Array.isArray(raw.teams) || !Array.isArray(raw.rounds)) return null;
  return {
    version: raw.version || APP_VERSION,
    gameSlug: SLUG,
    started: Boolean(raw.started),
    ended: Boolean(raw.ended),
    options: { ...defaultOptions(), ...(raw.options || {}) },
    selectedPlayers: Array.isArray(raw.selectedPlayers) ? raw.selectedPlayers : [],
    teams: raw.teams,
    rounds: raw.rounds.map((r, index) => normalizeRound(r, index)),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString()
  };
}

function normalizeRound(round, index = 0) {
  const values = Array.isArray(round.values) ? [toNumber(round.values[0], 0), toNumber(round.values[1], 0)] : [0, 0];
  return {
    number: round.number || index + 1,
    contractTeam: String(round.contractTeam ?? '0'),
    contractValue: toNumber(round.contractValue, 80),
    trump: round.trump || 'clubs',
    multiplier: toNumber(round.multiplier, 1),
    takerTrickPoints: toNumber(round.takerTrickPoints, 0),
    announcements: [toNumber(round.announcements?.[0], 0), toNumber(round.announcements?.[1], 0)],
    beloteTeam: String(round.beloteTeam ?? 'none'),
    capotWinner: String(round.capotWinner ?? 'none'),
    manual: Boolean(round.manual),
    values,
    success: Boolean(round.success),
    note: round.note || '',
    createdAt: round.createdAt || new Date().toISOString()
  };
}

function emptyState() {
  return {
    version: APP_VERSION,
    gameSlug: SLUG,
    started: false,
    ended: false,
    options: defaultOptions(),
    selectedPlayers: [],
    teams: [],
    rounds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function init(container) {
  const allPlayers = readPlayers();
  let selectedPlayers = [];
  let options = defaultOptions();
  let state = loadState() || emptyState();

  document.getElementById('gameTitle').textContent = 'Belote / Coinche';

  if (state.started && !state.ended) renderGame(true);
  else renderSetup(Boolean(state.ended));

  function loadState() {
    try {
      return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
    } catch (error) {
      console.warn('Sauvegarde Belote/Coinche illisible.', error);
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
      <div class="score-setup-overlay belote-setup-overlay" role="dialog" aria-modal="true" aria-labelledby="beloteSetupTitle">
        <section class="score-setup-modal belote-setup-modal">
          <div class="score-setup-hero">
            <div class="score-setup-kicker">Préparation de la partie</div>
            <div class="score-setup-title-row">
              <div>
                <h2 id="beloteSetupTitle">Belote / Coinche</h2>
                <p>Partie par équipes avec contrats, annonces, atout, capot et variante Coinche.</p>
              </div>
              <span class="score-version">V${APP_VERSION}</span>
            </div>
            ${showEndedNotice ? `<div class="score-notice belote-readable-notice">Dernière partie terminée. Tu peux relancer une nouvelle partie proprement.</div>` : ''}
          </div>

          <div class="score-setup-grid belote-setup-grid">
            <section class="score-setup-panel score-rules-panel">
              <div class="score-panel-head">
                <span class="score-panel-icon">${iconMarkup('rules')}</span>
                <div>
                  <h3>Règles de départ</h3>
                  <p>Choisis le mode et les variantes de score.</p>
                </div>
              </div>

              <div class="score-options-grid belote-options-grid">
                ${selectField('mode', 'Mode de jeu', options.mode, [
                  ['belote', 'Belote classique'],
                  ['coinche', 'Coinche']
                ])}
                ${numberField('target', 'Score à atteindre', options.target, 100, 5000, 10)}
                ${numberField('dealTotal', 'Points de base d’une donne', options.dealTotal, 100, 300, 1)}
                ${checkboxField('roundTo10', 'Arrondir les scores à la dizaine', options.roundTo10)}
                ${checkboxField('announcements', 'Activer les annonces', options.announcements)}
                ${checkboxField('beloteRebelote', 'Belote / Rebelote +20', options.beloteRebelote)}
                ${checkboxField('capot', 'Capot possible', options.capot)}
                ${checkboxField('failedContractBeloteKeeps', 'Belote conservée même si contrat chuté', options.failedContractBeloteKeeps)}
              </div>
            </section>

            <section class="score-setup-panel score-players-panel">
              <div class="score-panel-head">
                <span class="score-panel-icon">${iconMarkup('players')}</span>
                <div>
                  <h3>Joueurs</h3>
                  <p class="score-helper">Sélectionne 4 joueurs. Ordre conseillé : équipe 1, équipe 2, équipe 1, équipe 2.</p>
                </div>
              </div>
              <div class="belote-team-preview" id="beloteTeamPreview"></div>
              <div class="score-selected-tray" id="selectedPlayersTray"></div>
              <div class="score-player-tiles" id="playerTiles"></div>
            </section>
          </div>

          <div class="score-setup-footer">
            <button class="round-btn score-primary-action" id="startBeloteGame">${iconMarkup('start')} Lancer la partie</button>
            <button class="round-btn score-secondary" id="clearBeloteSave">${iconMarkup('clear')} Effacer sauvegarde</button>
            <a class="round-btn score-secondary" href="home.html">${iconMarkup('home')} Accueil</a>
          </div>
        </section>
      </div>
    `;

    bindSetupOptions();
    renderPlayerTiles();
    renderTeamPreview();

    container.querySelector('#startBeloteGame').addEventListener('click', startGame);
    container.querySelector('#clearBeloteSave').addEventListener('click', () => {
      clearState();
      showToast('Sauvegarde Belote/Coinche effacée.');
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
      input.addEventListener('change', readSetupOptions);
    });
  }

  function readSetupOptions() {
    options = {
      mode: container.querySelector('#opt-mode')?.value || 'belote',
      target: toNumber(container.querySelector('#opt-target')?.value, 1000),
      dealTotal: toNumber(container.querySelector('#opt-dealTotal')?.value, 162),
      roundTo10: Boolean(container.querySelector('#opt-roundTo10')?.checked),
      announcements: Boolean(container.querySelector('#opt-announcements')?.checked),
      beloteRebelote: Boolean(container.querySelector('#opt-beloteRebelote')?.checked),
      capot: Boolean(container.querySelector('#opt-capot')?.checked),
      failedContractBeloteKeeps: Boolean(container.querySelector('#opt-failedContractBeloteKeeps')?.checked)
    };
    if (options.mode === 'coinche' && options.target < 1000) {
      options.target = 1500;
      const target = container.querySelector('#opt-target');
      if (target) target.value = 1500;
    }
  }

  function renderPlayerTiles() {
    const tiles = container.querySelector('#playerTiles');
    const tray = container.querySelector('#selectedPlayersTray');
    if (!tiles || !tray) return;

    tiles.innerHTML = '';
    allPlayers.forEach((player, index) => {
      const tile = document.createElement('button');
      tile.type = 'button';
      tile.className = 'score-player-tile belote-player-tile';
      const selectedIndex = selectedPlayers.findIndex(p => p.localIndex === index && !p.isGuest);
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
        renderTeamPreview();
      });
    });
  }

  function togglePlayer(player, index) {
    const existing = selectedPlayers.findIndex(p => p.localIndex === index && !p.isGuest);
    if (existing >= 0) {
      selectedPlayers.splice(existing, 1);
    } else {
      if (selectedPlayers.length >= 4) return showToast('Belote/Coinche se joue à 4 joueurs.');
      selectedPlayers.push({ ...player, localIndex: index, isGuest: false });
    }
    renderPlayerTiles();
    renderTeamPreview();
  }

  function addGuestPlayer() {
    if (selectedPlayers.length >= 4) return showToast('Belote/Coinche se joue à 4 joueurs.');
    openGuestModal(name => {
      if (!name) return;
      const uid = `guest-${Date.now()}`;
      selectedPlayers.push({ id: uid, name, avatar: DEFAULT_AVATAR, isGuest: true, localIndex: uid });
      renderPlayerTiles();
      renderTeamPreview();
    });
  }

  function openGuestModal(callback) {
    const overlay = document.createElement('div');
    overlay.className = 'score-guest-overlay';
    overlay.innerHTML = `
      <div class="score-guest-modal" role="dialog" aria-modal="true">
        <h2>Ajouter un invité</h2>
        <p>Parfait pour une partie rapide.</p>
        <input id="beloteGuestName" type="text" maxlength="28" placeholder="Nom de l’invité…" autocomplete="off">
        <div class="score-actions-bar">
          <button class="round-btn score-primary-action" id="beloteGuestOk">${iconMarkup('add')} Ajouter</button>
          <button class="round-btn score-secondary" id="beloteGuestCancel">Annuler</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#beloteGuestName');
    input.focus();
    function close(value) {
      overlay.remove();
      callback(value && value.trim() ? value.trim() : null);
    }
    overlay.querySelector('#beloteGuestOk').addEventListener('click', () => close(input.value));
    overlay.querySelector('#beloteGuestCancel').addEventListener('click', () => close(null));
    overlay.addEventListener('click', event => { if (event.target === overlay) close(null); });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') close(input.value);
      if (event.key === 'Escape') close(null);
    });
  }

  function renderTeamPreview() {
    const box = container.querySelector('#beloteTeamPreview');
    if (!box) return;
    const teams = buildTeams(selectedPlayers);
    box.innerHTML = `
      <div class="belote-team-card">
        <strong>Équipe 1</strong>
        <span>${escapeHTML(teams[0]?.subtitle || 'Joueur 1 + Joueur 3')}</span>
      </div>
      <div class="belote-team-card">
        <strong>Équipe 2</strong>
        <span>${escapeHTML(teams[1]?.subtitle || 'Joueur 2 + Joueur 4')}</span>
      </div>
    `;
  }

  function startGame() {
    readSetupOptions();
    if (selectedPlayers.length !== 4) return showToast('Il faut exactement 4 joueurs.');
    state = {
      ...emptyState(),
      started: true,
      ended: false,
      options,
      selectedPlayers: selectedPlayers.map(p => ({ ...p })),
      teams: buildTeams(selectedPlayers),
      rounds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveState();
    renderGame(false);
  }

  function getModeLabel() {
    const mode = state.options.mode === 'coinche' ? 'Coinche' : 'Belote classique';
    return `${mode} • contrats et annonces • objectif ${state.options.target}`;
  }

  function getTotals() {
    return state.rounds.reduce((acc, round) => {
      acc[0] += toNumber(round.values?.[0], 0);
      acc[1] += toNumber(round.values?.[1], 0);
      return acc;
    }, [0, 0]);
  }

  function getLeader(totals = getTotals()) {
    if (totals[0] === totals[1]) return 'Égalité';
    return state.teams[totals[0] > totals[1] ? 0 : 1].name;
  }

  function renderGame(restored = false) {
    container.innerHTML = `
      <section class="score-game-card belote-game-card">
        <div class="score-game-topline">
          <div>
            <h2>Belote / Coinche</h2>
            <p>${escapeHTML(getModeLabel())}</p>
          </div>
          <div class="score-save-badge" id="saveBadge">${iconMarkup('save')} Sauvegarde auto</div>
        </div>
        ${restored ? `<div class="score-notice">Partie récupérée automatiquement.</div>` : ''}
        <div class="score-summary-grid" id="scoreSummary"></div>
        <div class="belote-score-wrap">
          <table class="belote-table">
            <thead>
              <tr>
                <th>Donne</th>
                <th>Contrat</th>
                <th>Atout</th>
                <th>Résultat</th>
                <th>${renderTeamHeader(0)}</th>
                <th>${renderTeamHeader(1)}</th>
                <th>Détail</th>
              </tr>
            </thead>
            <tbody id="beloteScoreBody"></tbody>
          </table>
        </div>
        <div class="score-actions-bar round-controls belote-controls">
          <button class="round-btn score-primary-action" id="addBeloteRound">${iconMarkup('add')} Ajouter une donne</button>
          <button class="round-btn" id="editBeloteRounds">${iconMarkup('edit')} Modifier les donnes</button>
          <button class="round-btn" id="finishBeloteGame">${iconMarkup('finish')} Fin de partie</button>
          <button class="round-btn score-secondary" id="newBeloteGame">${iconMarkup('refresh')} Nouvelle partie</button>
        </div>
      </section>
    `;
    container.querySelector('#addBeloteRound').addEventListener('click', () => openRoundModal());
    container.querySelector('#editBeloteRounds').addEventListener('click', openEditModal);
    container.querySelector('#finishBeloteGame').addEventListener('click', () => openEndModal('manual'));
    container.querySelector('#newBeloteGame').addEventListener('click', confirmNewGame);
    refreshGame();
  }

  function renderTeamHeader(index) {
    const team = state.teams[index];
    return `
      <div class="score-entity-head belote-team-head">
        <div class="score-avatar-stack">${(team.avatars || []).map(src => `<img src="${avatarSrc(src)}" alt="">`).join('')}</div>
        <strong>${escapeHTML(team.name)}</strong>
        <small>${escapeHTML(team.subtitle || '')}</small>
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
    const target = toNumber(state.options.target, 1000);
    const status = totals.find(total => total >= target) !== undefined ? `${getLeader(totals)} atteint l’objectif` : 'En cours';
    const box = container.querySelector('#scoreSummary');
    box.innerHTML = `
      <div class="score-summary-card"><span>Leader</span><strong>${escapeHTML(getLeader(totals))}</strong><small>${totals[0]} / ${totals[1]} points</small></div>
      <div class="score-summary-card"><span>Donnes</span><strong>${state.rounds.length}</strong><small>Objectif ${target}</small></div>
      <div class="score-summary-card"><span>Statut</span><strong>${escapeHTML(status)}</strong><small>${state.options.mode === 'coinche' ? 'Coinche active' : 'Belote classique'}</small></div>
    `;
  }

  function renderTable() {
    const body = container.querySelector('#beloteScoreBody');
    const totals = getTotals();
    const rows = [];
    rows.push(`
      <tr class="ranking-row">
        <td colspan="4">Rang</td>
        <td><span class="score-rank-badge rank-${totals[0] >= totals[1] ? 1 : 2}">${totals[0] >= totals[1] ? 1 : 2}</span></td>
        <td><span class="score-rank-badge rank-${totals[1] > totals[0] ? 1 : 2}">${totals[1] > totals[0] ? 1 : 2}</span></td>
        <td></td>
      </tr>
      <tr class="total-row">
        <td colspan="4">Total</td>
        <td>${totals[0]}</td>
        <td>${totals[1]}</td>
        <td></td>
      </tr>
    `);

    if (!state.rounds.length) {
      rows.push(`<tr><td colspan="7" class="belote-empty-row">Aucune donne pour le moment.</td></tr>`);
    } else {
      state.rounds.forEach((round, index) => rows.push(renderRoundRow(round, index)));
    }
    body.innerHTML = rows.join('');
  }

  function renderRoundRow(round, index) {
    const taker = state.teams[toNumber(round.contractTeam, 0)]?.name || 'Équipe ?';
    const trump = TRUMPS.find(t => t.value === round.trump)?.label || round.trump;
    const multiplier = round.multiplier > 1 ? ` ×${round.multiplier}` : '';
    const result = round.success ? 'Réussi' : 'Chuté';
    return `
      <tr>
        <td>D${index + 1}</td>
        <td><strong>${escapeHTML(taker)}</strong><br><small>${round.contractValue}${multiplier}</small></td>
        <td>${escapeHTML(trump)}</td>
        <td><span class="belote-result ${round.success ? 'is-success' : 'is-fail'}">${result}</span></td>
        <td>${round.values[0]}</td>
        <td>${round.values[1]}</td>
        <td><small>${escapeHTML(round.note || makeDetail(round))}</small></td>
      </tr>
    `;
  }

  function makeDetail(round) {
    const a = round.announcements || [0, 0];
    const belote = round.beloteTeam !== 'none' ? `Belote ${state.teams[toNumber(round.beloteTeam, 0)]?.name}` : 'Sans belote';
    return `Plis preneur ${round.takerTrickPoints} · annonces ${a[0]}/${a[1]} · ${belote}`;
  }

  function calculateRound(data) {
    const opts = state.options;
    const team = toNumber(data.contractTeam, 0);
    const other = team === 0 ? 1 : 0;
    const totalDeal = toNumber(opts.dealTotal, 162);
    const trick = clamp(toNumber(data.takerTrickPoints, 0), 0, totalDeal);
    const defenseTrick = totalDeal - trick;
    const announcements = opts.announcements ? [toNumber(data.announcements[0], 0), toNumber(data.announcements[1], 0)] : [0, 0];
    const belote = [0, 0];
    if (opts.beloteRebelote && data.beloteTeam !== 'none') belote[toNumber(data.beloteTeam, 0)] = 20;

    if (data.capotWinner !== 'none') {
      const winner = toNumber(data.capotWinner, 0);
      data.takerTrickPoints = winner === team ? totalDeal : 0;
    }

    const contractCheck = trick + announcements[team] + belote[team];
    const success = data.capotWinner === String(team) || contractCheck >= toNumber(data.contractValue, 80);
    const multiplier = opts.mode === 'coinche' ? toNumber(data.multiplier, 1) : 1;
    let values = [0, 0];

    if (data.manual) {
      values = [toNumber(data.manualValues[0], 0), toNumber(data.manualValues[1], 0)];
    } else if (opts.mode === 'coinche') {
      if (success) {
        values[team] = trick + toNumber(data.contractValue, 80) + announcements[team] + belote[team];
        values[other] = defenseTrick + announcements[other] + belote[other];
      } else {
        values[team] = opts.failedContractBeloteKeeps ? belote[team] : 0;
        values[other] = totalDeal + toNumber(data.contractValue, 80) + announcements[0] + announcements[1] + belote[other] + (opts.failedContractBeloteKeeps ? 0 : belote[team]);
      }
      values = values.map(v => v * multiplier);
    } else {
      if (success) {
        values[team] = trick + announcements[team] + belote[team];
        values[other] = defenseTrick + announcements[other] + belote[other];
      } else {
        values[team] = opts.failedContractBeloteKeeps ? belote[team] : 0;
        values[other] = totalDeal + announcements[0] + announcements[1] + belote[other] + (opts.failedContractBeloteKeeps ? 0 : belote[team]);
      }
    }

    if (opts.roundTo10 && !data.manual) values = values.map(round10);
    return { values, success };
  }

  function openRoundModal(existingIndex = null) {
    const isEdit = existingIndex !== null;
    const existing = isEdit ? state.rounds[existingIndex] : null;
    const round = existing || {
      contractTeam: '0', contractValue: state.options.mode === 'coinche' ? 80 : 80, trump: 'clubs', multiplier: 1,
      takerTrickPoints: 82, announcements: [0, 0], beloteTeam: 'none', capotWinner: 'none', manual: false, manualValues: [0, 0]
    };
    const overlay = document.createElement('div');
    overlay.className = 'round-overlay belote-round-overlay';
    overlay.innerHTML = `
      <div class="round-modal score-round-modal belote-round-modal" role="dialog" aria-modal="true">
        <h2>${isEdit ? 'Modifier la donne' : 'Nouvelle donne'}</h2>
        <p class="score-helper">Saisis le contrat, les annonces et les points de plis. Le score est calculé automatiquement, avec possibilité de correction manuelle.</p>

        <div class="belote-round-grid">
          <label><span>Preneur</span>${teamSelect('contractTeam', round.contractTeam)}</label>
          <label><span>Contrat</span>${contractSelect(round.contractValue)}</label>
          <label><span>Atout</span>${trumpSelect(round.trump)}</label>
          ${state.options.mode === 'coinche' ? `<label><span>Coinche</span>${multiplierSelect(round.multiplier)}</label>` : ''}
          <label><span>Points de plis du preneur</span><input id="beloteTakerPoints" type="number" min="0" max="${state.options.dealTotal}" value="${escapeHTML(round.takerTrickPoints)}"></label>
          ${state.options.capot ? `<label><span>Capot</span>${capotSelect(round.capotWinner)}</label>` : ''}
        </div>

        ${state.options.announcements ? `
          <div class="belote-subpanel">
            <h3>Annonces</h3>
            <div class="belote-round-grid compact">
              <label><span>${escapeHTML(state.teams[0].name)}</span><input id="beloteAnn0" type="number" min="0" step="10" value="${escapeHTML(round.announcements?.[0] || 0)}"></label>
              <label><span>${escapeHTML(state.teams[1].name)}</span><input id="beloteAnn1" type="number" min="0" step="10" value="${escapeHTML(round.announcements?.[1] || 0)}"></label>
              ${state.options.beloteRebelote ? `<label><span>Belote/Rebelote</span>${beloteSelect(round.beloteTeam)}</label>` : ''}
            </div>
          </div>
        ` : ''}

        <label class="score-option-check belote-manual-check"><input id="beloteManual" type="checkbox" ${round.manual ? 'checked' : ''}><span>Corriger le score manuellement</span></label>
        <div class="belote-manual-values" id="beloteManualValues">
          <label><span>${escapeHTML(state.teams[0].name)}</span><input id="beloteScore0" type="number" value="${escapeHTML(round.values?.[0] || 0)}"></label>
          <label><span>${escapeHTML(state.teams[1].name)}</span><input id="beloteScore1" type="number" value="${escapeHTML(round.values?.[1] || 0)}"></label>
        </div>

        <div class="belote-preview" id="belotePreview"></div>

        <div class="round-actions">
          <button class="round-btn score-primary-action" id="saveBeloteRound">${iconMarkup('save')} Valider la donne</button>
          <button class="round-btn score-secondary" id="cancelBeloteRound">Annuler</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const updatePreview = () => {
      const data = readRoundForm(overlay);
      const calc = calculateRound(data);
      const manualBox = overlay.querySelector('#beloteManualValues');
      if (manualBox) manualBox.classList.toggle('is-visible', data.manual);
      overlay.querySelector('#belotePreview').innerHTML = `
        <strong>${calc.success ? 'Contrat réussi' : 'Contrat chuté'}</strong>
        <span>${escapeHTML(state.teams[0].name)} : ${calc.values[0]} pts</span>
        <span>${escapeHTML(state.teams[1].name)} : ${calc.values[1]} pts</span>
      `;
    };

    overlay.querySelectorAll('input, select').forEach(el => el.addEventListener('input', updatePreview));
    overlay.querySelectorAll('input, select').forEach(el => el.addEventListener('change', updatePreview));
    updatePreview();

    overlay.querySelector('#cancelBeloteRound').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#saveBeloteRound').addEventListener('click', () => {
      const data = readRoundForm(overlay);
      const calc = calculateRound(data);
      const saved = normalizeRound({ ...data, values: calc.values, success: calc.success, createdAt: existing?.createdAt || new Date().toISOString() }, existingIndex ?? state.rounds.length);
      saved.note = makeDetail(saved);
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
      contractTeam: root.querySelector('#beloteContractTeam')?.value || '0',
      contractValue: toNumber(root.querySelector('#beloteContractValue')?.value, 80),
      trump: root.querySelector('#beloteTrump')?.value || 'clubs',
      multiplier: toNumber(root.querySelector('#beloteMultiplier')?.value, 1),
      takerTrickPoints: toNumber(root.querySelector('#beloteTakerPoints')?.value, 0),
      announcements: [toNumber(root.querySelector('#beloteAnn0')?.value, 0), toNumber(root.querySelector('#beloteAnn1')?.value, 0)],
      beloteTeam: root.querySelector('#beloteBeloteTeam')?.value || 'none',
      capotWinner: root.querySelector('#beloteCapotWinner')?.value || 'none',
      manual: Boolean(root.querySelector('#beloteManual')?.checked),
      manualValues: [toNumber(root.querySelector('#beloteScore0')?.value, 0), toNumber(root.querySelector('#beloteScore1')?.value, 0)]
    };
  }

  function teamSelect(id, value) {
    return `<select id="belote${id[0].toUpperCase()}${id.slice(1)}">${state.teams.map((t, i) => `<option value="${i}" ${String(value) === String(i) ? 'selected' : ''}>${escapeHTML(t.name)} · ${escapeHTML(t.subtitle)}</option>`).join('')}</select>`;
  }

  function contractSelect(value) {
    return `<select id="beloteContractValue">${CONTRACTS.map(c => `<option value="${c}" ${toNumber(value) === c ? 'selected' : ''}>${c === 250 ? 'Capot 250' : c}</option>`).join('')}</select>`;
  }

  function trumpSelect(value) {
    return `<select id="beloteTrump">${TRUMPS.map(t => `<option value="${t.value}" ${value === t.value ? 'selected' : ''}>${escapeHTML(t.label)}</option>`).join('')}</select>`;
  }

  function multiplierSelect(value) {
    return `<select id="beloteMultiplier"><option value="1" ${toNumber(value) === 1 ? 'selected' : ''}>Normal</option><option value="2" ${toNumber(value) === 2 ? 'selected' : ''}>Coinché ×2</option><option value="4" ${toNumber(value) === 4 ? 'selected' : ''}>Surcoinché ×4</option></select>`;
  }

  function capotSelect(value) {
    return `<select id="beloteCapotWinner"><option value="none">Pas de capot</option>${state.teams.map((t, i) => `<option value="${i}" ${String(value) === String(i) ? 'selected' : ''}>Capot ${escapeHTML(t.name)}</option>`).join('')}</select>`;
  }

  function beloteSelect(value) {
    return `<select id="beloteBeloteTeam"><option value="none">Aucune</option>${state.teams.map((t, i) => `<option value="${i}" ${String(value) === String(i) ? 'selected' : ''}>${escapeHTML(t.name)}</option>`).join('')}</select>`;
  }

  function openEditModal() {
    const overlay = document.createElement('div');
    overlay.className = 'edit-overlay';
    overlay.innerHTML = `
      <div class="edit-modal score-edit-modal belote-edit-modal">
        <h2>Modifier les donnes</h2>
        ${state.rounds.length ? `
          <div class="belote-edit-list">
            ${state.rounds.map((round, index) => `
              <div class="belote-edit-row">
                <strong>D${index + 1}</strong>
                <span>${escapeHTML(state.teams[toNumber(round.contractTeam,0)].name)} · ${round.contractValue} · ${round.success ? 'réussi' : 'chuté'} · ${round.values[0]} / ${round.values[1]}</span>
                <button class="round-btn" data-edit="${index}">${iconMarkup('edit')} Modifier</button>
                <label class="score-option-check"><input type="checkbox" data-delete="${index}"><span>Supprimer</span></label>
              </div>
            `).join('')}
          </div>
        ` : '<p>Aucune donne à modifier.</p>'}
        <div class="edit-actions">
          <button class="round-btn score-primary-action" id="saveBeloteEdit">${iconMarkup('save')} Enregistrer</button>
          <button class="round-btn score-secondary" id="closeBeloteEdit">Fermer</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
      const idx = toNumber(btn.dataset.edit, 0);
      overlay.remove();
      openRoundModal(idx);
    }));
    overlay.querySelector('#closeBeloteEdit').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#saveBeloteEdit').addEventListener('click', () => {
      const deleteSet = new Set(Array.from(overlay.querySelectorAll('[data-delete]:checked')).map(input => toNumber(input.dataset.delete, -1)));
      state.rounds = state.rounds.filter((_, idx) => !deleteSet.has(idx));
      state.ended = false;
      saveState();
      overlay.remove();
      refreshGame();
    });
  }

  function maybeSuggestEnd() {
    const totals = getTotals();
    const target = toNumber(state.options.target, 1000);
    if (totals.some(total => total >= target)) openEndModal('auto');
  }

  function openEndModal(reason = 'manual') {
    state.ended = true;
    saveState();
    const totals = getTotals();
    const rows = [0, 1].sort((a, b) => totals[b] - totals[a]);
    const overlay = document.createElement('div');
    overlay.className = 'endgame-overlay';
    overlay.innerHTML = `
      <div class="endgame-modal belote-end-modal">
        <h2>${reason === 'auto' ? 'Objectif atteint' : 'Fin de partie'}</h2>
        <table class="endgame-table">
          <thead><tr><th>Rang</th><th>Équipe</th><th>Joueurs</th><th>Total</th></tr></thead>
          <tbody>${rows.map((idx, rank) => `<tr><td><span class="score-rank-badge rank-${rank + 1}">${rank + 1}</span></td><td>${escapeHTML(state.teams[idx].name)}</td><td>${escapeHTML(state.teams[idx].subtitle)}</td><td>${totals[idx]}</td></tr>`).join('')}</tbody>
        </table>
        <div class="endgame-actions">
          <button class="round-btn score-secondary" id="continueBelote">Continuer</button>
          <button class="round-btn score-primary-action" id="restartBelote">Nouvelle partie</button>
          <button class="round-btn score-secondary" id="homeBelote">Accueil</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    if (typeof confetti === 'function') confetti({ particleCount: 140, spread: 85, origin: { y: 0.6 } });
    overlay.querySelector('#continueBelote').addEventListener('click', () => { state.ended = false; saveState(); overlay.remove(); refreshGame(); });
    overlay.querySelector('#restartBelote').addEventListener('click', () => { clearState(); overlay.remove(); renderSetup(false); });
    overlay.querySelector('#homeBelote').addEventListener('click', () => { window.location.href = 'home.html'; });
  }

  function confirmNewGame() {
    const restart = () => { clearState(); renderSetup(false); };
    if (window.showConfirm) {
      window.showConfirm('Commencer une nouvelle partie ? La sauvegarde Belote/Coinche actuelle sera effacée.', restart, null, {
        title: 'Nouvelle partie', yesLabel: 'Nouvelle partie', yesIcon: 'refresh', noLabel: 'Annuler'
      });
    } else if (confirm('Commencer une nouvelle partie ?')) restart();
  }
}
