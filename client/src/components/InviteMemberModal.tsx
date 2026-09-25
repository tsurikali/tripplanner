import React, { useState } from 'react';
import { sendInvitation } from '../services/invitationService';
import toast from 'react-hot-toast';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    tripId: number;
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ isOpen, onClose, tripId }) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('member');
    const [loading, setLoading] = useState(false);
    const [inviteLink, setInviteLink] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            toast.error('Введите email');
            return;
        }

        setLoading(true);

        try {
            const result = await sendInvitation(tripId, email, role);
            setInviteLink(result.inviteLink);
            toast.success('Приглашение создано!');
            setEmail('');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Ошибка при отправке приглашения');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        toast.success('Ссылка скопирована');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-800">Пригласить участника</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {!inviteLink ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email участника
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="friend@example.com"
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Роль
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    disabled={loading}
                                >
                                    <option value="member">Участник</option>
                                    <option value="admin">Администратор</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition disabled:opacity-50"
                            >
                                {loading ? 'Отправка...' : 'Создать приглашение'}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-green-600 font-medium">✅ Приглашение создано!</p>
                            <p className="text-sm text-gray-600">Отправьте эту ссылку другу:</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inviteLink}
                                    readOnly
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                />
                                <button
                                    onClick={copyToClipboard}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Копировать
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">
                                Ссылка действительна 7 дней
                            </p>
                            <button
                                onClick={() => setInviteLink('')}
                                className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg transition"
                            >
                                Пригласить ещё
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InviteMemberModal;