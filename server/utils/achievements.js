import Session from '../models/Session.js';
import MiniGame from '../models/MiniGame.js';
import PlayerMiniGameStats from '../models/PlayerMiniGameStats.js';
import Game from '../models/Game.js';
import PlayerGameStats from '../models/PlayerGameStats.js';

// Categories that count toward הצטיינויות ("achievements") — matches the star (⭐) / trophy (🏆)
// fields used elsewhere. Turnovers, bench count, and games played never count.
export const ACHIEVEMENT_FIELDS = ['points', 'rebounds', 'assists', 'steals', 'wins'];

function emptyTotals() {
  return Object.fromEntries(ACHIEVEMENT_FIELDS.map((f) => [f, 0]));
}

// Walks every session (mini-games grouped together) and every legacy game, in chronological
// order, to build the full career history of "who led what". From this we derive:
//   - achievementsCount: total times each player led a category across their career (ties count
//     for every tied player, and a player leading multiple categories in one evening counts once
//     per category).
//   - firstAchievementKey: for each `${playerId}:${field}`, the event key (`session:<id>` or
//     `legacy:<id>`) of the earliest time that player ever led that category — used to tell
//     whether a given session lead is a career first.
//   - eventLeaderFields: for each event key, which fields each player led in that specific
//     session/game — lets a route look up "what did this player lead in THIS session" without
//     recomputing maxes itself.
export async function computeCareerAchievements() {
  const [sessions, miniGames, miniGameStats, games, gameStats] = await Promise.all([
    Session.find().select('_id date'),
    MiniGame.find().select('_id session'),
    PlayerMiniGameStats.find().select('player miniGame points rebounds assists steals wins'),
    Game.find().select('_id date'),
    PlayerGameStats.find().select('player game points rebounds assists steals wins'),
  ]);

  const miniGameToSession = new Map(miniGames.map((m) => [m._id.toString(), m.session.toString()]));

  const sessionTotals = new Map(); // sessionId -> Map(playerId -> totals)
  for (const s of miniGameStats) {
    const sessionId = miniGameToSession.get(s.miniGame.toString());
    if (!sessionId) continue;
    if (!sessionTotals.has(sessionId)) sessionTotals.set(sessionId, new Map());
    const playersMap = sessionTotals.get(sessionId);
    const playerId = s.player.toString();
    if (!playersMap.has(playerId)) playersMap.set(playerId, emptyTotals());
    const totals = playersMap.get(playerId);
    for (const f of ACHIEVEMENT_FIELDS) totals[f] += s[f] || 0;
  }

  const gameTotals = new Map(); // gameId -> Map(playerId -> totals)
  for (const s of gameStats) {
    const gameId = s.game.toString();
    if (!gameTotals.has(gameId)) gameTotals.set(gameId, new Map());
    const playersMap = gameTotals.get(gameId);
    const playerId = s.player.toString();
    if (!playersMap.has(playerId)) playersMap.set(playerId, emptyTotals());
    const totals = playersMap.get(playerId);
    for (const f of ACHIEVEMENT_FIELDS) totals[f] += s[f] || 0;
  }

  const timeline = [
    ...sessions.map((s) => ({ key: `session:${s._id}`, date: s.date, playersMap: sessionTotals.get(s._id.toString()) })),
    ...games.map((g) => ({ key: `legacy:${g._id}`, date: g.date, playersMap: gameTotals.get(g._id.toString()) })),
  ]
    .filter((e) => e.playersMap && e.playersMap.size > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const achievementsCount = new Map();
  const firstAchievementKey = new Map();
  const eventLeaderFields = new Map();

  for (const event of timeline) {
    const maxes = emptyTotals();
    for (const totals of event.playersMap.values()) {
      for (const f of ACHIEVEMENT_FIELDS) if (totals[f] > maxes[f]) maxes[f] = totals[f];
    }

    const leaderFieldsForEvent = new Map();
    for (const [playerId, totals] of event.playersMap) {
      const fields = ACHIEVEMENT_FIELDS.filter((f) => maxes[f] > 0 && totals[f] === maxes[f]);
      if (fields.length === 0) continue;
      leaderFieldsForEvent.set(playerId, fields);

      achievementsCount.set(playerId, (achievementsCount.get(playerId) || 0) + fields.length);

      for (const f of fields) {
        const mapKey = `${playerId}:${f}`;
        if (!firstAchievementKey.has(mapKey)) firstAchievementKey.set(mapKey, event.key);
      }
    }
    eventLeaderFields.set(event.key, leaderFieldsForEvent);
  }

  return { achievementsCount, firstAchievementKey, eventLeaderFields };
}
