import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';

const router = express.Router();

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Валидация
    if (!email || !password || !name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Все поля обязательны' 
      });
    }

    // Проверяем, существует ли пользователь
    const [existingUsers] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    const users = existingUsers as any[];
    if (users.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Пользователь с таким email уже существует' 
      });
    }

    // Хешируем пароль
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Создаём пользователя
    const [result] = await db.execute(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
      [email, hashedPassword, name]
    );

    const insertResult = result as any;
    const userId = insertResult.insertId;

    // Генерируем токен
    const token = jwt.sign(
      { id: userId, email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        email,
        name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка сервера' 
    });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Валидация
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email и пароль обязательны' 
      });
    }

    // Находим пользователя
    const [users] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    const userArray = users as any[];
    
    if (userArray.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Неверный email или пароль' 
      });
    }

    const user = userArray[0];

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: 'Неверный email или пароль' 
      });
    }

    // Генерируем токен
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ошибка сервера' 
    });
  }
});

// Проверка токена (для фронтенда)
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Токен отсутствует' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Получаем пользователя из БД
    const [users] = await db.execute(
      'SELECT id, email, name FROM users WHERE id = ?',
      [decoded.id]
    );

    const userArray = users as any[];
    
    if (userArray.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Пользователь не найден' 
      });
    }

    res.json({
      success: true,
      user: userArray[0]
    });
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: 'Неверный токен' 
    });
  }
});

export default router;