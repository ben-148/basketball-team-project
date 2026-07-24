import express from 'express';
import Player from '../models/Player.js';
import PlayerGameStats from '../models/PlayerGameStats.js';
import { TEAMS, STAT_FIELDS } from '../constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { computeCareerAchievements } from '../utils/achievements.js';

const router = express.Router();

// Returns the roster for a game split by team, plus players not yet assigned to either team, plus
// a per-player `summary` (totals + firstCareerFields) in the same shape sessions.js's GET /:id
// produces for regular sessions — legacy games get equal treatment for leader/achievement display
// (e.g. the home page's "last session" section, which may land on either a session or a legacy game).
router.get(
  '/game/:gameId',
  asyncHandler(async (req, res) => {
    const allPlayers = await Player.find().sort({ name: 1 });
    const assigned = await PlayerGameStats.find({ game: req.params.gameId }).populate('player');

    const assignedIds = new Set(assigned.map((s) => s.player._id.toString()));

    const teams = {};
    for (const team of TEAMS) teams[team] = [];

    const summaryMap = new Map();
    for (const s of assigned) {
      const stats = {
        _id: s._id,
        points: s.points,
        rebounds: s.rebounds,
        assists: s.assists,
        steals: s.steals,
        turnovers: s.turnovers,
        wins: s.wins,
      };
      if (teams[s.team]) {
        teams[s.team].push({ player: s.player, stats });
      }
      summaryMap.set(s.player._id.toString(), {
        player: s.player,
        totals: {
          points: s.points ?? 0,
          rebounds: s.rebounds ?? 0,
          assists: s.assists ?? 0,
          steals: s.steals ?? 0,
          turnovers: s.turnovers ?? 0,
          wins: s.wins ?? 0,
        },
        benchCount: 0,
        gamesPlayed: 1,
      });
    }

    const unassigned = allPlayers.filter((p) => !assignedIds.has(p._id.toString()));

    const summary = Array.from(summaryMap.values()).sort((a, b) => b.totals.points - a.totals.points);

    const { firstAchievementKey, eventLeaderFields } = await computeCareerAchievements();
    const eventKey = `legacy:${req.params.gameId}`;
    const leadersThisEvent = eventLeaderFields.get(eventKey) || new Map();
    for (const row of summary) {
      const playerId = row.player._id.toString();
      const ledFields = leadersThisEvent.get(playerId) || [];
      row.firstCareerFields = ledFields.filter((f) => firstAchievementKey.get(`${playerId}:${f}`) === eventKey);
    }

    res.json({ teams, unassigned, summary });
  })
);

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

// Writes a player's final stat values for a legacy game in one shot — lets the admin edit
// already-imported (or manually created) legacy sessions directly instead of only via PDF import.
router.post(
  '/save',
  asyncHandler(async (req, res) => {
    const { playerId, gameId, stats } = req.body;

    const doc = await PlayerGameStats.findOne({ player: playerId, game: gameId });
    if (!doc) {
      return res.status(404).json({ error: 'Player is not assigned to a team for this game yet' });
    }

    for (const field of STAT_FIELDS) {
      if (stats && stats[field] !== undefined) {
        doc[field] = Math.max(0, Number(stats[field]) || 0);
      }
    }
    await doc.save();

    res.json(doc);
  })
);

export default router;
