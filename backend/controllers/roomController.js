import Room from '../models/Rooms.js';
import Booking from '../models/Booking.js'; // Add this import at the top
export const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find().populate('currentUser', 'name department');
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getRoomsByFloor = async (req, res) => {
  try {
    const floor = parseInt(req.params.floor);
    const rooms = await Room.find({ floor }).populate('currentUser', 'name department');
    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const getRoomHistory = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const history = await Booking.find({ 
      room: roomId,
      status: { $in: ['Completed', 'Cancelled'] }
    })
    .populate('professor', 'name department')
    .sort({ createdAt: -1 })
    .limit(50);

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
};

export const initializeRooms = async (req, res) => {
  try {
    await Room.deleteMany({});
    console.log('Existing rooms deleted');

    const rooms = [];
    for (let floor = 1; floor <= 4; floor++) {
      for (let roomNum = 2; roomNum <= 4; roomNum++) {
        const roomNumber = `${floor}${roomNum.toString().padStart(2, '0')}`;
        const isSpecial = floor === 2 && roomNum === 1;
        
        rooms.push({
          roomNumber,
          floor,
          type: isSpecial ? 'Faculty Room' : 'Regular',
          capacity: isSpecial ? 15 : 20
        });
      }
    }

    await Room.insertMany(rooms);

    // Emit rooms update
    const io = req.app.get('io');
    io.emit('roomsUpdated', rooms);

    res.json({ message: 'Rooms reinitialized successfully', count: rooms.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

