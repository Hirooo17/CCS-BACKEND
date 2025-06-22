import User from '../models/Users.js';

export const updateProfessorStatus = async (req, res) => {
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
};

export const getProfessorsStatus = async (req, res) => {
  try {
    const professors = await User.find({}, {
      name: 1,
      currentStatus: 1,
      currentRoom: 1,
      lastUpdated: 1
    });

    res.json({ professors });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};