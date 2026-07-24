import express from 'express';
import multer from 'multer';
import Player from '../models/Player.js';
import Game from '../models/Game.js';
import PlayerGameStats from '../models/PlayerGameStats.js';
import PendingPlayer from '../models/PendingPlayer.js';
import { TEAMS } from '../constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { extractStatsFromPdf } from '../services/claudeExtraction.js';
import { matchPlayerName } from '../services/matchPlayers.js';
import { readAliases, addAlias, removeAlias } from '../services/aliasStore.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are accepted'));
    }
    cb(null, true);
  },
});

function handleUploadError(err, req, res, next) {
  if (err) return res.status(400).json({ error: err.message });
  next();
}

// Uploads a PDF, sends it to Claude for extraction, and returns each row matched against the roster.
router.post(
  '/extract',
  upload.single('pdf'),
  handleUploadError,
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file was uploaded' });
    }

    const [{ rows: extracted, missingColumns }, players, aliases] = await Promise.all([
      extractStatsFromPdf(req.file.buffer),
      Player.find().sort({ name: 1 }),
      readAliases(),
    ]);

    const rows = extracted.map((row) => {
      const match = matchPlayerName(row.nameInFile, players, aliases);
      return { ...row, ...match };
    });

    res.json({ rows, missingColumns });
  })
);

// Checks whether a legacy session already exists for a given date (YYYY-MM-DD).
router.get(
  '/check-date',
  asyncHandler(async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date query param is required' });

    const existing = await Game.findOne({ date: new Date(date) });
    res.json({ exists: Boolean(existing) });
  })
);

// Creates a legacy Game for the given date, then a PlayerGameStats row for each matched player.
router.post(
  '/confirm',
  asyncHandler(async (req, res) => {
    const { date, rows } = req.body;

    if (!date) return res.status(400).json({ error: 'date is required' });
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows must be a non-empty array' });
    }

    const duplicate = await Game.findOne({ date: new Date(date) });
    if (duplicate) {
      return res.status(400).json({ error: 'כבר קיים משחק בתאריך זה במערכת' });
    }

    const game = await Game.create({ date: new Date(date) });

    const skipped = [];
    let imported = 0;

    for (const row of rows) {
      if (!row.playerId) {
        skipped.push(row.nameInFile);
        await PendingPlayer.create({
          game: game._id,
          nameInFile: row.nameInFile,
          points: row.points ?? null,
          rebounds: row.rebounds ?? null,
          assists: row.assists ?? null,
          steals: row.steals ?? null,
          turnovers: row.turnovers ?? null,
          wins: row.wins ?? null,
        });
        continue;
      }
      await PlayerGameStats.create({
        player: row.playerId,
        game: game._id,
        team: TEAMS[0],
        points: row.points ?? null,
        rebounds: row.rebounds ?? null,
        assists: row.assists ?? null,
        steals: row.steals ?? null,
        turnovers: row.turnovers ?? null,
        wins: row.wins ?? null,
      });
      imported += 1;
    }

    res.json({ imported, skipped, gameId: game._id, date: game.date });
  })
);

router.get(
  '/aliases',
  asyncHandler(async (req, res) => {
    const [aliases, players] = await Promise.all([readAliases(), Player.find()]);
    const playersById = new Map(players.map((p) => [p._id.toString(), p]));
    const withPlayer = aliases.map((a) => ({
      ...a,
      player: playersById.get(a.playerId) || null,
    }));
    res.json(withPlayer);
  })
);

router.post(
  '/aliases',
  asyncHandler(async (req, res) => {
    const { alias, playerId } = req.body;
    if (!alias || !playerId) {
      return res.status(400).json({ error: 'alias and playerId are required' });
    }
    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const entry = await addAlias(alias.trim(), playerId);
    res.status(201).json({ ...entry, player });
  })
);

router.delete(
  '/aliases/:id',
  asyncHandler(async (req, res) => {
    const removed = await removeAlias(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Alias not found' });
    res.json({ success: true });
  })
);

export default router;
