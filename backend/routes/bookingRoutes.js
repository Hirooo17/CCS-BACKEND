import express from 'express';
import { authenticateToken } from '../middleware/Auth.js';
import { 
  createBooking,
  getActiveBookings,
  getUserBookings,
  getBookingHistory,
  endBooking,
  forceEndBooking
} from '../controllers/bookingController.js';

const bookingRoutes = express.Router();

bookingRoutes.post('/', authenticateToken, createBooking);
bookingRoutes.get('/active', authenticateToken, getActiveBookings);
bookingRoutes.get('/my', authenticateToken, getUserBookings);
bookingRoutes.get('/history', authenticateToken, getBookingHistory);
bookingRoutes.put('/:id/end', authenticateToken, endBooking);
bookingRoutes.put('/:id/force-end', authenticateToken, forceEndBooking);

export default bookingRoutes;