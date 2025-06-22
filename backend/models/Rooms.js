import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  floor: { type: Number, required: true },
  capacity: { type: Number, default: 20 },
  type: { type: String, enum: ['Regular', 'Faculty Room'], default: 'Regular' },
  isOccupied: { type: Boolean, default: false },
  currentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

export default mongoose.model('Room', roomSchema);