import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/room_management', {

});

// Database connection check
mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.log('MongoDB connection error:', err);
});

// User/Professor Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: String, required: true },
  currentStatus: {
    type: String,
    enum: ['Available', 'In Faculty Room', 'At Home', 'In Room'],
    default: 'Available'
  },
  currentRoom: { type: String, default: null }, // Room number if in a room
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Room Schema
const roomSchema = new mongoose.Schema({
  roomNumber: { type: String, required: true, unique: true },
  floor: { type: Number, required: true },
  capacity: { type: Number, default: 20 },
  type: { type: String, enum: ['Regular', 'Faculty Room'], default: 'Regular' },
  isOccupied: { type: Boolean, default: false },
  currentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

// Booking Schema
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
  actualEndTime: { type: Date, default: null }, // When they actually ended the booking
  status: { 
    type: String, 
    enum: ['Active', 'Completed', 'Cancelled'], 
    default: 'Active' 
  },
  notes: { type: String, default: '' },
  duration: { type: Number, default: 0 } // Duration in minutes
}, { timestamps: true });

// Models
const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);
const Booking = mongoose.model('Booking', bookingSchema);

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ============ AUTH ROUTES ============

// Register Professor
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, department } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Professor already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      department
    });

    await user.save();

    // Create token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Professor registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
        currentStatus: user.currentStatus
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
        currentStatus: user.currentStatus,
        currentRoom: user.currentRoom
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ PROFESSOR STATUS ROUTES ============

