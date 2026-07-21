import express from 'express';
import Video from '../models/Video.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.player) filter.player = req.query.player;
  const videos = await Video.find(filter).populate('player').sort({ createdAt: -1 });
  res.json(videos);
});

router.post('/', async (req, res) => {
  const payload = { ...req.body };
  if (!payload.player) payload.player = null;
  const video = await Video.create(payload);
  res.status(201).json(video);
});

router.put('/:id', async (req, res) => {
  const payload = { ...req.body };
  if (!payload.player) payload.player = null;
  const video = await Video.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!video) return res.status(404).json({ error: 'Video not found' });
  res.json(video);
});

router.delete('/:id', async (req, res) => {
  const video = await Video.findByIdAndDelete(req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });
  res.json({ success: true });
});

export default router;
