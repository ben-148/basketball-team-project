import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import Player from '../models/Player.js';
import PlayerGameStats from '../models/PlayerGameStats.js';
import PlayerMiniGameStats from '../models/PlayerMiniGameStats.js';
import MiniGame from '../models/MiniGame.js';
import Video from '../models/Video.js';
import { BENCH } from '../constants.js';
import { createStatTotals } from '../utils/statTotals.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { computeCareerAchievements } from '../utils/achievements.js';

// Categories eligible for a session-log leader indicator — matches the client's star (⭐) /
// trophy (🏆) fields. Turnovers is intentionally excluded.
const LEADER_FIELDS = ['points', 'rebounds', 'assists', 'steals', 'wins'];

function emptyLeaderTotals() {
  return Object.fromEntries(LEADER_FIELDS.map((f) => [f, 0]));
}

// For a set of session IDs, sums every participating player's stats per session (across all of
// that session's mini-games) and returns which categories THIS player led — tied included, zero
// leaders excluded. This is what makes the Session Log's leader badges reflect "best in that
// session among everyone who played", not "best among this player's own sessions".
async function computeSessionLeaderFields(playerId, sessionIds) {
  const result = {};
  if (sessionIds.length === 0) return result;

  const miniGames = await MiniGame.find({ session: { $in: sessionIds } }).select('_id session');
  const miniGameToSession = new Map(miniGames.map((m) => [m._id.toString(), m.session.toString()]));
  const miniGameIds = miniGames.map((m) => m._id);

  const stats = await PlayerMiniGameStats.find({ miniGame: { $in: miniGameIds } }).select(
    'player miniGame points rebounds assists steals wins'
  );

  const totalsByKey = new Map();
  for (const s of stats) {
    const sessionId = miniGameToSession.get(s.miniGame.toString());
    if (!sessionId) continue;
    const key = `${sessionId}:${s.player.toString()}`;
    if (!totalsByKey.has(key)) totalsByKey.set(key, emptyLeaderTotals());
    const totals = totalsByKey.get(key);
    for (const f of LEADER_FIELDS) totals[f] += s[f] || 0;
  }

  const maxBySession = new Map();
  for (const [key, totals] of totalsByKey) {
    const sessionId = key.split(':')[0];
    if (!maxBySession.has(sessionId)) maxBySession.set(sessionId, emptyLeaderTotals());
    const maxes = maxBySession.get(sessionId);
    for (const f of LEADER_FIELDS) if (totals[f] > maxes[f]) maxes[f] = totals[f];
  }

  for (const sessionId of sessionIds) {
    const maxes = maxBySession.get(sessionId);
    const totals = totalsByKey.get(`${sessionId}:${playerId}`);
    result[sessionId] = !maxes || !totals ? [] : LEADER_FIELDS.filter((f) => maxes[f] > 0 && totals[f] === maxes[f]);
  }
  return result;
}

// Same idea as computeSessionLeaderFields but for legacy (pre-mini-game) games, where every
// player already has exactly one PlayerGameStats row per game.
async function computeLegacyLeaderFields(playerId, gameIds) {
  const result = {};
  if (gameIds.length === 0) return result;

  const stats = await PlayerGameStats.find({ game: { $in: gameIds } }).select(
    'player game points rebounds assists steals wins'
  );

  const totalsByKey = new Map();
  for (const s of stats) {
    const gameId = s.game.toString();
    const key = `${gameId}:${s.player.toString()}`;
    if (!totalsByKey.has(key)) totalsByKey.set(key, emptyLeaderTotals());
    const totals = totalsByKey.get(key);
    for (const f of LEADER_FIELDS) totals[f] += s[f] || 0;
  }

  const maxByGame = new Map();
  for (const [key, totals] of totalsByKey) {
    const gameId = key.split(':')[0];
    if (!maxByGame.has(gameId)) maxByGame.set(gameId, emptyLeaderTotals());
    const maxes = maxByGame.get(gameId);
    for (const f of LEADER_FIELDS) if (totals[f] > maxes[f]) maxes[f] = totals[f];
  }

  for (const gameId of gameIds) {
    const maxes = maxByGame.get(gameId);
    const totals = totalsByKey.get(`${gameId}:${playerId}`);
    result[gameId] = !maxes || !totals ? [] : LEADER_FIELDS.filter((f) => maxes[f] > 0 && totals[f] === maxes[f]);
  }
  return result;
}

