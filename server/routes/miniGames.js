import express from 'express';
import MiniGame from '../models/MiniGame.js';
import PlayerMiniGameStats from '../models/PlayerMiniGameStats.js';
import { TEAMS } from '../constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { sessionId } = req.body;
    const miniGame = await MiniGame.create({ session: sessionId });
    res.status(201).json(miniGame);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const miniGame = await MiniGame.findByIdAndDelete(req.params.id);
    if (!miniGame) return res.status(404).json({ error: 'MiniGame not found' });
    await PlayerMiniGameStats.deleteMany({ miniGame: miniGame._id });
    res.json({ success: true });
  })
);

// Finishes a mini-game: awards +1 win to every player on the higher-scoring team (no award on a tie),
// then locks the mini-game against further stat/roster changes.
router.post(
  '/:id/finish',
  asyncHandler(async (req, res) => {
    const miniGame = await MiniGame.findById(req.params.id);
    if (!miniGame) return res.status(404).json({ error: 'MiniGame not found' });
    if (miniGame.finished) return res.status(400).json({ error: 'Mini-game is already finished' });

    let winner = null;
    if (miniGame.raskoScore > miniGame.shoshanatScore) winner = TEAMS[0];
    else if (miniGame.shoshanatScore > miniGame.raskoScore) winner = TEAMS[1];

    if (winner) {
      await PlayerMiniGameStats.updateMany({ miniGame: miniGame._id, team: winner }, { $inc: { wins: 1 } });
    }

    miniGame.finished = true;
    await miniGame.save();

    res.json({ miniGame, winner });
  })
);

// Reopens a finished mini-game for editing: reverts the win it awarded (based on its score at the
// time, which can't have changed while locked) and unlocks it. Re-finishing recomputes the winner.
router.post(
  '/:id/reopen',
  asyncHandler(async (req, res) => {
    const miniGame = await MiniGame.findById(req.params.id);
    if (!miniGame) return res.status(404).json({ error: 'MiniGame not found' });
    if (!miniGame.finished) return res.status(400).json({ error: 'Mini-game is not finished' });

    let winner = null;
    if (miniGame.raskoScore > miniGame.shoshanatScore) winner = TEAMS[0];
    else if (miniGame.shoshanatScore > miniGame.raskoScore) winner = TEAMS[1];

    if (winner) {
      await PlayerMiniGameStats.updateMany(
        { miniGame: miniGame._id, team: winner, wins: { $gt: 0 } },
        { $inc: { wins: -1 } }
      );
    }

    miniGame.finished = false;
    await miniGame.save();

    res.json({ miniGame });
  })
);

export default router;
