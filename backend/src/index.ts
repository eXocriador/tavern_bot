import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { setupCronJobs } from './cron/resetInstances';
import authRoutes from './routes/auth';
import instanceRoutes from './routes/instances';
import visitRoutes from './routes/visits';
import profileRoutes from './routes/profile';
import statisticsRoutes from './routes/statistics';
import botRoutes from './routes/bot';
import { devAuth } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
// Dev auth middleware (only in development)
app.use(devAuth);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tavern_bot')
  .then(() => {
    console.log('✅ Connected to MongoDB');

    // Setup cron jobs after DB connection
    setupCronJobs();
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/instances', instanceRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/bot', botRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

