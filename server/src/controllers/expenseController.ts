import { Request, Response } from 'express';
import { db } from '../config/database';
import { OkPacket } from 'mysql2';
import { canManageTrip, getTripRole } from '../services/tripAccessService';

// Получить все расходы путешествия
export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = (req as any).user.id;

    if (!(await getTripRole(tripId, userId))) {
      return res.status(403).json({ success: false, message: 'Нет доступа к этому путешествию' });
    }

    const [expenses] = await db.execute(
      `SELECT e.*, 
        u.name as paid_by_name,
        (SELECT SUM(share_amount) FROM expense_participants WHERE expense_id = e.id) as total_share
       FROM expenses e
       LEFT JOIN users u ON e.paid_by = u.id
       WHERE e.trip_id = ?
       ORDER BY e.created_at DESC`,
      [tripId]
    );

    // Для каждого расхода получаем участников
    const expensesWithParticipants = await Promise.all(
      (expenses as any[]).map(async (expense) => {
        const [participants] = await db.execute(
          `SELECT ep.*, u.name, u.email 
           FROM expense_participants ep
           JOIN users u ON ep.user_id = u.id
           WHERE ep.expense_id = ?`,
          [expense.id]
        );
        return { ...expense, participants };
      })
    );

    res.json({
      success: true,
      expenses: expensesWithParticipants
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении расходов'
    });
  }
};

// Добавить новый расход
export const createExpense = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const { name, amount, category, paid_by, participants } = req.body;
    const userId = (req as any).user.id;

    if (!name || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !paid_by) {
      return res.status(400).json({
        success: false,
        message: 'Название, сумма и плательщик обязательны'
      });
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ success: false, message: 'Укажите участников расхода' });
    }

    const participantIds = participants.map((participant) => Number(participant.user_id));
    const totalShare = participants.reduce((sum, participant) => sum + Number(participant.share_amount), 0);
    if (participantIds.some((participantId) => !Number.isInteger(participantId)) ||
        participants.some((participant) => !Number.isFinite(Number(participant.share_amount)) || Number(participant.share_amount) < 0) ||
        Math.abs(totalShare - Number(amount)) > 0.01) {
      return res.status(400).json({ success: false, message: 'Сумма долей должна совпадать с суммой расхода' });
    }

    const placeholders = [...new Set([...participantIds, Number(paid_by)])].map(() => '?').join(', ');
    const [members] = await db.execute(
      `SELECT user_id FROM trip_members WHERE trip_id = ? AND user_id IN (${placeholders})`,
      [tripId, ...new Set([...participantIds, Number(paid_by)])]
    );
    if ((members as any[]).length !== new Set([...participantIds, Number(paid_by)]).size) {
      return res.status(400).json({ success: false, message: 'Плательщик и участники должны состоять в путешествии' });
    }

    const connection = await db.getConnection();
    let expenseId: number;
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        `INSERT INTO expenses (trip_id, name, amount, category, paid_by)
         VALUES (?, ?, ?, ?, ?)`,
        [tripId, name, amount, category || 'other', paid_by]
      );
      expenseId = (result as OkPacket).insertId;

      for (const participant of participants) {
        await connection.execute(
          `INSERT INTO expense_participants (expense_id, user_id, share_amount)
           VALUES (?, ?, ?)`,
          [expenseId, participant.user_id, participant.share_amount]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    // Получаем созданный расход
    const [expenses] = await db.execute(
      `SELECT e.*, u.name as paid_by_name
       FROM expenses e
       LEFT JOIN users u ON e.paid_by = u.id
       WHERE e.id = ?`,
      [expenseId]
    );

    const expenseRows = expenses as any[];

    res.status(201).json({
      success: true,
      message: 'Расход успешно добавлен',
      expense: expenseRows[0]
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при добавлении расхода'
    });
  }
};

