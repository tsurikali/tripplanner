import express from 'express';
import expenseRoutes from './expenses';
import { authenticateToken } from '../middleware/authMiddleware';
import placeRoutes from './places'; // Добавить импорт
import { sendInvitation } from '../controllers/invitationController';
import { getMessages } from '../controllers/messageController';
import {
  getUserTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip
} from '../controllers/tripController';

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Получить все путешествия пользователя
router.get('/', getUserTrips);

// Получить одно путешествие
router.get('/:id', getTripById);

router.get('/:tripId/messages', getMessages);

// Создать новое путешествие
router.post('/', createTrip);

// Обновить путешествие
router.put('/:id', updateTrip);

// Удалить путешествие
router.delete('/:id', deleteTrip);

// Пригласить участника
router.post('/:tripId/invite', sendInvitation);

// Вложенные маршруты для мест
router.use('/:tripId/places', placeRoutes); // Добавить эту строку

// Вложенные маршруты для расходов
router.use('/:tripId/expenses', expenseRoutes);

export default router;
