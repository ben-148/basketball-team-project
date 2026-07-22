import express from 'express';
import Player from '../models/Player.js';
import MiniGame from '../models/MiniGame.js';
import Session from '../models/Session.js';
import PlayerMiniGameStats from '../models/PlayerMiniGameStats.js';
import { TEAMS, MINI_GAME_TEAMS, STAT_FIELDS, BENCH } from '../constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

const MAX_TEAM_SIZE = 3;

async function requireActiveMiniGame(id, res) {
  const miniGame = await MiniGame.findById(id);
  if (!miniGame) {
    res.status(404).json({ error: 'MiniGame not found' });
    return null;
  }
  if (miniGame.finished) {
    res.status(400).json({ error: 'Mini-game is finished' });
    return null;
  }
  return miniGame;
}

async function recalcScore(miniGameId) {
  const docs = await PlayerMiniGameStats.find({ miniGame: miniGameId });
  let raskoScore = 0;
  let shoshanatScore = 0;
  for (const d of docs) {
    if (d.team === TEAMS[0]) raskoScore += d.points;
    else if (d.team === TEAMS[1]) shoshanatScore += d.points;
  }
  await MiniGame.findByIdAndUpdate(miniGameId, { raskoScore, shoshanatScore });
  return { raskoScore, shoshanatScore };
}

// Returns the roster for a mini-game split by team (including Bench), plus players not yet assigned.
// The "not yet assigned" pool is limited to the session's roster, if one was set (older sessions with
// no roster fall back to the full player list).
router.get(
  '/minigame/:miniGameId',
  asyncHandler(async (req, res) => {
    const miniGame = await MiniGame.findById(req.params.miniGameId);
    if (!miniGame) return res.status(404).json({ error: 'MiniGame not found' });

    const session = await Session.findById(miniGame.session);
    const rosterIds = session && session.roster.length > 0 ? new Set(session.roster.map(String)) : null;

    const allPlayers = await Player.find().sort({ name: 1 });
    const pool = rosterIds ? allPlayers.filter((p) => rosterIds.has(p._id.toString())) : allPlayers;

    const assigned = await PlayerMiniGameStats.find({ miniGame: req.params.miniGameId }).populate('player');

    const assignedIds = new Set(assigned.map((s) => s.player._id.toString()));
    const teams = { 'Rasko Team': [], 'Shoshanat HaAmakin Team': [], [BENCH]: [] };

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

    const unassigned = pool.filter((p) => !assignedIds.has(p._id.toString()));

    res.json({ teams, unassigned });
  })
);

// Assigns a player to a team (or Bench) for a mini-game. Bench players are always zeroed out.
// Rasko/Shoshanat teams are capped at MAX_TEAM_SIZE players; Bench has no limit.
router.post(
  '/assign',
  asyncHandler(async (req, res) => {
    const { playerId, miniGameId, team } = req.body;

    if (!MINI_GAME_TEAMS.includes(team)) {
      return res.status(400).json({ error: `Invalid team: ${team}` });
    }

    const miniGame = await requireActiveMiniGame(miniGameId, res);
    if (!miniGame) return;

    const existing = await PlayerMiniGameStats.findOne({ player: playerId, miniGame: miniGameId });

    if (!existing) {
      const session = await Session.findById(miniGame.session);
      if (session && session.roster.length > 0) {
        const inRoster = session.roster.some((id) => id.toString() === playerId);
        if (!inRoster) {
          return res.status(400).json({ error: 'Player is not on this session\'s roster' });
        }
      }
    }

    if (team !== BENCH) {
      const alreadyOnTeam = existing && existing.team === team;
      if (!alreadyOnTeam) {
        const count = await PlayerMiniGameStats.countDocuments({ miniGame: miniGameId, team });
        if (count >= MAX_TEAM_SIZE) {
          return res.status(400).json({ error: `${team} already has ${MAX_TEAM_SIZE} players` });
        }
      }
    }

    const update = { team };
    if (team === BENCH) {
      for (const field of STAT_FIELDS) update[field] = 0;
    }

    const doc = await PlayerMiniGameStats.findOneAndUpdate(
      { player: playerId, miniGame: miniGameId },
      { $set: update, $setOnInsert: { player: playerId, miniGame: miniGameId } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const miniGameScore = await recalcScore(miniGameId);

    res.json({ ...doc.toObject(), miniGameScore });
  })
);

// Removes a player from a mini-game entirely (deletes their stat row).
router.post(
  '/unassign',
  asyncHandler(async (req, res) => {
    const { playerId, miniGameId } = req.body;

    const miniGame = await requireActiveMiniGame(miniGameId, res);
    if (!miniGame) return;

    await PlayerMiniGameStats.findOneAndDelete({ player: playerId, miniGame: miniGameId });
    const miniGameScore = await recalcScore(miniGameId);

    res.json({ success: true, miniGameScore });
  })
);

// Writes a player's final stat values for a mini-game in one shot (replaces the old per-click
// increment approach — the admin now tallies stats locally in the UI and this is called once per
// player, right before finishing). Bench players can't accrue stats.
router.post(
  '/save',
  asyncHandler(async (req, res) => {
    const { playerId, miniGameId, stats } = req.body;

    const miniGame = await requireActiveMiniGame(miniGameId, res);
    if (!miniGame) return;

    const doc = await PlayerMiniGameStats.findOne({ player: playerId, miniGame: miniGameId });
    if (!doc) {
      return res.status(404).json({ error: 'Player is not assigned to this mini-game yet' });
    }
    if (doc.team === BENCH) {
      return res.status(400).json({ error: 'Cannot record stats for a bench player' });
    }

    for (const field of STAT_FIELDS) {
      if (stats && stats[field] !== undefined) {
        doc[field] = Math.max(0, Number(stats[field]) || 0);
      }
    }
    await doc.save();

    const miniGameScore = await recalcScore(miniGameId);

    res.json({ ...doc.toObject(), miniGameScore });
  })
);

export default router;
