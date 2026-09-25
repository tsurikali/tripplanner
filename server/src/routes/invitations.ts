import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
    sendInvitation,
    getInvitation,
    acceptInvitation,
    declineInvitation
} from '../controllers/invitationController';

const router = express.Router();

// Публичные маршруты (не требуют аутентификации для просмотра приглашения)
router.get('/:token', getInvitation);
router.post('/:token/accept', authenticateToken, acceptInvitation);
router.post('/:token/decline', authenticateToken, declineInvitation);

export default router;