// saveManager.js

function saveGame(gameName, data) {
    if (!gameName || !data) return;
    localStorage.setItem(`taverne_${gameName}`, JSON.stringify(data));
}

function loadGame(gameName) {
    if (!gameName) return [];
    const saved = localStorage.getItem(`taverne_${gameName}`);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Erreur de chargement :', e);
            return [];
        }
    }
    return [];
}