// Update Professor Status
app.put('/api/professor/status', authenticateToken, async (req, res) => {
  try {
    const { status, roomNumber } = req.body;
    const userId = req.user.userId;

    const updateData = {
      currentStatus: status,
      lastUpdated: new Date()
    };

    if (status === 'In Room' && roomNumber) {
      updateData.currentRoom = roomNumber;
    } else {
      updateData.currentRoom = null;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
    
    res.json({
      message: 'Status updated successfully',
      user: {
        id: user._id,
        name: user.name,
        currentStatus: user.currentStatus,
        currentRoom: user.currentRoom
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get All Professors Status
app.get('/api/professors/status', authenticateToken, async (req, res) => {
  try {
    const professors = await User.find({}, {
      name: 1,
      department: 1,
      currentStatus: 1,
      currentRoom: 1,
      lastUpdated: 1
    });

    res.json({ professors });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ ROOM ROUTES ============

// Get All Rooms
app.get('/api/rooms', authenticateToken, async (req, res) => {
  try {
    const rooms = await Room.find().populate('currentUser', 'name department');
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Rooms by Floor
app.get('/api/rooms/floor/:floor', authenticateToken, async (req, res) => {
  try {
    const floor = parseInt(req.params.floor);
    const rooms = await Room.find({ floor }).populate('currentUser', 'name department');
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Room History
app.get('/api/rooms/:roomId/history', authenticateToken, async (req, res) => {
  try {
    const roomId = req.params.roomId;
    
    // Get room details
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Get booking history for this room
    const history = await Booking.find({ 
      room: roomId,
      status: { $in: ['Completed', 'Cancelled'] }
    })
    .populate('professor', 'name department')
    .sort({ createdAt: -1 })
    .limit(50); // Last 50 bookings

    res.json({ 
      room: {
        roomNumber: room.roomNumber,
        floor: room.floor,
        type: room.type
      },
      history 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ BOOKING ROUTES ============

// Create Booking
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { roomId, purpose, startTime, endTime, notes } = req.body;
    const professorId = req.user.userId;

    // Check if professor already has an active booking
    const existingBooking = await Booking.findOne({
      professor: professorId,
      status: 'Active'
    });

    if (existingBooking) {
      return res.status(400).json({ 
        message: 'You already have an active booking. Please end your current booking first.',
        currentBooking: {
          roomNumber: existingBooking.roomNumber,
          startTime: existingBooking.startTime
        }
      });
    }

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if room is already occupied
    if (room.isOccupied) {
      return res.status(400).json({ message: 'Room is currently occupied' });
    }

    // Check for time conflicts with other active bookings
    const conflictingBooking = await Booking.findOne({
      room: roomId,
      status: 'Active',
      $or: [
        {
          startTime: { $lte: new Date(startTime) },
          endTime: { $gt: new Date(startTime) }
        },
        {
          startTime: { $lt: new Date(endTime) },
          endTime: { $gte: new Date(endTime) }
        }
      ]
    });

    if (conflictingBooking) {
      return res.status(400).json({ message: 'Room is already booked for this time' });
    }

    // Create booking
    const booking = new Booking({
      professor: professorId,
      room: roomId,
      roomNumber: room.roomNumber,
      purpose,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      notes: notes || ''
    });

    await booking.save();

    // Update room status
    await Room.findByIdAndUpdate(roomId, {
      isOccupied: true,
      currentUser: professorId
    });

    // Update professor status
    await User.findByIdAndUpdate(professorId, {
      currentStatus: 'In Room',
      currentRoom: room.roomNumber
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate('professor', 'name department')
      .populate('room', 'roomNumber floor');

    res.status(201).json({
      message: 'Room booked successfully',
      booking: populatedBooking
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Active Bookings
app.get('/api/bookings/active', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ status: 'Active' })
      .populate('professor', 'name department')
      .populate('room', 'roomNumber floor')
      .sort({ startTime: 1 });

    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Professor's Bookings
app.get('/api/bookings/my', authenticateToken, async (req, res) => {
  try {
    const bookings = await Booking.find({ professor: req.user.userId })
      .populate('room', 'roomNumber floor')
      .sort({ startTime: -1 });

    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Booking History
app.get('/api/bookings/history', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const bookings = await Booking.find({ 
      status: { $in: ['Completed', 'Cancelled'] }
    })
      .populate('professor', 'name department')
      .populate('room', 'roomNumber floor type')
      .sort({ actualEndTime: -1, endTime: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Booking.countDocuments({ 
      status: { $in: ['Completed', 'Cancelled'] }
    });

    res.json({ 
      bookings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// End Booking
app.put('/api/bookings/:id/end', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.user.userId;

    const booking = await Booking.findOne({
      _id: bookingId,
      professor: userId,
      status: 'Active'
    });

    if (!booking) {
      return res.status(404).json({ message: 'Active booking not found' });
    }

    const endTime = new Date();
    const startTime = new Date(booking.startTime);
    const duration = Math.round((endTime - startTime) / (1000 * 60)); // Duration in minutes

    // Update booking status
    booking.status = 'Completed';
    booking.actualEndTime = endTime;
    booking.duration = duration;
    await booking.save();

    // Update room status
    await Room.findByIdAndUpdate(booking.room, {
      isOccupied: false,
      currentUser: null
    });

    // Update professor status
    await User.findByIdAndUpdate(userId, {
      currentStatus: 'Available',
      currentRoom: null
    });

    res.json({ 
      message: 'Booking ended successfully',
      duration: duration
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Force end booking (admin feature or for cleanup)
app.put('/api/bookings/:id/force-end', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findOne({
      _id: bookingId,
      status: 'Active'
    });

    if (!booking) {
      return res.status(404).json({ message: 'Active booking not found' });
    }

    const endTime = new Date();
    const startTime = new Date(booking.startTime);
    const duration = Math.round((endTime - startTime) / (1000 * 60));

    // Update booking status
    booking.status = 'Completed';
    booking.actualEndTime = endTime;
    booking.duration = duration;
    await booking.save();

    // Update room status
    await Room.findByIdAndUpdate(booking.room, {
      isOccupied: false,
      currentUser: null
    });

    // Update professor status
    await User.findByIdAndUpdate(booking.professor, {
      currentStatus: 'Available',
      currentRoom: null
    });

    res.json({ 
      message: 'Booking force-ended successfully',
      duration: duration
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ INITIALIZE DATA ============

// Initialize rooms (run once)
app.post('/api/initialize', async (req, res) => {
  try {
    // Check if rooms already exist
    const existingRooms = await Room.countDocuments();
    if (existingRooms > 0) {
      return res.json({ message: 'Rooms already initialized' });
    }

    const rooms = [];
    
    // Create rooms for 4 floors, 4 rooms each
    for (let floor = 1; floor <= 4; floor++) {
      for (let roomNum = 1; roomNum <= 4; roomNum++) {
        const roomNumber = `${floor}${roomNum.toString().padStart(2, '0')}`;
        const isSpecial = floor === 2 && roomNum === 1; // Faculty room
        
        rooms.push({
          roomNumber,
          floor,
          type: isSpecial ? 'Faculty Room' : 'Regular',
          capacity: isSpecial ? 15 : 20
        });
      }
    }

    await Room.insertMany(rooms);
    res.json({ message: 'Rooms initialized successfully', count: rooms.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});