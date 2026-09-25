import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import tripRoutes from './routes/trips';
import invitationRoutes from './routes/invitations';
import { testConnection } from './config/database';
import { saveMessage, getTripMessages } from './controllers/messageController';
import { isTripMember } from './services/tripAccessService';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/invitations', invitationRoutes);

// Простой маршрут для проверки
app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();
  res.json({ 
    status: 'OK', 
    message: 'TripPlanner API работает!',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// WebSocket подключения
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    (socket as any).userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('🔌 Пользователь подключился:', (socket as any).userId);

  // Подключение к комнате путешествия
  socket.on('join-trip', async (tripId) => {
    try {
      const tripIdNumber = Number(tripId);
      const userId = (socket as any).userId;
      if (!Number.isInteger(tripIdNumber) || !(await isTripMember(tripIdNumber, userId))) {
        socket.emit('message-error', 'Нет доступа к чату этого путешествия');
        return;
      }

      socket.join(`trip-${tripIdNumber}`);
      console.log(`👤 Пользователь ${userId} присоединился к путешествию ${tripIdNumber}`);
      const messages = await getTripMessages(tripIdNumber);
      socket.emit('message-history', messages);
    } catch (error) {
      console.error('Ошибка загрузки истории:', error);
    }
  });

  // Отправка сообщения
  socket.on('send-message', async (data) => {
    try {
      const { tripId, content } = data;
      const userId = (socket as any).userId;

      const tripIdNumber = Number(tripId);
      if (!Number.isInteger(tripIdNumber) || !(await isTripMember(tripIdNumber, userId))) {
        socket.emit('message-error', 'Нет доступа к чату этого путешествия');
        return;
      }

      if (typeof content !== 'string' || !content.trim() || content.length > 2000) {
        socket.emit('message-error', 'Сообщение должно содержать от 1 до 2000 символов');
        return;
      }

      // Сохраняем в БД
      const message = await saveMessage(tripIdNumber, userId, content.trim());

      // Отправляем всем в комнате
      io.to(`trip-${tripIdNumber}`).emit('new-message', message);
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      socket.emit('message-error', 'Не удалось отправить сообщение');
    }
  });

  // Отключение
  socket.on('disconnect', () => {
    console.log('🔌 Пользователь отключился:', (socket as any).userId);
  });
});

// Запуск сервера
server.listen(PORT, async () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`📡 API доступен по адресу: http://localhost:${PORT}`);
  console.log(`🔗 Проверка здоровья: http://localhost:${PORT}/api/health`);
  console.log(`💬 WebSocket сервер запущен`);
  
  await testConnection();
});
