import express from 'express';
import Player from '../models/Player.js';
import PlayerGameStats from '../models/PlayerGameStats.js';
import { TEAMS, STAT_FIELDS } from '../constants.js';

const router = express.Router();

// Returns the roster for a game split by team, plus players not yet assigned to either team.
router.get('/game/:gameId', async (req, res) => {
  const allPlayers = await Player.find().sort({ name: 1 });
  const assigned = await PlayerGameStats.find({ game: req.params.gameId }).populate('player');

  const assignedIds = new Set(assigned.map((s) => s.player._id.toString()));

  const teams = {};
  for (const team of TEAMS) teams[team] = [];

  for (const s of assigned) {
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

  const unassigned = allPlayers.filter((p) => !assignedIds.has(p._id.toString()));

  res.json({ teams, unassigned });
});

// Assigns a player to a team for a game, creating a zeroed stat row if one doesn't exist yet.
router.post('/assign', async (req, res) => {
  const { playerId, gameId, team } = req.body;

  if (!TEAMS.includes(team)) {
    return res.status(400).json({ error: `Invalid team: ${team}` });
  }

  const doc = await PlayerGameStats.findOneAndUpdate(
    { player: playerId, game: gameId },
    { $set: { team }, $setOnInsert: { player: playerId, game: gameId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  res.json(doc);
});

// Removes a player from a game entirely (deletes their stat row).
router.post('/unassign', async (req, res) => {
  const { playerId, gameId } = req.body;
  await PlayerGameStats.findOneAndDelete({ player: playerId, game: gameId });
  res.json({ success: true });
});

// Increments (or decrements) a single stat field for a player already assigned to a team in a game.
router.post('/increment', async (req, res) => {
  const { playerId, gameId, field, delta } = req.body;

  if (!STAT_FIELDS.includes(field)) {
    return res.status(400).json({ error: `Invalid field: ${field}` });
  }
  const step = Number(delta) === -1 ? -1 : 1;

  const doc = await PlayerGameStats.findOne({ player: playerId, game: gameId });
  if (!doc) {
    return res.status(404).json({ error: 'Player is not assigned to a team for this game yet' });
  }

  doc[field] = Math.max(0, doc[field] + step);
  await doc.save();

  res.json(doc);
});

export default router;
