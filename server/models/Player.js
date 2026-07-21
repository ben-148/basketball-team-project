import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, default: null },
    dateOfBirth: { type: Date, default: null },
    photo: { type: String, default: '' },
    bio: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Player', playerSchema);
