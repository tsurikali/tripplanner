import { votePlace } from '../controllers/placeController';
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  getPlaces,
  createPlace,
  updatePlace,
  deletePlace,
  updatePlaceTimeline
} from '../controllers/placeController';

const router = express.Router({ mergeParams: true });

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Получить все места путешествия
router.get('/', getPlaces);

// Добавить новое место
router.post('/', createPlace);

// Обновить место
router.put('/:placeId', updatePlace);

// Удалить место
router.delete('/:placeId', deletePlace);

// Обновить таймлайн места
router.put('/:placeId/timeline', updatePlaceTimeline);

// Голосовать за место
router.post('/:placeId/vote', votePlace);

export default router;