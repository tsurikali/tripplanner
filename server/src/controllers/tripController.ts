import { Request, Response } from 'express';
import { db } from '../config/database';
import { RowDataPacket, OkPacket } from 'mysql2';

// Интерфейсы
interface Trip {
  id: number;
  name: string;
  description: string;
  destination: string;
  start_date: Date;
  end_date: Date;
  total_budget: number;
  status: string;
  created_by: number;
}

// Получить все путешествия пользователя
export const getUserTrips = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const [trips] = await db.execute(
      `SELECT t.*, 
        COUNT(DISTINCT tm.user_id) as members_count,
        (SELECT COUNT(*) FROM places WHERE trip_id = t.id) as places_count
       FROM trips t
       LEFT JOIN trip_members tm ON t.id = tm.trip_id
       WHERE t.created_by = ? OR tm.user_id = ?
       GROUP BY t.id
       ORDER BY t.created_at DESC`,
      [userId, userId]
    );

    res.json({
      success: true,
      trips
    });
  } catch (error) {
    console.error('Get trips error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении путешествий'
    });
  }
};

// Получить одно путешествие
export const getTripById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const [trips] = await db.execute(
      `SELECT t.*, 
        u.name as creator_name,
        u.email as creator_email
       FROM trips t
       JOIN users u ON t.created_by = u.id
       WHERE t.id = ? AND (t.created_by = ? OR EXISTS (
         SELECT 1 FROM trip_members WHERE trip_id = t.id AND user_id = ?
       ))`,
      [id, userId, userId]
    );

    const tripsRows = trips as any[];
    
    if (tripsRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Путешествие не найдено'
      });
    }

    // Получаем участников
    const [members] = await db.execute(
      `SELECT u.id, u.name, u.email, tm.role, tm.joined_at
       FROM trip_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.trip_id = ?`,
      [id]
    );

    // Получаем места
    const [places] = await db.execute(
      `SELECT p.*, u.name as suggested_by_name,
        (SELECT COUNT(*) FROM place_votes WHERE place_id = p.id AND vote = 'up') as upvotes,
        (SELECT COUNT(*) FROM place_votes WHERE place_id = p.id AND vote = 'down') as downvotes
       FROM places p
       LEFT JOIN users u ON p.suggested_by = u.id
       WHERE p.trip_id = ?
       ORDER BY p.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      trip: tripsRows[0],
      members,
      places
    });
  } catch (error) {
    console.error('Get trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении путешествия'
    });
  }
};

// Создать новое путешествие
export const createTrip = async (req: Request, res: Response) => {
  try {
    const { name, description, destination, start_date, end_date, total_budget } = req.body;
    const userId = (req as any).user.id;

    // Валидация
    if (!name || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Название и пункт назначения обязательны'
      });
    }

    // Создаем путешествие
    const [result] = await db.execute(
      `INSERT INTO trips (name, description, destination, start_date, end_date, total_budget, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description || '', destination, start_date || null, end_date || null, total_budget || 0, userId]
    );

    const insertResult = result as OkPacket;
    const tripId = insertResult.insertId;

    // Добавляем создателя как участника
    await db.execute(
      `INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, 'creator')`,
      [tripId, userId]
    );

    // Получаем созданное путешествие
    const [newTrip] = await db.execute(
      `SELECT * FROM trips WHERE id = ?`,
      [tripId]
    );

    const tripRows = newTrip as any[];

    res.status(201).json({
      success: true,
      message: 'Путешествие успешно создано',
      trip: tripRows[0]
    });
  } catch (error) {
    console.error('Create trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании путешествия'
    });
  }
};

// Обновить путешествие
export const updateTrip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, destination, start_date, end_date, total_budget, status } = req.body;
    const userId = (req as any).user.id;

    // Проверяем права (только создатель может редактировать)
    const [trips] = await db.execute(
      `SELECT * FROM trips WHERE id = ? AND created_by = ?`,
      [id, userId]
    );

    const tripsRows = trips as any[];
    
    if (tripsRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав на редактирование этого путешествия'
      });
    }

    // Обновляем
    await db.execute(
      `UPDATE trips 
       SET name = ?, description = ?, destination = ?, start_date = ?, end_date = ?, total_budget = ?, status = ?
       WHERE id = ?`,
      [name, description, destination, start_date, end_date, total_budget, status, id]
    );

    res.json({
      success: true,
      message: 'Путешествие обновлено'
    });
  } catch (error) {
    console.error('Update trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении путешествия'
    });
  }
};

// Удалить путешествие
export const deleteTrip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Проверяем права
    const [trips] = await db.execute(
      `SELECT * FROM trips WHERE id = ? AND created_by = ?`,
      [id, userId]
    );

    const tripsRows = trips as any[];
    
    if (tripsRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав на удаление этого путешествия'
      });
    }

    // Удаляем (каскадно удалятся все связанные записи)
    await db.execute(`DELETE FROM trips WHERE id = ?`, [id]);

    res.json({
      success: true,
      message: 'Путешествие удалено'
    });
  } catch (error) {
    console.error('Delete trip error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении путешествия'
    });
  }
};

// Пригласить участника
export const inviteMember = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { email, role = 'member' } = req.body;
    const userId = (req as any).user.id;

    // Проверяем права
    const [trips] = await db.execute(
      `SELECT * FROM trips WHERE id = ? AND created_by = ?`,
      [tripId, userId]
    );

    const tripsRows = trips as any[];
    
    if (tripsRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав на приглашение участников'
      });
    }

    // Ищем пользователя по email
    const [users] = await db.execute(
      `SELECT id FROM users WHERE email = ?`,
      [email]
    );

    const usersRows = users as any[];
    
    if (usersRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь с таким email не найден'
      });
    }

    const invitedUserId = usersRows[0].id;

    // Проверяем, не участник ли уже
    const [existing] = await db.execute(
      `SELECT * FROM trip_members WHERE trip_id = ? AND user_id = ?`,
      [tripId, invitedUserId]
    );

    const existingRows = existing as any[];
    
    if (existingRows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь уже является участником'
      });
    }

    // Добавляем участника
    await db.execute(
      `INSERT INTO trip_members (trip_id, user_id, role) VALUES (?, ?, ?)`,
      [tripId, invitedUserId, role]
    );

    res.json({
      success: true,
      message: 'Участник успешно добавлен'
    });
  } catch (error) {
    console.error('Invite member error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при приглашении участника'
    });
  }
};