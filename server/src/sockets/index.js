import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';
import logger from '../utils/logger.js';

let io;
const onlineUsers = new Map(); // userId -> socketId

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
    pingTimeout: 60000,
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required.'));
      const decoded = verifyAccessToken(token);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token.'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);
    logger.info(`🔌 Socket connected: ${userId}`);

    // Join personal room
    socket.join(userId);

    // Join chat room
    socket.on('JOIN_CHAT', (chatId) => socket.join(`chat:${chatId}`));
    socket.on('LEAVE_CHAT', (chatId) => socket.leave(`chat:${chatId}`));

    // Real-time message
    socket.on('SEND_MESSAGE', async (data) => {
      const { chatId, message } = data;
      io.to(`chat:${chatId}`).emit('NEW_MESSAGE', { chatId, message });
    });

    // Typing indicator
    socket.on('TYPING', ({ chatId, userId }) => {
      socket.to(`chat:${chatId}`).emit('USER_TYPING', { chatId, userId });
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      logger.info(`🔌 Socket disconnected: ${userId}`);
    });
  });

  return io;
};

// Notify specific user
export const notifyUser = (userId, event, data) => {
  if (io) io.to(userId).emit(event, data);
};

// Broadcast to chat room
export const broadcastToChat = (chatId, event, data) => {
  if (io) io.to(`chat:${chatId}`).emit(event, data);
};

export const getIO = () => io;
