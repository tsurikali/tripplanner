import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logoutUser } from '../services/authService';
import { getUserTrips, Trip } from '../services/tripService';
import CreateTripModal from '../components/CreateTripModal';
import toast from 'react-hot-toast';
import { deleteTrip } from '../services/tripService';


const DashboardPage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }

    setUser(currentUser);
    loadTrips();
  }, [navigate]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const userTrips = await getUserTrips();
      setTrips(userTrips);
    } catch (error) {
      console.error('Load trips error:', error);
      toast.error('Ошибка при загрузке путешествий');
    } finally {
      setLoading(false);
    }
  };
  // Функция для перехода в бюджет последнего активного путешествия
  const handleBudgetClick = () => {
    // Ищем активные путешествия (статус planning или active)
    const activeTrips = trips.filter(t => t.status === 'planning' || t.status === 'active');

    if (activeTrips.length === 0) {
      toast.error('Нет активных путешествий');
      return;
    }

    // Берём последнее активное путешествие
    const latestTrip = activeTrips[0];
    navigate(`/trip/${latestTrip.id}`, { state: { activeTab: 'budget' } });
  };
  const handleCreateTrip = () => {
    setIsModalOpen(true);
  };

  const handleTripCreated = () => {
    loadTrips();
  };

  const handleLogout = () => {
    logoutUser();
  };

  const handleOpenTrip = (tripId: number) => {
    navigate(`/trip/${tripId}`);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Даты не указаны';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Статистика
  const activeTrips = trips.filter(t => t.status === 'planning' || t.status === 'active').length;
  const totalBudget = trips.reduce((sum, t) => {
  const budget = typeof t.total_budget === 'string' ? parseFloat(t.total_budget) : (t.total_budget || 0);
  return sum + budget;
}, 0);
  const totalMembers = trips.reduce((sum, t) => sum + (t.members_count || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка дашборда...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Навигация */}
      <nav className="bg-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-blue-600">TripPlanner</h1>

              <div className="hidden md:flex space-x-6">
                <span className="text-gray-700 font-medium">Мои путешествия</span>
                <button
                  onClick={handleCreateTrip}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  + Создать новое
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-gray-700 hidden md:block">
                Привет, {user?.name}!
              </span>

              <button
                onClick={handleLogout}
                className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg font-medium transition"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Основной контент */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Мои путешествия</h1>
            <p className="text-gray-600 mt-2">Управляйте своими поездками и приглашайте друзей</p>
          </div>
          <button
            onClick={handleCreateTrip}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Новое путешествие
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Активные путешествия</p>
                <p className="text-2xl font-bold text-gray-800">{activeTrips}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Общий бюджет</p>
                <p className="text-2xl font-bold text-gray-800">{totalBudget.toLocaleString()} ₽</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Всего участников</p>
                <p className="text-2xl font-bold text-gray-800">{totalMembers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Список путешествий */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Все путешествия</h2>
          </div>

          {trips.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-4 text-gray-600">У вас пока нет путешествий</p>
              <button
                onClick={handleCreateTrip}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Создать первое путешествие
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {trips.map((trip) => (
                <div
                  key={trip.id}
                  className="p-6 hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => handleOpenTrip(trip.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{trip.name}</h3>
                      <div className="flex items-center mt-2 space-x-4">
                        <span className="text-gray-600">{trip.destination}</span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600">{formatDate(trip.start_date)}</span>
                        {trip.end_date && (
                          <>
                            <span className="text-gray-500">—</span>
                            <span className="text-gray-600">{formatDate(trip.end_date)}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center mt-2 space-x-4">
                        <span className="flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13.5 10c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5z" />
                          </svg>
                          {trip.members_count || 1} участников
                        </span>
                        <span className="flex items-center text-sm text-gray-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {trip.places_count || 0} мест
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${trip.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                        trip.status === 'active' ? 'bg-green-100 text-green-800' :
                          trip.status === 'completed' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                        {trip.status === 'planning' ? 'Планируется' :
                          trip.status === 'active' ? 'Активно' :
                            trip.status === 'completed' ? 'Завершено' : 'Отменено'}
                      </span>
                      {/* После статуса и перед кнопкой перехода добавьте: */}
                      {user?.id === trip.created_by && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation(); // Чтобы не открывалось путешествие
                            if (window.confirm(`Вы уверены, что хотите удалить путешествие "${trip.name}"?`)) {
                              try {
                                await deleteTrip(trip.id);
                                toast.success('Путешествие удалено');
                                loadTrips(); // Перезагружаем список
                              } catch (error) {
                                toast.error('Ошибка при удалении');
                              }
                            }
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 transition mr-2"
                          title="Удалить путешествие"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                      <button className="text-blue-600 hover:text-blue-800">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Быстрые действия */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Быстрые действия</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={handleCreateTrip}
              className="bg-white p-4 rounded-lg shadow text-center hover:shadow-md transition"
            >
              <div className="text-blue-600 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="font-medium">Новое путешествие</p>
            </button>

            <button
              onClick={() => {
                const activeTrips = trips.filter(t => t.status === 'planning' || t.status === 'active');
                if (activeTrips.length === 0) {
                  toast.error('Нет активных путешествий');
                  return;
                }
                // Переходим в первое активное путешествие и открываем вкладку с участниками
                navigate(`/trip/${activeTrips[0].id}`, { state: { activeTab: 'members' } });
              }}
              className="bg-white p-4 rounded-lg shadow text-center hover:shadow-md transition"
            >
              <div className="text-green-600 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="font-medium">Пригласить друзей</p>
            </button>

            <button
              onClick={handleBudgetClick}
              className="bg-white p-4 rounded-lg shadow text-center hover:shadow-md transition"
            >
              <div className="text-purple-600 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="font-medium">Бюджет</p>
              {trips.filter(t => t.status === 'planning' || t.status === 'active').length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {trips.filter(t => t.status === 'planning' || t.status === 'active').length} активных
                </p>
              )}
            </button>

            <button
              onClick={() => {
                const activeTrips = trips.filter(t => t.status === 'planning' || t.status === 'active');
                if (activeTrips.length === 0) {
                  toast.error('Нет активных путешествий');
                  return;
                }
                // Переходим в первое активное путешествие и открываем вкладку с чатом
                navigate(`/trip/${activeTrips[0].id}`, { state: { activeTab: 'chat' } });
              }}
              className="bg-white p-4 rounded-lg shadow text-center hover:shadow-md transition"
            >
              <div className="text-yellow-600 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="font-medium">Обсуждения</p>
              {trips.filter(t => t.status === 'planning' || t.status === 'active').length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  {trips.filter(t => t.status === 'planning' || t.status === 'active').length} активных
                </p>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно создания путешествия */}
      <CreateTripModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleTripCreated}
      />
    </div>
  );
};

export default DashboardPage;