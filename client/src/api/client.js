const BASE_URL = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// For multipart/form-data uploads — no Content-Type header (the browser sets the boundary itself)
// and no JSON body serialization.
async function uploadRequest(path, formData) {
  const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  players: {
    list: () => request('/players'),
    get: (id) => request(`/players/${id}`),
    leaderboard: () => request('/players/leaderboard'),
    create: (data) => request('/players', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/players/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/players/${id}`, { method: 'DELETE' }),
    uploadPhoto: (file) => {
      const formData = new FormData();
      formData.append('photo', file);
      return uploadRequest('/players/upload-photo', formData);
    },
  },
  games: {
    list: () => request('/games'),
    get: (id) => request(`/games/${id}`),
  },
  legacyStats: {
    forGame: (gameId) => request(`/stats/game/${gameId}`),
  },
  sessions: {
    list: () => request('/sessions'),
    get: (id) => request(`/sessions/${id}`),
    create: (data) => request('/sessions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),
    lockedPlayers: (id) => request(`/sessions/${id}/locked-players`),
  },
  miniGames: {
    create: (sessionId) => request('/minigames', { method: 'POST', body: JSON.stringify({ sessionId }) }),
    remove: (id) => request(`/minigames/${id}`, { method: 'DELETE' }),
    finish: (id) => request(`/minigames/${id}/finish`, { method: 'POST' }),
    reopen: (id) => request(`/minigames/${id}/reopen`, { method: 'POST' }),
  },
  miniGameStats: {
    forMiniGame: (miniGameId) => request(`/mini-game-stats/minigame/${miniGameId}`),
    assign: (playerId, miniGameId, team) =>
      request('/mini-game-stats/assign', { method: 'POST', body: JSON.stringify({ playerId, miniGameId, team }) }),
    unassign: (playerId, miniGameId) =>
      request('/mini-game-stats/unassign', { method: 'POST', body: JSON.stringify({ playerId, miniGameId }) }),
    save: (playerId, miniGameId, stats) =>
      request('/mini-game-stats/save', {
        method: 'POST',
        body: JSON.stringify({ playerId, miniGameId, stats }),
      }),
  },
  videos: {
    list: (playerId) => request(`/videos${playerId ? `?player=${playerId}` : ''}`),
    create: (data) => request('/videos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/videos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/videos/${id}`, { method: 'DELETE' }),
  },
  import: {
    extract: (file) => {
      const formData = new FormData();
      formData.append('pdf', file);
      return uploadRequest('/import/extract', formData);
    },
    checkDate: (date) => request(`/import/check-date?date=${encodeURIComponent(date)}`),
    confirm: (date, rows) =>
      request('/import/confirm', { method: 'POST', body: JSON.stringify({ date, rows }) }),
    listAliases: () => request('/import/aliases'),
    addAlias: (alias, playerId) =>
      request('/import/aliases', { method: 'POST', body: JSON.stringify({ alias, playerId }) }),
    removeAlias: (id) => request(`/import/aliases/${id}`, { method: 'DELETE' }),
  },
};
