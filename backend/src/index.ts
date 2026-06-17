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
import chatRoutes from './routes/chat';
import alertRoutes from './routes/alerts';
import userRoutes from './routes/users';
import notificationRoutes from './routes/notifications';
import inquiryRoutes from './routes/inquiries';
import recommendationRoutes from './routes/recommendations';
import adminRoutes from './routes/admin';
import { setupSocketHandlers } from './services/socket';
import { fetchMandiPrices } from './jobs/priceAggregator';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }
});

export const prisma = new PrismaClient();

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/prices', priceRoutes);
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

// Socket.IO
setupSocketHandlers(io);

// Cron job: fetch mandi prices daily at 6 AM
cron.schedule('0 6 * * *', () => {
  console.log('Running daily mandi price fetch...');
  fetchMandiPrices().catch(console.error);
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`AgriLink API running on port ${PORT}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api/docs`);
});

export { app, httpServer, io };