// Career totals + הצטיינויות count for every player — the shared basis for both the /leaderboard
// listing and the per-player rank badges on the player page.
async function computeLeaderboardRows() {
  const players = await Player.find().sort({ name: 1 });
  const legacyDocs = await PlayerGameStats.find().populate('game');
  const miniGameDocs = await PlayerMiniGameStats.find().populate({
    path: 'miniGame',
    populate: { path: 'session' },
  });
  const { achievementsCount } = await computeCareerAchievements();

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

  return Array.from(rowsByPlayer.values()).map((row) => ({
    player: row.player,
    totals: row.statTotals.finalize(row.gamesPlayed),
    gamesPlayed: row.gamesPlayed,
    benchCount: row.benchCount,
    achievements: achievementsCount.get(row.player._id.toString()) || 0,
  }));
}

// Categories the player page shows a rank badge for.
const RANK_FIELDS = ['points', 'rebounds', 'assists', 'steals', 'wins', 'achievements'];

function rankValue(row, field) {
  return (field === 'achievements' ? row.achievements : row.totals[field]) || 0;
}

// Competition ranking (1224-style): equal values share the same rank, and the next distinct
// value's rank equals its position in the sorted list (so a tie for #1 is followed by #3).
function computeRanksForField(rows, field) {
  const sorted = [...rows].sort((a, b) => rankValue(b, field) - rankValue(a, field));
  const ranks = new Map();
  let rank = 0;
  let lastValue = null;
  let position = 0;
  for (const row of sorted) {
    position += 1;
    const value = rankValue(row, field);
    if (value !== lastValue) {
      rank = position;
      lastValue = value;
    }
    ranks.set(row.player._id.toString(), rank);
  }
  return ranks;
}

function computeRanksForPlayer(rows, playerId) {
  const ranks = {};
  for (const field of RANK_FIELDS) {
    ranks[field] = computeRanksForField(rows, field).get(playerId) ?? null;
  }
  return ranks;
}

const router = express.Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHOTOS_DIR = path.join(__dirname, '..', 'uploads', 'players');
fs.mkdirSync(PHOTOS_DIR, { recursive: true });

const photoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, PHOTOS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are accepted'));
    }
    cb(null, true);
  },
});

function handlePhotoUploadError(err, req, res, next) {
  if (err) return res.status(400).json({ error: err.message });
  next();
}

router.get('/', async (req, res) => {
  const players = await Player.find().sort({ name: 1 });
  res.json(players);
});

// Career totals for every player, merging legacy PlayerGameStats and new PlayerMiniGameStats.
router.get('/leaderboard', async (req, res) => {
  res.json(await computeLeaderboardRows());
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
      miniGameCreatedAt: s.miniGame.createdAt,
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
  const videos = await Video.find({ player: player._id }).sort({ createdAt: -1 });

  const sessionIds = [...new Set(miniGameRows.map((r) => r.sessionId.toString()))];
  const gameIds = [...new Set(legacyRows.map((r) => r.gameId.toString()))];
  const playerId = player._id.toString();
  const [sessionLeaders, legacyLeaders, leaderboardRows] = await Promise.all([
    computeSessionLeaderFields(playerId, sessionIds),
    computeLegacyLeaderFields(playerId, gameIds),
    computeLeaderboardRows(),
  ]);

  const lifetime = statTotals.finalize(gamesPlayed);
  lifetime.gamesPlayed = gamesPlayed;
  lifetime.benchCount = benchCount;
  lifetime.achievements = leaderboardRows.find((r) => r.player._id.toString() === playerId)?.achievements || 0;

  const ranks = computeRanksForPlayer(leaderboardRows, playerId);

  res.json({ player, lifetime, gameLog, videos, sessionLeaders, legacyLeaders, ranks });
});

// Uploads a photo file to local disk and returns its URL — the admin form then saves that URL
// on the player via the regular create/update routes, same as it would a pasted external URL.
router.post(
  '/upload-photo',
  photoUpload.single('photo'),
  handlePhotoUploadError,
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No photo file was uploaded' });
    res.json({ url: `/api/uploads/players/${req.file.filename}` });
  })
);

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
