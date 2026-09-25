import { Request, Response } from 'express';
import { db } from '../config/database';
import { OkPacket } from 'mysql2';
import { isTripMember } from '../services/tripAccessService';

// Сохранить сообщение
export const saveMessage = async (tripId: number, userId: number, content: string) => {
  try {
    const [result] = await db.execute(
      `INSERT INTO messages (trip_id, user_id, content) VALUES (?, ?, ?)`,
      [tripId, userId, content]
    );

    const insertResult = result as OkPacket;
    const messageId = insertResult.insertId;

    // Получаем сохраненное сообщение с данными пользователя
    const [messages] = await db.execute(
      `SELECT m.*, u.name as user_name, u.email 
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.id = ?`,
      [messageId]
    );

    const messageRows = messages as any[];
    return messageRows[0];
  } catch (error) {
    console.error('Save message error:', error);
    throw error;
  }
};

// Получить историю сообщений путешествия
export const getTripMessages = async (tripId: number) => {
  try {
    const [messages] = await db.execute(
      `SELECT m.*, u.name as user_name, u.email 
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.trip_id = ?
       ORDER BY m.created_at ASC`,
      [tripId]
    );

    return messages;
  } catch (error) {
    console.error('Get messages error:', error);
    throw error;
  }
};

// API endpoint для получения истории
// API endpoint для получения истории
export const getMessages = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    
    // 👇 ПРОВЕРЯЕМ, ЧТО tripId - ЭТО СТРОКА
    if (typeof tripId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Некорректный ID путешествия'
      });
    }

    const tripIdNum = parseInt(tripId);
    const userId = (req as any).user.id;
    
    if (isNaN(tripIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный ID путешествия'
      });
    }

    if (!(await isTripMember(tripIdNum, userId))) {
      return res.status(403).json({
        success: false,
        message: 'Нет доступа к сообщениям этого путешествия'
      });
    }

    const messages = await getTripMessages(tripIdNum);
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении сообщений'
    });
  }
};
