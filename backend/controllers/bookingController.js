import Booking from '../models/Booking.js';
import Room from '../models/Rooms.js';
import User from '../models/Users.js';

export const createBooking = async (req, res) => {
  try {
    const { roomId, purpose, startTime, endTime, notes } = req.body;
    const professorId = req.user.userId;

    const existingBooking = await Booking.findOne({
      professor: professorId,
      status: 'Active'
    });

    if (existingBooking) {
      return res.status(400).json({ 
        message: 'You already have an active booking',
        currentBooking: {
          roomNumber: existingBooking.roomNumber,
          startTime: existingBooking.startTime
        }
      });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.isOccupied) {
      return res.status(400).json({ message: 'Room is currently occupied' });
    }

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
    await Room.findByIdAndUpdate(roomId, {
      isOccupied: true,
      currentUser: professorId
    });
    await User.findByIdAndUpdate(professorId, {
      currentStatus: 'In Room',
      currentRoom: room.roomNumber
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate('professor')
      .populate('room', 'roomNumber floor');

    res.status(201).json({
      message: 'Room booked successfully',
      booking: populatedBooking
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getActiveBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ status: 'Active' })
      .populate('professor')
      .populate('room', 'roomNumber floor')
      .sort({ startTime: 1 });

    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ professor: req.user.userId })
      .populate('room', 'roomNumber floor')
      .sort({ startTime: -1 });

    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getBookingHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const bookings = await Booking.find({ 
      status: { $in: ['Completed', 'Cancelled'] }
    })
      .populate('professor')
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
};

export const endBooking = async (req, res) => {
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
    const duration = Math.round((endTime - startTime) / (1000 * 60));

    booking.status = 'Completed';
    booking.actualEndTime = endTime;
    booking.duration = duration;
    await booking.save();

    await Room.findByIdAndUpdate(booking.room, {
      isOccupied: false,
      currentUser: null
    });

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
};

export const forceEndBooking = async (req, res) => {
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

    booking.status = 'Completed';
    booking.actualEndTime = endTime;
    booking.duration = duration;
    await booking.save();

    await Room.findByIdAndUpdate(booking.room, {
      isOccupied: false,
      currentUser: null
    });

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
};