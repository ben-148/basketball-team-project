import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    youtubeUrl: { type: String, required: true },
    description: { type: String, default: '' },
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Video', videoSchema);
