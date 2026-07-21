import mongoose from 'mongoose';
import { MINI_GAME_TEAMS } from '../constants.js';

const playerMiniGameStatsSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    miniGame: { type: mongoose.Schema.Types.ObjectId, ref: 'MiniGame', required: true },
    team: { type: String, enum: MINI_GAME_TEAMS, required: true },
    points: { type: Number, default: 0 },
    rebounds: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    steals: { type: Number, default: 0 },
    turnovers: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
  },
  { timestamps: true }
);

playerMiniGameStatsSchema.index({ player: 1, miniGame: 1 }, { unique: true });

export default mongoose.model('PlayerMiniGameStats', playerMiniGameStatsSchema);
