import express from 'express';
import { authenticateToken } from '../middleware/Auth.js';
import { 
  getRooms, 
  getRoomsByFloor, 
  getRoomHistory,
  initializeRooms 
} from '../controllers/roomController.js';

const roomRoutes = express.Router();

roomRoutes.get('/', authenticateToken, getRooms);
roomRoutes.get('/floor/:floor', authenticateToken, getRoomsByFloor);
roomRoutes.get('/:roomId/history', authenticateToken, getRoomHistory);
roomRoutes.post('/initialize',  initializeRooms);
export default roomRoutes;