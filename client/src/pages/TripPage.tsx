import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getTripById, Trip } from '../services/tripService';
import { getCurrentUser } from '../services/authService';
import AddPlaceModal from '../components/AddPlaceModal';
import { votePlace } from '../services/placeService';
import toast from 'react-hot-toast';
import OSMMapComponent from '../components/OSMMapComponent';
import { deletePlace } from '../services/placeService';
import { getExpenses, getBalance, deleteExpense } from '../services/expenseService';
import AddExpenseModal from '../components/AddExpenseModal';
import Timeline from '../components/Timeline';
import InviteMemberModal from '../components/InviteMemberModal';
import Chat from '../components/Chat';

type TabType = 'overview' | 'places' | 'map' | 'timeline' | 'budget' | 'members' | 'chat';

const categories = [
  { value: 'attraction', label: 'Достопримечательность' },
  { value: 'restaurant', label: 'Ресторан/Кафе' },
  { value: 'hotel', label: 'Отель' },
  { value: 'transport', label: 'Транспорт' },
  { value: 'other', label: 'Другое' }
];

const TripPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [user, setUser] = useState<any>(null);
  const [isAddPlaceModalOpen, setIsAddPlaceModalOpen] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setUser(currentUser);

    if (id) {
      loadTripData(parseInt(id));

      // 👇 ЭТО НОВЫЙ КОД - добавляем
      // Если пришли с параметром activeTab, переключаем вкладку
      if (location.state?.activeTab) {
        setActiveTab(location.state.activeTab as TabType);
      }
    }
  }, [id, navigate, location.state]); // 👈 добавьте location.state в зависимости

  const loadExpenses = async (tripId: number) => {
    try {
      const data = await getExpenses(tripId);
      setExpenses(data);

      const balanceData = await getBalance(tripId);
      setBalances(balanceData.balances);
      setDebts(balanceData.debts);
    } catch (error) {
      console.error('Load expenses error:', error);
    }
  };
  const handleVote = async (placeId: number, voteType: 'up' | 'down') => {
    try {
      if (!id) return;
      console.log('Voting:', { placeId, voteType, userId: user?.id });
      // Оптимистичное обновление UI
      setPlaces(prevPlaces =>
        prevPlaces.map(place => {
          if (place.id === placeId) {
            // Если пользователь уже голосовал так же - отменяем голос
            if (place.user_vote === voteType) {
              return {
                ...place,
                user_vote: null,
                upvotes: voteType === 'up' ? place.upvotes - 1 : place.upvotes,
                downvotes: voteType === 'down' ? place.downvotes - 1 : place.downvotes
              };
            }

            // Если голосовал противоположно - меняем
            if (place.user_vote) {
              return {
                ...place,
                user_vote: voteType,
                upvotes: voteType === 'up' ? place.upvotes + 1 : place.upvotes - 1,
                downvotes: voteType === 'down' ? place.downvotes + 1 : place.downvotes - 1
              };
            }

            // Если не голосовал - добавляем голос
            return {
              ...place,
              user_vote: voteType,
              upvotes: voteType === 'up' ? place.upvotes + 1 : place.upvotes,
              downvotes: voteType === 'down' ? place.downvotes + 1 : place.downvotes
            };
          }
          return place;
        })
      );

      // Отправляем запрос на сервер
      await votePlace(parseInt(id), placeId, voteType);

    } catch (error) {
      console.error('Vote error:', error);
      toast.error('Ошибка при голосовании');
      // В случае ошибки перезагружаем данные
      loadTripData(parseInt(id!));
    }
  };

  const loadTripData = async (tripId: number) => {
    try {
      setLoading(true);
      const data = await getTripById(tripId);
      setTrip(data.trip);
      setMembers(data.members || []);
      setPlaces(data.places || []);
      await loadExpenses(tripId);
    } catch (error) {
      console.error('Load trip error:', error);
      toast.error('Ошибка при загрузке путешествия');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Не указано';
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const isCreator = trip && user && trip.created_by === user.id;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка путешествия...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Путешествие не найдено</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Верхняя навигация */}
      <nav className="bg-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-blue-600">TripPlanner</h1>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-gray-700 hidden md:block">
                {user?.name}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Основной контент */}
      <div className="container mx-auto px-4 py-8">
        {/* Заголовок путешествия */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{trip.name}</h1>
              <div className="flex items-center mt-2 space-x-4">
                <span className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {trip.destination}
                </span>
                <span className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                </span>
              </div>
            </div>
            <div className="flex space-x-2">
              {isCreator && (
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Редактировать
                </button>
              )}
            </div>
          </div>

          {trip.description && (
            <p className="mt-4 text-gray-600">{trip.description}</p>
          )}
        </div>

        {/* Вкладки */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-6 font-medium text-sm ${activeTab === 'overview'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Обзор
              </button>
              <button
                onClick={() => setActiveTab('places')}
                className={`py-4 px-6 font-medium text-sm ${activeTab === 'places'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >

                Места ({places.length})
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`py-4 px-6 font-medium text-sm ${activeTab === 'map'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Карта ({places.filter(p => p.latitude && p.longitude).length}/{places.length})
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`py-4 px-6 font-medium text-sm ${activeTab === 'timeline'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Таймлайн ({places.filter(p => p.visit_date).length}/{places.length})
              </button>
              <button
                onClick={() => setActiveTab('budget')}
                className={`py-4 px-6 font-medium text-sm ${activeTab === 'budget'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Бюджет
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`py-4 px-6 font-medium text-sm ${activeTab === 'members'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Участники ({members.length})
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-4 px-6 font-medium text-sm ${activeTab === 'chat'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                Чат
              </button>
            </nav>
          </div>
        </div>

        {/* Контент вкладок */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Обзор путешествия</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-blue-600 font-semibold">Бюджет</div>
                  <div className="text-2xl font-bold mt-2">{trip.total_budget?.toLocaleString() || 0} ₽</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-green-600 font-semibold">Участники</div>
                  <div className="text-2xl font-bold mt-2">{members.length}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-purple-600 font-semibold">Места</div>
                  <div className="text-2xl font-bold mt-2">{places.length}</div>
                </div>
              </div>

              <h3 className="font-semibold text-gray-700 mb-3">Недавно добавленные места</h3>
              {places.length === 0 ? (
                <p className="text-gray-500">Пока нет добавленных мест</p>
              ) : (
                <div className="space-y-3">
                  {places.slice(0, 3).map(place => (
                    <div key={place.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{place.name}</div>
                        <div className="text-sm text-gray-500">
                          {categories.find(c => c.value === place.category)?.label || place.category}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-green-600">👍 {place.upvotes || 0}</span>
                        <span className="text-red-600">👎 {place.downvotes || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'places' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Места для посещения</h2>
                <button
                  onClick={() => setIsAddPlaceModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Добавить место
                </button>
              </div>

              {places.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="mt-4 text-gray-600">Пока нет добавленных мест</p>
                  <p className="text-sm text-gray-500 mt-2">Начните добавлять интересные места для посещения</p>
                  <button
                    onClick={() => setIsAddPlaceModalOpen(true)}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Добавить первое место
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {places.map((place) => (
                    <div key={place.id} className="border rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <h3 className="font-bold text-lg">{place.name}</h3>
                            {place.status === 'approved' && (
                              <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                Утверждено
                              </span>
                            )}
                          </div>
                          {place.description && (
                            <p className="text-gray-600 mt-1">{place.description}</p>
                          )}
                          <div className="flex flex-wrap items-center mt-2 space-x-4">
                            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {categories.find(c => c.value === place.category)?.label || place.category}
                            </span>
                            {place.cost > 0 && (
                              <span className="text-sm text-gray-600">
                                💰 {place.cost.toLocaleString()} ₽
                              </span>
                            )}
                            {place.address && (
                              <span className="text-sm text-gray-600 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {place.address}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 ml-4">
                          <div className="flex items-center space-x-1">
                            <button
                              className={`p-1 rounded hover:bg-green-100 transition ${place.user_vote === 'up' ? 'text-green-600' : 'text-gray-400'
                                }`}
                              onClick={() => handleVote(place.id, 'up')}
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                            </button>
                            <span className="font-medium w-4 text-center">{place.upvotes || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button
                              className={`p-1 rounded hover:bg-red-100 transition ${place.user_vote === 'down' ? 'text-red-600' : 'text-gray-400'
                                }`}
                              onClick={() => handleVote(place.id, 'down')}
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .327.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                              </svg>
                            </button>
                            <span className="font-medium w-4 text-center">{place.downvotes || 0}</span>
                          </div>
                          {/* ===== КНОПКА УДАЛЕНИЯ - ВСТАВЛЯЕМ СЮДА ===== */}
                          {(user?.id === place.suggested_by || isCreator) && (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm('Вы уверены, что хотите удалить это место?')) {
                                  try {
                                    await deletePlace(parseInt(id!), place.id);
                                    toast.success('Место удалено');
                                    loadTripData(parseInt(id!));
                                  } catch (error) {
                                    toast.error('Ошибка при удалении');
                                  }
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 transition ml-2"
                              title="Удалить место"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex justify-between items-center text-sm text-gray-500">
                        <span>Добавил(а): {place.suggested_by_name || 'Пользователь'}</span>
                        <span>{new Date(place.created_at).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'map' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Карта мест</h2>
                <div className="text-sm text-gray-500">
                  <span className="inline-flex items-center mr-4">
                    <span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                    Достопримечательности
                  </span>
                  <span className="inline-flex items-center mr-4">
                    <span className="w-3 h-3 bg-red-500 rounded-full mr-1"></span>
                    Рестораны
                  </span>
                  <span className="inline-flex items-center mr-4">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span>
                    Отели
                  </span>
                  <span className="inline-flex items-center">
                    <span className="w-3 h-3 bg-orange-500 rounded-full mr-1"></span>
                    Транспорт
                  </span>
                </div>
              </div>

              {places.filter(p => p.latitude && p.longitude).length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <p className="mt-4 text-gray-600">На карте пока нет мест</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Добавьте места с адресами, чтобы они отображались на карте
                  </p>
                  <button
                    onClick={() => setActiveTab('places')}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Перейти к местам
                  </button>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden shadow-lg">
                  <OSMMapComponent
                    places={places}
                    center={places.find(p => p.latitude && p.longitude) ? [
                      places.find(p => p.latitude && p.longitude)!.latitude!,
                      places.find(p => p.latitude && p.longitude)!.longitude!
                    ] : undefined}
                  />
                </div>
              )}
            </div>
          )}
          {activeTab === 'timeline' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Таймлайн путешествия</h2>
                <p className="text-sm text-gray-500">
                  Перетаскивайте места для изменения порядка
                </p>
              </div>
              <Timeline
                places={places}
                tripId={parseInt(id!)}
                onUpdate={() => loadTripData(parseInt(id!))}
              />
            </div>
          )}
          {activeTab === 'members' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Участники</h2>
                {isCreator && (
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
                  >
                    <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Пригласить
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {members.map(member => (
                  <div key={member.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {member.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {member.role === 'creator' ? 'Создатель' : 'Участник'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'budget' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Бюджет</h2>
                <button
                  onClick={() => setIsAddExpenseModalOpen(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center"
                >
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Добавить расход
                </button>
              </div>

              {/* Баланс участников */}
              {balances.length > 0 && (
                <div className="bg-green-50 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-gray-800 mb-4">Кто кому должен</h3>
                  {debts.length > 0 ? (
                    <div className="space-y-3">
                      {debts.map((debt, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <div className="flex items-center">
                            <span className="font-medium">{debt.fromName}</span>
                            <svg className="w-5 h-5 mx-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                            <span className="font-medium">{debt.toName}</span>
                          </div>
                          <span className="font-bold text-green-600">{debt.amount.toFixed(2)} ₽</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-green-700">Все расходы оплачены, долгов нет</p>
                  )}
                </div>
              )}

              {/* Список расходов */}
              {expenses.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <svg className="w-16 h-16 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-4 text-gray-600">Пока нет расходов</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Добавьте первый расход, чтобы начать отслеживать бюджет
                  </p>
                  <button
                    onClick={() => setIsAddExpenseModalOpen(true)}
                    className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Добавить расход
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-gray-800">{expense.name}</h3>
                          <div className="flex items-center mt-1 space-x-4">
                            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {categories.find(c => c.value === expense.category)?.label || expense.category}
                            </span>
                            <span className="text-sm text-gray-600">
                              Оплатил(а): {expense.paid_by_name}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-xl font-bold text-gray-900">
                            {expense.amount.toLocaleString()} ₽
                          </span>
                          {(user?.id === expense.paid_by || isCreator) && (
                            <button
                              onClick={async () => {
                                if (window.confirm('Удалить этот расход?')) {
                                  try {
                                    await deleteExpense(parseInt(id!), expense.id);
                                    toast.success('Расход удален');
                                    loadExpenses(parseInt(id!));
                                  } catch (error) {
                                    toast.error('Ошибка при удалении');
                                  }
                                }
                              }}
                              className="text-gray-400 hover:text-red-600 transition"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>

                      {expense.participants && expense.participants.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-sm text-gray-500 mb-2">Кто участвовал:</p>
                          <div className="flex flex-wrap gap-2">
                            {expense.participants.map((p: any) => (
                              <span key={p.user_id} className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-sm">
                                {p.name}: {p.share_amount.toLocaleString()} ₽
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-2 text-xs text-gray-400">
                        {new Date(expense.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'chat' && (
            <div>
              <Chat tripId={parseInt(id!)} />
            </div>
          )}
        </div>
      </div>

      {/* Модальное окно добавления места */}
      <AddPlaceModal
        isOpen={isAddPlaceModalOpen}
        onClose={() => setIsAddPlaceModalOpen(false)}
        tripId={parseInt(id!)}
        onSuccess={() => loadTripData(parseInt(id!))}
      />

      {/* 👇 СЮДА ДОБАВЬТЕ МОДАЛЬНОЕ ОКНО ДЛЯ БЮДЖЕТА */}
      <AddExpenseModal
        isOpen={isAddExpenseModalOpen}
        onClose={() => setIsAddExpenseModalOpen(false)}
        tripId={parseInt(id!)}
        members={members}
        onSuccess={() => loadExpenses(parseInt(id!))}
      />
      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        tripId={parseInt(id!)}
      />
    </div>
  );
};

export default TripPage;