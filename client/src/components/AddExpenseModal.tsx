import React, { useState, useEffect } from 'react';
import { createExpense } from '../services/expenseService';
import toast from 'react-hot-toast';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: number;
  members: any[];
  onSuccess: () => void;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ isOpen, onClose, tripId, members, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: 'food',
    paid_by: ''
  });
  const [participants, setParticipants] = useState<{ user_id: number; share_amount: number }[]>([]);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'food', label: 'Еда' },
    { value: 'transport', label: 'Транспорт' },
    { value: 'accommodation', label: 'Проживание' },
    { value: 'entertainment', label: 'Развлечения' },
    { value: 'other', label: 'Другое' }
  ];

  useEffect(() => {
    if (members.length > 0) {
      // По умолчанию все участники
      setParticipants(members.map(m => ({
        user_id: m.id,
        share_amount: 0
      })));
    }
  }, [members]);

  useEffect(() => {
    if (splitType === 'equal' && formData.amount) {
      const amount = parseFloat(formData.amount) || 0;
      const share = amount / participants.length;
      setParticipants(prev => 
        prev.map(p => ({ ...p, share_amount: share }))
      );
    }
  }, [formData.amount, splitType, participants.length]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleParticipantShare = (userId: number, share: string) => {
    const shareAmount = parseFloat(share) || 0;
    setParticipants(prev =>
      prev.map(p =>
        p.user_id === userId ? { ...p, share_amount: shareAmount } : p
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.amount || !formData.paid_by) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Введите корректную сумму');
      return;
    }

    // Проверяем, что сумма долей совпадает с общей суммой
    const totalShares = participants.reduce((sum, p) => sum + p.share_amount, 0);
    if (Math.abs(totalShares - amount) > 0.01) {
      toast.error('Сумма долей не совпадает с общей суммой');
      return;
    }

    setLoading(true);
    
    try {
      await createExpense(tripId, {
        name: formData.name,
        amount,
        category: formData.category,
        paid_by: parseInt(formData.paid_by),
        participants: participants.filter(p => p.share_amount > 0)
      });
      
      toast.success('Расход добавлен!');
      onSuccess();
      onClose();
      
      // Сброс формы
      setFormData({
        name: '',
        amount: '',
        category: 'food',
        paid_by: ''
      });
    } catch (error: any) {
      toast.error(error.message || 'Ошибка при добавлении расхода');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Добавить расход</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Название *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Например: Ужин в ресторане"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Сумма *
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="1000"
                min="0"
                step="0.01"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Категория
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                disabled={loading}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Кто заплатил? *
              </label>
              <select
                name="paid_by"
                value={formData.paid_by}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
                disabled={loading}
              >
                <option value="">Выберите...</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Разделить между
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setSplitType('equal')}
                    className={`px-3 py-1 text-sm rounded ${
                      splitType === 'equal'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Поровну
                  </button>
                  <button
                    type="button"
                    onClick={() => setSplitType('custom')}
                    className={`px-3 py-1 text-sm rounded ${
                      splitType === 'custom'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Свои доли
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {members.map(member => {
                  const participant = participants.find(p => p.user_id === member.id);
                  return (
                    <div key={member.id} className="flex items-center justify-between">
                      <span className="text-sm">{member.name}</span>
                      {splitType === 'custom' ? (
                        <input
                          type="number"
                          value={participant?.share_amount || 0}
                          onChange={(e) => handleParticipantShare(member.id, e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                          min="0"
                          step="0.01"
                          disabled={loading}
                        />
                      ) : (
                        <span className="text-sm font-medium">
                          {participant?.share_amount.toFixed(2)} ₽
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                disabled={loading}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Добавление...
                  </>
                ) : 'Добавить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddExpenseModal;