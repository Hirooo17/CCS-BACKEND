import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  currentStatus: {
    type: String,
    enum: ['Available', 'In Faculty Room', 'At Home', 'In Room'],
    default: 'Available'
  },
  currentRoom: { type: String, default: null },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('User', userSchema);