import { Request, Response } from 'express';
import { db } from '../config/database';
import { OkPacket } from 'mysql2';
import { canManageTrip, getTripRole } from '../services/tripAccessService';


// Получить все места путешествия
export const getPlaces = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = (req as any).user.id;

    if (!(await getTripRole(tripId, userId))) {
      return res.status(403).json({ success: false, message: 'Нет доступа к этому путешествию' });
    }

    const [places] = await db.execute(
      `SELECT p.*, 
        u.name as suggested_by_name,
        (SELECT COUNT(*) FROM place_votes WHERE place_id = p.id AND vote = 'up') as upvotes,
        (SELECT COUNT(*) FROM place_votes WHERE place_id = p.id AND vote = 'down') as downvotes,
        (SELECT vote FROM place_votes WHERE place_id = p.id AND user_id = ?) as user_vote
       FROM places p
       LEFT JOIN users u ON p.suggested_by = u.id
       WHERE p.trip_id = ?
       ORDER BY 
         CASE p.status 
           WHEN 'approved' THEN 1
           WHEN 'suggested' THEN 2
           ELSE 3
         END,
         p.created_at DESC`,
      [(req as any).user.id, tripId]
    );

    res.json({
      success: true,
      places
    });
  } catch (error) {
    console.error('Get places error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении мест'
    });
  }
};

