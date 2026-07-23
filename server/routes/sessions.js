import express from 'express';
import Session from '../models/Session.js';
import MiniGame from '../models/MiniGame.js';
import PlayerMiniGameStats from '../models/PlayerMiniGameStats.js';
import Player from '../models/Player.js';
import { STAT_FIELDS, BENCH } from '../constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Players who have at least one PlayerMiniGameStats record (any team, including Bench) in any
// mini-game belonging to this session — these players can't be removed from the roster without
// losing real recorded data, so the admin UI locks them.
async function getPlayersWithStatsInSession(sessionId) {
  const miniGames = await MiniGame.find({ session: sessionId }).select('_id');
  const miniGameIds = miniGames.map((m) => m._id);
  if (miniGameIds.length === 0) return new Set();
  const statsRecords = await PlayerMiniGameStats.find({ miniGame: { $in: miniGameIds } }).select('player');
  return new Set(statsRecords.map((s) => s.player.toString()));
}

router.get('/', async (req, res) => {
  const sessions = await Session.find().sort({ date: -1 });
  const counts = await MiniGame.aggregate([{ $group: { _id: '$session', count: { $sum: 1 } } }]);
  const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

  res.json(
    sessions.map((s) => ({
      ...s.toObject(),
      miniGameCount: countMap[s._id.toString()] || 0,
    }))
  );
});

router.get('/:id', async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const miniGames = await MiniGame.find({ session: session._id }).sort({ createdAt: 1 });
  const miniGameIds = miniGames.map((m) => m._id);
  const allStats = await PlayerMiniGameStats.find({ miniGame: { $in: miniGameIds } }).populate('player');

  const statsByMiniGame = new Map(miniGameIds.map((id) => [id.toString(), []]));
  for (const s of allStats) {
    statsByMiniGame.get(s.miniGame.toString()).push(s);
  }

  const miniGamesOut = miniGames.map((mg) => {
    const rows = statsByMiniGame.get(mg._id.toString()) || [];
    const teams = { 'Rasko Team': [], 'Shoshanat HaAmakin Team': [], [BENCH]: [] };
    for (const s of rows) {
      if (!teams[s.team]) continue;
      teams[s.team].push({
        player: s.player,
        stats: {
          _id: s._id,
          points: s.points,
          rebounds: s.rebounds,
          assists: s.assists,
          steals: s.steals,
          turnovers: s.turnovers,
          wins: s.wins,
        },
      });
    }
    return { miniGame: mg, teams };
  });

  const summaryMap = new Map();
  for (const s of allStats) {
    const key = s.player._id.toString();
    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        player: s.player,
        totals: STAT_FIELDS.reduce((acc, f) => ({ ...acc, [f]: 0 }), {}),
        benchCount: 0,
        miniGamesPlayed: 0,
      });
    }
    const entry = summaryMap.get(key);
    if (s.team === BENCH) {
      entry.benchCount += 1;
    } else {
      entry.miniGamesPlayed += 1;
      for (const f of STAT_FIELDS) entry.totals[f] += s[f];
    }
  }

  const summary = Array.from(summaryMap.values()).sort((a, b) => b.totals.points - a.totals.points);

  res.json({ session, miniGames: miniGamesOut, summary });
});

// Player IDs that can't be removed from this session's roster because they already have
// recorded stats in one of its mini-games.
router.get(
  '/:id/locked-players',
  asyncHandler(async (req, res) => {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const lockedIds = await getPlayersWithStatsInSession(session._id);
    res.json({ lockedPlayerIds: Array.from(lockedIds) });
  })
);

router.post('/', async (req, res) => {
  const session = await Session.create(req.body);
  res.status(201).json(session);
});

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await Session.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Session not found' });

    if (Array.isArray(req.body.roster)) {
      const newRosterIds = new Set(req.body.roster.map(String));
      const removedPlayerIds = (existing.roster || []).map(String).filter((id) => !newRosterIds.has(id));

      if (removedPlayerIds.length > 0) {
        const lockedIds = await getPlayersWithStatsInSession(existing._id);
        const blockedIds = removedPlayerIds.filter((id) => lockedIds.has(id));

        if (blockedIds.length > 0) {
          const blockedPlayers = await Player.find({ _id: { $in: blockedIds } });
          const names = blockedPlayers.map((p) => p.name).join(', ');
          return res.status(400).json({
            error: `Cannot remove player(s) with existing stats in this session's mini-games: ${names}`,
          });
        }
      }
    }

    const session = await Session.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(session);
  })
);

router.delete('/:id', async (req, res) => {
  const session = await Session.findByIdAndDelete(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const miniGames = await MiniGame.find({ session: session._id });
  const miniGameIds = miniGames.map((m) => m._id);
  await PlayerMiniGameStats.deleteMany({ miniGame: { $in: miniGameIds } });
  await MiniGame.deleteMany({ session: session._id });

  res.json({ success: true });
});

export default router;
