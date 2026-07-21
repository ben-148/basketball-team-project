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

export const api = {
  players: {
    list: () => request('/players'),
    get: (id) => request(`/players/${id}`),
    leaderboard: () => request('/players/leaderboard'),
    create: (data) => request('/players', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/players/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/players/${id}`, { method: 'DELETE' }),
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
    increment: (playerId, miniGameId, field, delta) =>
      request('/mini-game-stats/increment', {
        method: 'POST',
        body: JSON.stringify({ playerId, miniGameId, field, delta }),
      }),
  },
  videos: {
    list: (playerId) => request(`/videos${playerId ? `?player=${playerId}` : ''}`),
    create: (data) => request('/videos', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/videos/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id) => request(`/videos/${id}`, { method: 'DELETE' }),
  },
};
