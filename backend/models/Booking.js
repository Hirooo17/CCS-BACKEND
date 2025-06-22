import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  professor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  roomNumber: { type: String, required: true },
  purpose: { 
    type: String, 
    enum: ['Defense', 'Meeting', 'Lecture', 'Consultation', 'Other'], 
    required: true 
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  actualEndTime: { type: Date, default: null },
  status: { 
    type: String, 
    enum: ['Active', 'Completed', 'Cancelled'], 
    default: 'Active' 
  },
  notes: { type: String, default: '' },
  duration: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);