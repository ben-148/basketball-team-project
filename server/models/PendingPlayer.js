import mongoose from 'mongoose';

// A row from a PDF import that couldn't be matched to a player at confirm time — kept attached
// to the legacy Game so an admin can later assign it to an existing player or create a new one,
// without having to re-import the PDF.
const pendingPlayerSchema = new mongoose.Schema(
  {
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    nameInFile: { type: String, required: true },
    points: { type: Number, default: null },
    rebounds: { type: Number, default: null },
    assists: { type: Number, default: null },
    steals: { type: Number, default: null },
    turnovers: { type: Number, default: null },
    wins: { type: Number, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('PendingPlayer', pendingPlayerSchema);
