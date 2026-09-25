import api from './api';

export interface Expense {
  id: number;
  name: string;
  amount: number;
  category: string;
  paid_by: number;
  paid_by_name?: string;
  created_at: string;
  participants?: ExpenseParticipant[];
}

export interface ExpenseParticipant {
  user_id: number;
  name?: string;
  share_amount: number;
  is_paid?: boolean;
}

export interface CreateExpenseData {
  name: string;
  amount: number;
  category: string;
  paid_by: number;
  participants: { user_id: number; share_amount: number }[];
}

export interface Balance {
  userId: number;
  name: string;
  paid: number;
  owes: number;
  balance: number;
}

export interface Debt {
  from: number;
  fromName: string;
  to: number;
  toName: string;
  amount: number;
}

// Получить все расходы путешествия
export const getExpenses = async (tripId: number): Promise<Expense[]> => {
  try {
    const response = await api.get(`/trips/${tripId}/expenses`);
    return response.data.expenses;
  } catch (error) {
    console.error('Get expenses error:', error);
    throw error;
  }
};

// Добавить новый расход
export const createExpense = async (tripId: number, data: CreateExpenseData): Promise<Expense> => {
  try {
    const response = await api.post(`/trips/${tripId}/expenses`, data);
    return response.data.expense;
  } catch (error) {
    console.error('Create expense error:', error);
    throw error;
  }
};

// Удалить расход
export const deleteExpense = async (tripId: number, expenseId: number): Promise<void> => {
  try {
    await api.delete(`/trips/${tripId}/expenses/${expenseId}`);
  } catch (error) {
    console.error('Delete expense error:', error);
    throw error;
  }
};

// Получить баланс участников
export const getBalance = async (tripId: number): Promise<{ balances: Balance[], debts: Debt[] }> => {
  try {
    const response = await api.get(`/trips/${tripId}/expenses/balance`);
    return response.data;
  } catch (error) {
    console.error('Get balance error:', error);
    throw error;
  }
};