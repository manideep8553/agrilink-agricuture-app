import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import cron from 'node-cron';

import { swaggerSpec } from './utils/swagger';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import listingRoutes from './routes/listings';
import priceRoutes from './routes/prices';
import analyticsRoutes from './routes/analytics';
import chatRoutes from './routes/chat';
import alertRoutes from './routes/alerts';
import userRoutes from './routes/users';
import notificationRoutes from './routes/notifications';
import inquiryRoutes from './routes/inquiries';
import recommendationRoutes from './routes/recommendations';
import adminRoutes from './routes/admin';
import { setupSocketHandlers } from './services/socket';
import { fetchMandiPrices, initPriceData } from './jobs/priceAggregator';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }
});

export const prisma = new PrismaClient();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

setupSocketHandlers(io);

cron.schedule('0 6 * * *', () => {
  console.log('[Cron] Running daily mandi price fetch...');
  fetchMandiPrices().catch(console.error);
});

cron.schedule('0 */6 * * *', () => {
  console.log('[Cron] Running periodic price trend computation...');
  recomputeTrends().catch(console.error);
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await prisma.$connect();
    console.log('Connected to PostgreSQL');

    await initPriceData();

    httpServer.listen(PORT, () => {
      console.log(`AgriLink API running on port ${PORT}`);
      console.log(`Swagger docs: http://localhost:${PORT}/api/docs`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

async function recomputeTrends() {
  try {
    const crops = await prisma.cropPriceHistory.findMany({
      distinct: ['cropName'],
      select: { cropName: true },
    });
    const { priceIntelligence } = await import('./services/priceIntelligence');
    for (const { cropName } of crops) {
      try {
        await priceIntelligence.computeTrend(cropName);
        await priceIntelligence.computeSeasonality(cropName);
      } catch {
      }
    }
    console.log(`Recomputed trends for ${crops.length} crops`);
  } catch {
  }
}

start();

export { app, httpServer, io };
