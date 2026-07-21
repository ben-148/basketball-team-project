import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    location: { type: String, default: '' },
    raskoScore: { type: Number, default: 0 },
    shoshanatScore: { type: Number, default: 0 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Game', gameSchema);
