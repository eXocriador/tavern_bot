import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import { setupCronJobs } from './cron/resetInstances';
import { devAuth } from './middleware/auth';
import authRoutes from './routes/auth';
import botRoutes from './routes/bot';
import characterRoutes from './routes/characters';
import instanceRoutes from './routes/instances';
import partyRoutes from './routes/parties';
import profileRoutes from './routes/profile';
import statisticsRoutes from './routes/statistics';
import userRoutes from './routes/users';
import visitRoutes from './routes/visits';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
// Dev auth middleware (only in development)
app.use(devAuth);

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  console.error('MONGODB_URI environment variable is not set');
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => {
    setupCronJobs();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(error => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