// Обновить расход
export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { expenseId } = req.params;
    const { tripId } = req.params;
    const { name, amount, category } = req.body;
    const userId = (req as any).user.id;

    if (!name || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Укажите название и положительную сумму расхода' });
    }

    const tripRole = await getTripRole(tripId, userId);
    const [expenses] = await db.execute(
      `SELECT e.paid_by, COALESCE(SUM(ep.share_amount), 0) AS total_share
       FROM expenses e
       LEFT JOIN expense_participants ep ON ep.expense_id = e.id
       WHERE e.id = ? AND e.trip_id = ?
       GROUP BY e.id`,
      [expenseId, tripId]
    );
    const expense = (expenses as any[])[0];
    if (!expense || (expense.paid_by !== userId && !canManageTrip(tripRole))) {
      return res.status(403).json({ success: false, message: 'Нет прав на изменение этого расхода' });
    }
    if (Math.abs(Number(expense.total_share) - Number(amount)) > 0.01) {
      return res.status(400).json({ success: false, message: 'Измените доли участников вместе с суммой расхода' });
    }

    await db.execute(
      `UPDATE expenses 
       SET name = ?, amount = ?, category = ?
       WHERE id = ? AND trip_id = ?`,
      [name, amount, category, expenseId, tripId]
    );

    res.json({
      success: true,
      message: 'Расход обновлен'
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении расхода'
    });
  }
};

// Удалить расход
export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { expenseId } = req.params;
    const { tripId } = req.params;
    const userId = (req as any).user.id;

    const tripRole = await getTripRole(tripId, userId);
    const [expenses] = await db.execute(
      'SELECT paid_by FROM expenses WHERE id = ? AND trip_id = ?',
      [expenseId, tripId]
    );
    const expense = (expenses as any[])[0];
    if (!expense || (expense.paid_by !== userId && !canManageTrip(tripRole))) {
      return res.status(403).json({ success: false, message: 'Нет прав на удаление этого расхода' });
    }

    await db.execute(`DELETE FROM expenses WHERE id = ? AND trip_id = ?`, [expenseId, tripId]);

    res.json({
      success: true,
      message: 'Расход удален'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении расхода'
    });
  }
};

// Получить баланс участников
export const getBalance = async (req: Request, res: Response) => {
  try {
    const { tripId } = req.params;
    const userId = (req as any).user.id;

    if (!(await getTripRole(tripId, userId))) {
      return res.status(403).json({ success: false, message: 'Нет доступа к этому путешествию' });
    }

    // Получаем всех участников путешествия
    const [members] = await db.execute(
      `SELECT u.id, u.name, u.email
       FROM trip_members tm
       JOIN users u ON tm.user_id = u.id
       WHERE tm.trip_id = ?`,
      [tripId]
    );

    // Получаем все расходы
    const [expenses] = await db.execute(
      `SELECT e.*, ep.user_id, ep.share_amount
       FROM expenses e
       JOIN expense_participants ep ON e.id = ep.expense_id
       WHERE e.trip_id = ?`,
      [tripId]
    );

    // Рассчитываем баланс для каждого участника
    const balanceMap = new Map();
    
    // Инициализируем балансы
    (members as any[]).forEach(member => {
      balanceMap.set(member.id, {
        userId: member.id,
        name: member.name,
        paid: 0,      // сколько заплатил
        owes: 0,      // сколько должен
        balance: 0    // итого (+ должен получить, - должен отдать)
      });
    });

    // Считаем
    (expenses as any[]).forEach(expense => {
      const payerId = expense.paid_by;
      const participantId = expense.user_id;
      const amount = expense.share_amount;

      // Тот, кто заплатил
      if (balanceMap.has(payerId)) {
        balanceMap.get(payerId).paid += amount;
      }

      // Участник (может быть тем же человеком)
      if (balanceMap.has(participantId)) {
        balanceMap.get(participantId).owes += amount;
      }
    });

    // Вычисляем итоговый баланс
    const balances = Array.from(balanceMap.values()).map(user => ({
      ...user,
      balance: user.paid - user.owes
    }));

    // Упрощаем долги (кто кому должен)
    const debts = [];
    const debtors = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);
    const creditors = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      
      const amount = Math.min(-debtor.balance, creditor.balance);
      
      if (amount > 0.01) { // Игнорируем копейки
        debts.push({
          from: debtor.userId,
          fromName: debtor.name,
          to: creditor.userId,
          toName: creditor.name,
          amount: Math.round(amount * 100) / 100
        });
      }

      debtor.balance += amount;
      creditor.balance -= amount;

      if (Math.abs(debtor.balance) < 0.01) i++;
      if (Math.abs(creditor.balance) < 0.01) j++;
    }

    res.json({
      success: true,
      balances,
      debts
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при расчете баланса'
    });
  }
};