// Добавить новое место (С ГЕОКОДИРОВАНИЕМ)
export const createPlace = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { name, description, category, address, cost } = req.body;
    const userId = (req as any).user.id;

    console.log('📝 Добавление места:', { name, address });

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Название места обязательно'
      });
    }

    const [members] = await db.execute(
      `SELECT * FROM trip_members WHERE trip_id = ? AND user_id = ?`,
      [tripId, userId]
    );

    const membersRows = members as any[];

    if (membersRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Вы не являетесь участником этого путешествия'
      });
    }

    // 🌍 ГЕОКОДИРОВАНИЕ
    let latitude = null;
    let longitude = null;
    let formattedAddress = address;

    if (address) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
          {
            headers: {
              'User-Agent': 'TripPlanner/1.0'
            }
          }
        );

        const data: any = await response.json();

        if (data && data.length > 0) {
          latitude = parseFloat(data[0].lat);
          longitude = parseFloat(data[0].lon);
          formattedAddress = data[0].display_name;
          console.log('✅ Координаты найдены:', { latitude, longitude });
        } else {
          console.log('⚠️ Адрес не найден');
        }
      } catch (geoError) {
        console.error('❌ Ошибка геокодирования:', geoError);
      }
    }

    // Сохраняем с координатами
    const [result] = await db.execute(
      `INSERT INTO places (trip_id, name, description, category, address, latitude, longitude, cost, suggested_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tripId,
        name,
        description || null,
        category || 'attraction',
        formattedAddress || address || null,
        latitude,
        longitude,
        cost || 0,
        userId
      ]
    );

    const insertResult = result as OkPacket;
    const placeId = insertResult.insertId;

    const [newPlace] = await db.execute(
      `SELECT p.*, u.name as suggested_by_name,
        0 as upvotes, 0 as downvotes, null as user_vote
       FROM places p
       LEFT JOIN users u ON p.suggested_by = u.id
       WHERE p.id = ?`,
      [placeId]
    );

    const placeRows = newPlace as any[];

    console.log('✅ Место сохранено:', {
      name: placeRows[0]?.name,
      lat: placeRows[0]?.latitude,
      lng: placeRows[0]?.longitude
    });

    res.status(201).json({
      success: true,
      message: 'Место успешно добавлено',
      place: placeRows[0]
    });
  } catch (error) {
    console.error('❌ Create place error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при добавлении места'
    });
  }
};

// Обновить место
export const updatePlace = async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params;
    const { tripId } = req.params;
    const { name, description, category, address, cost, status, latitude, longitude } = req.body;
    const userId = (req as any).user.id;

    const [places] = await db.execute(
      `SELECT p.*, tm.role FROM places p
       JOIN trip_members tm ON p.trip_id = tm.trip_id AND tm.user_id = ?
       WHERE p.id = ? AND p.trip_id = ?`,
      [userId, placeId, tripId]
    );

    const placesRows = places as any[];

    if (placesRows.length === 0 || (placesRows[0].suggested_by !== userId && !canManageTrip(placesRows[0].role))) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав на редактирование этого места'
      });
    }

    await db.execute(
      `UPDATE places 
       SET name = ?, description = ?, category = ?, address = ?, latitude = ?, longitude = ?, cost = ?, status = ?
       WHERE id = ?`,
      [name, description, category, address, latitude, longitude, cost, status, placeId]
    );

    res.json({
      success: true,
      message: 'Место обновлено'
    });
  } catch (error) {
    console.error('Update place error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении места'
    });
  }
};

// Удалить место
export const deletePlace = async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params;
    const { tripId } = req.params;
    const userId = (req as any).user.id;

    const [places] = await db.execute(
      `SELECT p.*, tm.role FROM places p
       JOIN trip_members tm ON p.trip_id = tm.trip_id AND tm.user_id = ?
       WHERE p.id = ? AND p.trip_id = ?`,
      [userId, placeId, tripId]
    );

    const placesRows = places as any[];

    if (placesRows.length === 0 || (placesRows[0].suggested_by !== userId && !canManageTrip(placesRows[0].role))) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав на удаление этого места'
      });
    }

    await db.execute(`DELETE FROM places WHERE id = ?`, [placeId]);

    res.json({
      success: true,
      message: 'Место удалено'
    });
  } catch (error) {
    console.error('Delete place error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении места'
    });
  }
};

// Обновить таймлайн места
export const updatePlaceTimeline = async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params;
    const { tripId } = req.params;
    const { visit_date, visit_time, visit_order } = req.body;
    const userId = (req as any).user.id;

    // 👇 ИСПРАВЛЕНИЕ: правильное преобразование даты
    let formattedDate = visit_date;
    if (typeof visit_date === 'string' && visit_date) {
      // Если дата в ISO формате, берем только YYYY-MM-DD
      if (visit_date.includes('T')) {
        formattedDate = visit_date.split('T')[0];
      } else if (visit_date.includes('-')) {
        // Если дата уже в формате YYYY-MM-DD, оставляем как есть
        formattedDate = visit_date;
      }
    }

    console.log('📥 Получен запрос:', { 
      placeId, 
      original_date: visit_date,
      formatted_date: formattedDate,
      visit_time, 
      visit_order, 
      userId 
    });

    // Проверяем права
    const [places] = await db.execute(
      `SELECT p.* FROM places p
       JOIN trip_members tm ON p.trip_id = tm.trip_id
       WHERE p.id = ? AND p.trip_id = ? AND tm.user_id = ?`,
      [placeId, tripId, userId]
    );

    const placesRows = places as any[];

    if (placesRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'У вас нет прав на редактирование этого места'
      });
    }

    const fields: string[] = [];
    const values: Array<string | number | null> = [];
    if (visit_date !== undefined) {
      fields.push('visit_date = ?');
      values.push(formattedDate || null);
    }
    if (visit_time !== undefined) {
      fields.push('visit_time = ?');
      values.push(visit_time || null);
    }
    if (visit_order !== undefined) {
      fields.push('visit_order = ?');
      values.push(Number(visit_order));
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Нет данных для обновления' });
    }

    await db.execute(
      `UPDATE places 
       SET ${fields.join(', ')}
       WHERE id = ?`,
      [...values, placeId]
    );

    console.log('✅ Таймлайн обновлен');

    res.json({
      success: true,
      message: 'Таймлайн обновлен'
    });
  } catch (error) {
    console.error('❌ Update timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении таймлайна'
    });
  }
};

// Голосовать за место
export const votePlace = async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params;
    const { tripId } = req.params;
    const { vote } = req.body;
    const userId = (req as any).user.id;

    if (!vote || !['up', 'down'].includes(vote)) {
      return res.status(400).json({
        success: false,
        message: 'Неверное значение голоса'
      });
    }

    const [places] = await db.execute(
      `SELECT p.id FROM places p
       JOIN trip_members tm ON tm.trip_id = p.trip_id AND tm.user_id = ?
       WHERE p.id = ? AND p.trip_id = ?`,
      [userId, placeId, tripId]
    );

    const placesRows = places as any[];

    if (placesRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Место не найдено'
      });
    }

    const [existingVotes] = await db.execute(
      `SELECT * FROM place_votes WHERE place_id = ? AND user_id = ?`,
      [placeId, userId]
    );

    const existingVotesRows = existingVotes as any[];

    if (existingVotesRows.length > 0 && existingVotesRows[0].vote === vote) {
      await db.execute(
        `DELETE FROM place_votes WHERE place_id = ? AND user_id = ?`,
        [placeId, userId]
      );
    } else if (existingVotesRows.length > 0) {
      await db.execute(
        `UPDATE place_votes SET vote = ? WHERE place_id = ? AND user_id = ?`,
        [vote, placeId, userId]
      );
    } else {
      await db.execute(
        `INSERT INTO place_votes (place_id, user_id, vote) VALUES (?, ?, ?)`,
        [placeId, userId, vote]
      );
    }

    const [votes] = await db.execute(
      `SELECT 
        COUNT(CASE WHEN vote = 'up' THEN 1 END) as upvotes,
        COUNT(CASE WHEN vote = 'down' THEN 1 END) as downvotes
       FROM place_votes 
       WHERE place_id = ?`,
      [placeId]
    );

    res.json({
      success: true,
      message: 'Голос учтен',
      votes: (votes as any[])[0]
    });
  } catch (error) {
    console.error('Vote place error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при голосовании'
    });
  }
};
