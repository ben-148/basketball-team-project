import mongoose from 'mongoose';
import { TEAMS } from '../constants.js';

const playerGameStatsSchema = new mongoose.Schema(
  {
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    team: { type: String, enum: TEAMS, required: true },
    points: { type: Number, default: 0 },
    rebounds: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    steals: { type: Number, default: 0 },
    turnovers: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
  },
  { timestamps: true }
);

playerGameStatsSchema.index({ player: 1, game: 1 }, { unique: true });

export default mongoose.model('PlayerGameStats', playerGameStatsSchema);
