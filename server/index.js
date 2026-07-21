import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import playersRouter from './routes/players.js';
import gamesRouter from './routes/games.js';
import statsRouter from './routes/stats.js';
import videosRouter from './routes/videos.js';
import sessionsRouter from './routes/sessions.js';
import miniGamesRouter from './routes/miniGames.js';
import miniGameStatsRouter from './routes/miniGameStats.js';
import importRouter from './routes/import.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/players', playersRouter);
app.use('/api/games', gamesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/videos', videosRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/minigames', miniGamesRouter);
app.use('/api/mini-game-stats', miniGameStatsRouter);
app.use('/api/import', importRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
