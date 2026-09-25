import { Request, Response } from 'express';
import { db } from '../config/database';
import { OkPacket } from 'mysql2';
import crypto from 'crypto';
import { canManageTrip, getTripRole } from '../services/tripAccessService';

// Сгенерировать уникальный токен
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Отправить приглашение
export const sendInvitation = async (req: Request, res: Response) => {
    try {
        const { tripId } = req.params;
        const { email, role } = req.body;
        const userId = (req as any).user.id;

        if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Укажите корректный email' });
        }

        if (role && !['admin', 'member'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Некорректная роль участника' });
        }

        // Проверяем, что пользователь является создателем или админом
        const tripRole = await getTripRole(tripId, userId);
        if (!canManageTrip(tripRole)) {
            return res.status(403).json({
                success: false,
                message: 'Только создатель или администратор может приглашать участников'
            });
        }

        // Проверяем, не участник ли уже
        const [members] = await db.execute(
            `SELECT * FROM trip_members WHERE trip_id = ? AND user_id = (SELECT id FROM users WHERE email = ?)`,
            [tripId, email]
        );

        const membersRows = members as any[];

        if (membersRows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Пользователь уже является участником'
            });
        }

        // Генерируем токен
        const token = generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней на принятие

        // Сохраняем приглашение
        await db.execute(
            `INSERT INTO invitations (trip_id, email, token, role, invited_by, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [tripId, email, token, role || 'member', userId, expiresAt]
        );

        // Формируем ссылку-приглашение
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
        const inviteLink = `${clientUrl}/invite/${token}`;

        // TODO: Здесь будет отправка email (пока просто возвращаем ссылку)
        console.log('🔗 Ссылка-приглашение:', inviteLink);

        res.status(201).json({
            success: true,
            message: 'Приглашение отправлено',
            inviteLink // Временно, потом убрать
        });

    } catch (error) {
        console.error('❌ Send invitation error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при отправке приглашения'
        });
    }
};

// Получить информацию о приглашении по токену
export const getInvitation = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;

        const [invitations] = await db.execute(
            `SELECT i.*, t.name as trip_name, t.destination, u.name as inviter_name
             FROM invitations i
             JOIN trips t ON i.trip_id = t.id
             JOIN users u ON i.invited_by = u.id
             WHERE i.token = ? AND i.status = 'pending' AND i.expires_at > NOW()`,
            [token]
        );

        const invitationsRows = invitations as any[];

        if (invitationsRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Приглашение не найдено или истекло'
            });
        }

        res.json({
            success: true,
            invitation: invitationsRows[0]
        });

    } catch (error) {
        console.error('❌ Get invitation error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при получении приглашения'
        });
    }
};

// Принять приглашение
export const acceptInvitation = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const userId = (req as any).user.id;

        // Получаем приглашение
        const [invitations] = await db.execute(
            `SELECT * FROM invitations 
             WHERE token = ? AND status = 'pending' AND expires_at > NOW()`,
            [token]
        );

        const invitationsRows = invitations as any[];

        if (invitationsRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Приглашение не найдено или истекло'
            });
        }

        const invitation = invitationsRows[0];

        const [users] = await db.execute(
            'SELECT email FROM users WHERE id = ?',
            [userId]
        );
        const userRows = users as Array<{ email: string }>;

        if (!userRows[0] || userRows[0].email.toLowerCase() !== invitation.email.toLowerCase()) {
            return res.status(403).json({
                success: false,
                message: 'Это приглашение предназначено для другого пользователя'
            });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            await connection.execute(
                `INSERT INTO trip_members (trip_id, user_id, role)
                 VALUES (?, ?, ?)`,
                [invitation.trip_id, userId, invitation.role]
            );
            await connection.execute(
                `UPDATE invitations SET status = 'accepted' WHERE token = ?`,
                [token]
            );
            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

        res.json({
            success: true,
            message: 'Приглашение принято',
            tripId: invitation.trip_id
        });

    } catch (error) {
        console.error('❌ Accept invitation error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при принятии приглашения'
        });
    }
};

// Отклонить приглашение
export const declineInvitation = async (req: Request, res: Response) => {
    try {
        const { token } = req.params;
        const userId = (req as any).user.id;

        const [result] = await db.execute(
            `UPDATE invitations i
             JOIN users u ON u.id = ?
             SET i.status = 'declined'
             WHERE i.token = ? AND i.status = 'pending' AND i.expires_at > NOW()
               AND LOWER(i.email) = LOWER(u.email)`,
            [userId, token]
        );

        if ((result as OkPacket).affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Приглашение не найдено или недоступно' });
        }

        res.json({
            success: true,
            message: 'Приглашение отклонено'
        });

    } catch (error) {
        console.error('❌ Decline invitation error:', error);
        res.status(500).json({
            success: false,
            message: 'Ошибка при отклонении приглашения'
        });
    }
};
