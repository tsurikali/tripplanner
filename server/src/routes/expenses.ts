import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getBalance
} from '../controllers/expenseController';

const router = express.Router({ mergeParams: true });

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Получить все расходы путешествия
router.get('/', getExpenses);

// Добавить новый расход
router.post('/', createExpense);

// Получить баланс участников
router.get('/balance', getBalance);

// Обновить расход
router.put('/:expenseId', updateExpense);

// Удалить расход
router.delete('/:expenseId', deleteExpense);

export default router;