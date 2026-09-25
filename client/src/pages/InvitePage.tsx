import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvitation, acceptInvitation, declineInvitation } from '../services/invitationService';
import { getCurrentUser } from '../services/authService';
import toast from 'react-hot-toast';

const InvitePage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [invitation, setInvitation] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [user] = useState(getCurrentUser());

    useEffect(() => {
        loadInvitation();
    }, [token]);

    const loadInvitation = async () => {
        try {
            if (!token) return;
            const data = await getInvitation(token);
            setInvitation(data);
        } catch (error: any) {
            setError(error.response?.data?.message || 'Приглашение не найдено');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!user) {
            navigate('/login', { state: { from: `/invite/${token}` } });
            return;
        }

        try {
            setLoading(true);
            const result = await acceptInvitation(token!);
            toast.success('Вы присоединились к путешествию!');
            navigate(`/trip/${result.tripId}`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Ошибка при принятии приглашения');
        } finally {
            setLoading(false);
        }
    };

    const handleDecline = async () => {
        try {
            setLoading(true);
            await declineInvitation(token!);
            toast.success('Приглашение отклонено');
            navigate('/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Ошибка');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Загрузка...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md p-6 bg-white rounded-xl shadow-lg">
                    <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-2xl font-bold text-gray-800 mt-4">Ошибка</h2>
                    <p className="text-gray-600 mt-2">{error}</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                    >
                        На главную
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-8">
                <div className="text-center mb-8">
                    <svg className="w-16 h-16 text-blue-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13.5 10c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5z" />
                    </svg>
                    <h1 className="text-3xl font-bold text-gray-800 mt-4">Приглашение в путешествие</h1>
                </div>

                <div className="bg-blue-50 rounded-lg p-6 mb-6">
                    <p className="text-lg font-semibold text-gray-800">{invitation?.trip_name}</p>
                    <p className="text-gray-600 mt-2">{invitation?.destination}</p>
                    <div className="flex items-center mt-4 text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Пригласил(а): {invitation?.inviter_name}
                    </div>
                </div>

                <div className="space-y-3">
                    {!user ? (
                        <>
                            <p className="text-sm text-gray-600 text-center mb-4">
                                Чтобы принять приглашение, войдите или зарегистрируйтесь
                            </p>
                            <button
                                onClick={() => navigate('/login', { state: { from: `/invite/${token}` } })}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition"
                            >
                                Войти
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleAccept}
                                disabled={loading}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-50"
                            >
                                Принять приглашение
                            </button>
                            <button
                                onClick={handleDecline}
                                disabled={loading}
                                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-medium transition disabled:opacity-50"
                            >
                                Отклонить
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvitePage;