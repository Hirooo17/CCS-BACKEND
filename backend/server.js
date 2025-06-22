import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import professorRoutes from './routes/professorRoutes.js';
import errorHandler from './middleware/errorHandler.js';

dotenv.config();

const app = express();

const allowedOrigins = ['https://room-managemtn.vercel.app'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // Only if using cookies/auth headers
  })
);
app.use(express.json());

// Database Connection
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/professors', professorRoutes);

app.get('/', (req, res) => res.send('API is running'));

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});