import express from 'express';
import Player from '../models/Player.js';
import PlayerGameStats from '../models/PlayerGameStats.js';
import PlayerMiniGameStats from '../models/PlayerMiniGameStats.js';
import Video from '../models/Video.js';
import { BENCH } from '../constants.js';
import { createStatTotals } from '../utils/statTotals.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const players = await Player.find().sort({ name: 1 });
  res.json(players);
});

// Career totals for every player, merging legacy PlayerGameStats and new PlayerMiniGameStats.
router.get('/leaderboard', async (req, res) => {
  const players = await Player.find().sort({ name: 1 });
  const legacyDocs = await PlayerGameStats.find().populate('game');
  const miniGameDocs = await PlayerMiniGameStats.find().populate({
    path: 'miniGame',
    populate: { path: 'session' },
  });

  const rowsByPlayer = new Map(
    players.map((p) => [
      p._id.toString(),
      {
        player: p,
        statTotals: createStatTotals(),
        gamesPlayed: 0,
        benchCount: 0,
      },
    ])
  );

  for (const s of legacyDocs) {
    if (!s.game) continue;
    const row = rowsByPlayer.get(s.player.toString());
    if (!row) continue;
    row.gamesPlayed += 1;
    row.statTotals.add(s);
  }

  for (const s of miniGameDocs) {
    if (!s.miniGame || !s.miniGame.session) continue;
    const row = rowsByPlayer.get(s.player.toString());
    if (!row) continue;
    if (s.team === BENCH) {
      row.benchCount += 1;
      continue;
    }
    row.gamesPlayed += 1;
    row.statTotals.add(s);
  }

  res.json(
    Array.from(rowsByPlayer.values()).map((row) => ({
      player: row.player,
      totals: row.statTotals.finalize(row.gamesPlayed),
      gamesPlayed: row.gamesPlayed,
      benchCount: row.benchCount,
    }))
  );
});

router.get('/:id', async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });

  const legacyDocs = await PlayerGameStats.find({ player: player._id }).populate('game');
  const miniGameDocs = await PlayerMiniGameStats.find({ player: player._id }).populate({
    path: 'miniGame',
    populate: { path: 'session' },
  });

  const legacyRows = legacyDocs
    .filter((s) => s.game)
    .map((s) => ({
      _id: s._id,
      type: 'legacy',
      date: s.game.date,
      team: 'N/A',
      raskoScore: s.game.raskoScore,
      shoshanatScore: s.game.shoshanatScore,
      gameId: s.game._id,
      points: s.points,
      rebounds: s.rebounds,
      assists: s.assists,
      steals: s.steals,
      turnovers: s.turnovers,
      wins: s.wins,
    }));

  const miniGameRows = miniGameDocs
    .filter((s) => s.miniGame && s.miniGame.session)
    .map((s) => ({
      _id: s._id,
      type: 'minigame',
      date: s.miniGame.session.date,
      team: s.team,
      raskoScore: s.miniGame.raskoScore,
      shoshanatScore: s.miniGame.shoshanatScore,
      sessionId: s.miniGame.session._id,
      miniGameId: s.miniGame._id,
      points: s.points,
      rebounds: s.rebounds,
      assists: s.assists,
      steals: s.steals,
      turnovers: s.turnovers,
      wins: s.wins,
    }));

  const gameLog = [...legacyRows, ...miniGameRows].sort((a, b) => new Date(b.date) - new Date(a.date));

  const statTotals = createStatTotals();
  let gamesPlayed = 0;
  let benchCount = 0;
  for (const row of gameLog) {
    if (row.type === 'minigame' && row.team === BENCH) {
      benchCount += 1;
      continue;
    }
    gamesPlayed += 1;
    statTotals.add(row);
  }
  const lifetime = statTotals.finalize(gamesPlayed);
  lifetime.gamesPlayed = gamesPlayed;
  lifetime.benchCount = benchCount;

  const videos = await Video.find({ player: player._id }).sort({ createdAt: -1 });

  res.json({ player, lifetime, gameLog, videos });
});

router.post('/', async (req, res) => {
  const player = await Player.create(req.body);
  res.status(201).json(player);
});

router.put('/:id', async (req, res) => {
  const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!player) return res.status(404).json({ error: 'Player not found' });
  res.json(player);
});

router.delete('/:id', async (req, res) => {
  const player = await Player.findByIdAndDelete(req.params.id);
  if (!player) return res.status(404).json({ error: 'Player not found' });
  await PlayerGameStats.deleteMany({ player: player._id });
  await PlayerMiniGameStats.deleteMany({ player: player._id });
  await Video.updateMany({ player: player._id }, { $set: { player: null } });
  res.json({ success: true });
});

export default router;
