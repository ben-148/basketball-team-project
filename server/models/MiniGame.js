import mongoose from 'mongoose';

const miniGameSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
    raskoScore: { type: Number, default: 0 },
    shoshanatScore: { type: Number, default: 0 },
    finished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('MiniGame', miniGameSchema);
