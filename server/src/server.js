
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import {connectRedis} from './config/redis.js';
import { initSocket } from './sockets/index.js';
import { globalErrorHandler , notFound } from './middlewares/errorHandler.js';
import { globalRateLimiter } from './middlewares/rateLimiter.js';
import logger from './utils/logger.js';

//routes 
import passport from './config/passport.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import productRoutes from './routes/product.routes.js';
import orderRoutes from './routes/order.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import { razorpayWebhook } from './controllers/payment.controller.js';
import chatRoutes from './routes/chat.routes.js';
import adminRoutes from './routes/admin.routes.js';
import disputeRoutes from './routes/dispute.routes.js';
import reviewRoutes from './routes/review.routes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

//Inint Socket.io
initSocket(server);

//connect DB and Redis
connectDB();
connectRedis();

//Global Middlewares
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials:true,
}));

app.use(morgan('dev'));
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);
app.use(express.json({limit: '10mb'}));
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());
app.use('/api', globalRateLimiter);
app.use(passport.initialize());
//Health check
app.get('/health',(req,res)=>res.json({status: 'OK',timestamp:new Date() }));

//api routes
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chats',    chatRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/reviews',  reviewRoutes);

// Error Handlers
app.use(notFound);
app.use(globalErrorHandler);
//app.use(passport.initialize());

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

export default app;
