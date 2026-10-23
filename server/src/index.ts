import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import authRoutes from './routes/auth';
import patientRoutes from './routes/patients';
import dashboardRoutes from './routes/dashboard';
import notificationRoutes from './routes/notifications';
import demoRoutes from './routes/demo';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/demo', demoRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use(errorHandler);

// Start server
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 QuarantineCare server running on port ${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  start().catch(console.error);
}

export default app;
