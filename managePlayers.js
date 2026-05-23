// managePlayers.js — V0.6.5
// Gestion joueurs : actions visibles + fermeture par icon-close.png.

const avatarList = Array.from({ length: 24 }, (_, i) => `avatar${i + 1}.png`);
const AVATAR_PATH = 'assets/avatars/';
const MANAGE_PLAYERS_ICON_PATH = 'assets/icons/';
const managePlayersIcon = name => {
  return `<img class="ui-icon" src="${MANAGE_PLAYERS_ICON_PATH}icon-${name}.png" alt="" loading="lazy">`;
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  const manageBtn = document.getElementById('managePlayersButton');
  const popup = document.getElementById('playerPopup');
  const popupContent = document.querySelector('#playerPopup .popupContent');

  if (!(manageBtn instanceof HTMLElement) || !(popup instanceof HTMLElement) || !(popupContent instanceof HTMLElement)) {
    console.error('managePlayers.js : éléments de gestion joueurs manquants.');
    return;
  }

  let players = loadPlayers();
  let modalState = {
    mode: 'create',
    editIndex: null,
    selectedAvatar: null,
  };

  function loadPlayers() {
    try {
      const parsed = JSON.parse(localStorage.getItem('players')) || [];
      return parsed.filter(p => p && typeof p.name === 'string');
    } catch {
      return [];
    }
  }

  function savePlayers() {
    localStorage.setItem('players', JSON.stringify(players));
  }

  function openManager() {
    players = loadPlayers();
    renderManager();
    popup.style.display = 'flex';
    document.body.classList.add('modal-open');
  }

  function closeManager() {
    popup.style.display = 'none';
    document.body.classList.remove('modal-open');
  }

  function renderManager() {
    popupContent.className = 'popupContent players-manager-shell';
    const count = players.length;
    popupContent.innerHTML = `
      <div class="players-manager-header">
        <div>
          <p class="modal-kicker">Joueurs enregistrés</p>
          <h3>Gestion des joueurs</h3>
          <p class="players-manager-subtitle">${count} joueur${count > 1 ? 's' : ''} dans la taverne.</p>
        </div>
        <button type="button" id="closePlayersManager" class="players-icon-btn" aria-label="Fermer">${managePlayersIcon('close')}</button>
      </div>

      <div class="players-manager-toolbar">
        <button type="button" id="createPlayerButton" class="players-create-btn">${managePlayersIcon('add')} Créer un nouveau joueur</button>
      </div>

      <div id="playersList" class="players-list-modern">
        ${renderPlayersList()}
      </div>
    `;

    popupContent.querySelector('#closePlayersManager').addEventListener('click', closeManager);
    popupContent.querySelector('#createPlayerButton').addEventListener('click', () => openPlayerForm());

    popupContent.querySelectorAll('[data-edit-player]').forEach(btn => {
      btn.addEventListener('click', () => openPlayerForm(Number(btn.dataset.editPlayer)));
    });

    popupContent.querySelectorAll('[data-delete-player]').forEach(btn => {
      btn.addEventListener('click', () => deletePlayer(Number(btn.dataset.deletePlayer)));
    });
  }

  function renderPlayersList() {
    if (!players.length) {
      return `
        <div class="players-empty-state">
          <strong>Aucun joueur enregistré.</strong>
          <span>Crée ton premier joueur avec un nom et un avatar.</span>
        </div>
      `;
    }

    return players.map((player, index) => {
      const safeName = escapeHtml(player.name);
      const avatar = escapeHtml(player.avatar || 'avatar24.png');
      return `
        <article class="player-row-card">
          <div class="player-row-identity">
            <img src="${AVATAR_PATH}${avatar}" alt="" loading="lazy">
            <div>
              <strong>${safeName}</strong>
              <span>Joueur enregistré</span>
            </div>
          </div>
          <div class="player-row-actions">
            <button type="button" class="players-small-btn" data-edit-player="${index}">${managePlayersIcon('edit')} Modifier</button>
            <button type="button" class="players-small-btn players-danger-btn" data-delete-player="${index}">${managePlayersIcon('trash')} Supprimer</button>
          </div>
        </article>
      `;
    }).join('');
  }

  function openPlayerForm(index = null) {
    const isEdit = Number.isInteger(index);
    const player = isEdit ? players[index] : null;

    modalState = {
      mode: isEdit ? 'edit' : 'create',
      editIndex: isEdit ? index : null,
      selectedAvatar: player?.avatar || null,
    };

    const overlay = document.createElement('div');
    overlay.className = 'player-form-overlay';
    overlay.innerHTML = `
      <div class="player-form-modal" role="dialog" aria-modal="true">
        <div class="player-form-header">
          <div>
            <p class="modal-kicker">${isEdit ? 'Modifier' : 'Nouveau joueur'}</p>
            <h2>${isEdit ? 'Modifier le joueur' : 'Créer un joueur'}</h2>
            <p>Choisis un nom et un avatar. Le joueur sera disponible dans tous les jeux.</p>
          </div>
          <button type="button" class="players-icon-btn" data-close-player-form aria-label="Fermer">${managePlayersIcon('close')}</button>
        </div>

        <div id="playerFormError" class="error-message" style="display:none;"></div>

        <label class="player-form-field">
          <span>Nom du joueur</span>
          <input type="text" id="playerFormName" maxlength="24" placeholder="Ex : Parkaf" value="${escapeHtml(player?.name || '')}">
        </label>

        <div class="player-form-avatar-title">Avatar</div>
        <div id="playerFormAvatars" class="avatar-picker-grid">
          ${avatarList.map(file => `
            <button type="button" class="avatar-picker-option ${file === modalState.selectedAvatar ? 'selected' : ''}" data-avatar="${file}">
              <img src="${AVATAR_PATH}${file}" alt="">
            </button>
          `).join('')}
        </div>

        <div class="player-form-actions">
          <button type="button" class="round-btn secondary-action" data-close-player-form>Annuler</button>
          <button type="button" class="round-btn score-primary-action" id="validatePlayerForm">${managePlayersIcon('save')} ${isEdit ? 'Enregistrer' : 'Créer le joueur'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.classList.add('modal-open');

    const nameInput = overlay.querySelector('#playerFormName');
    const errorBox = overlay.querySelector('#playerFormError');
    const closeForm = () => {
      overlay.remove();
      if (popup.style.display !== 'flex') document.body.classList.remove('modal-open');
    };

    overlay.querySelectorAll('[data-close-player-form]').forEach(btn => btn.addEventListener('click', closeForm));
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeForm();
    });

    overlay.querySelectorAll('[data-avatar]').forEach(btn => {
      btn.addEventListener('click', () => {
        modalState.selectedAvatar = btn.dataset.avatar;
        overlay.querySelectorAll('[data-avatar]').forEach(item => item.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    overlay.querySelector('#validatePlayerForm').addEventListener('click', () => {
      const name = nameInput.value.trim();
      const error = validatePlayer(name, modalState.selectedAvatar, modalState.editIndex);
      if (error) {
        errorBox.textContent = error;
        errorBox.style.display = 'block';
        return;
      }

      const data = { name, avatar: modalState.selectedAvatar };
      if (modalState.mode === 'edit') {
        players[modalState.editIndex] = data;
      } else {
        players.push(data);
      }

      savePlayers();
      closeForm();
      renderManager();
    });

    setTimeout(() => nameInput.focus(), 50);
  }

  function validatePlayer(name, avatar, editIndex) {
    if (!name) return 'Le nom du joueur est obligatoire.';
    if (!avatar) return 'Choisis un avatar pour ce joueur.';
    const duplicate = players.some((player, index) => (
      index !== editIndex && player.name.trim().toLowerCase() === name.toLowerCase()
    ));
    if (duplicate) return 'Ce nom existe déjà.';
    return '';
  }

  function deletePlayer(index) {
    const player = players[index];
    if (!player) return;

    const remove = () => {
      players.splice(index, 1);
      savePlayers();
      renderManager();
    };

    if (typeof window.showConfirm === 'function') {
      window.showConfirm(`Supprimer ${player.name} ?`, remove);
    } else if (confirm(`Supprimer ${player.name} ?`)) {
      remove();
    }
  }

  manageBtn.addEventListener('click', openManager);
  popup.addEventListener('click', event => {
    if (event.target === popup) closeManager();
  });
});
