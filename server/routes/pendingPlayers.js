import express from 'express';
import PendingPlayer from '../models/PendingPlayer.js';
import Player from '../models/Player.js';
import PlayerGameStats from '../models/PlayerGameStats.js';
import { TEAMS } from '../constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.get(
  '/game/:gameId',
  asyncHandler(async (req, res) => {
    const pending = await PendingPlayer.find({ game: req.params.gameId }).sort({ createdAt: 1 });
    res.json(pending);
  })
);

// Assigns a pending row to an existing player: creates their PlayerGameStats (defaulting to the
// first team, same as a matched-on-import row — the admin can move them via the legacy session
// edit page) and removes the pending row.
router.post(
  '/:id/assign',
  asyncHandler(async (req, res) => {
    const { playerId } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId is required' });

    const pending = await PendingPlayer.findById(req.params.id);
    if (!pending) return res.status(404).json({ error: 'Pending player not found' });

    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const stats = await PlayerGameStats.create({
      player: player._id,
      game: pending.game,
      team: TEAMS[0],
      points: pending.points,
      rebounds: pending.rebounds,
      assists: pending.assists,
      steals: pending.steals,
      turnovers: pending.turnovers,
      wins: pending.wins,
    });

    await pending.deleteOne();

    res.json({ player, stats });
  })
);

// Creates a brand-new player from a pending row's filename and assigns it in one step.
router.post(
  '/:id/create-and-assign',
  asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

    const pending = await PendingPlayer.findById(req.params.id);
    if (!pending) return res.status(404).json({ error: 'Pending player not found' });

    const player = await Player.create({ name: name.trim() });

    const stats = await PlayerGameStats.create({
      player: player._id,
      game: pending.game,
      team: TEAMS[0],
      points: pending.points,
      rebounds: pending.rebounds,
      assists: pending.assists,
      steals: pending.steals,
      turnovers: pending.turnovers,
      wins: pending.wins,
    });

    await pending.deleteOne();

    res.json({ player, stats });
  })
);

export default router;
