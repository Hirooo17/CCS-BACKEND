import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import professorRoutes from './routes/professorRoutes.js';
import errorHandler from './middleware/errorHandler.js';
import { Server } from 'socket.io'; // Import Socket.IO
import http from 'http'; // Import HTTP for creating server


dotenv.config();
const app = express();

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: ['https://room-managemtn.vercel.app/'], // Adjust to your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
})


 const allowedOrigins = [

          'https://room-managemtn.vercel.app/'
      ]

app.use(
          cors({
            origin: allowedOrigins,
            credentials: true,
            allowedHeaders: ["Content-Type", "Authorization"],
            methods: ["GET", "POST", "PUT", "DELETE"],
          })
        );
app.use(express.json());

// Database Connection
connectDB();

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/professors', professorRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});