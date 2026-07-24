import express from 'express';
import Game from '../models/Game.js';
import PlayerGameStats from '../models/PlayerGameStats.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const games = await Game.find().sort({ date: -1 });
    const counts = await PlayerGameStats.aggregate([{ $group: { _id: '$game', count: { $sum: 1 } } }]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.count]));

    res.json(
      games.map((g) => ({
        ...g.toObject(),
        playerCount: countMap[g._id.toString()] || 0,
      }))
    );
  })
);

router.get('/:id', async (req, res) => {
  const game = await Game.findById(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game);
});

router.post('/', async (req, res) => {
  const game = await Game.create(req.body);
  res.status(201).json(game);
});

router.put('/:id', async (req, res) => {
  const game = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!game) return res.status(404).json({ error: 'Game not found' });
  res.json(game);
});

router.delete('/:id', async (req, res) => {
  const game = await Game.findByIdAndDelete(req.params.id);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  await PlayerGameStats.deleteMany({ game: game._id });
  res.json({ success: true });
});

export default router;
