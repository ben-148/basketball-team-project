import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    notes: { type: String, default: '' },
    roster: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  },
  { timestamps: true }
);

export default mongoose.model('Session', sessionSchema);
