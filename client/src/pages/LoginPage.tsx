import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, checkApiHealth } from '../services/authService';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('test@example.com'); // Тестовый email
  const [password, setPassword] = useState('password123'); // Тестовый пароль
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const navigate = useNavigate();

  // Проверяем статус API при загрузке
  useEffect(() => {
    const checkApi = async () => {
      try {
        await checkApiHealth();
        setApiStatus('online');
      } catch (error) {
        setApiStatus('offline');
        toast.error('Бэкенд недоступен. Проверьте, запущен ли сервер на порту 5000');
      }
    };
    
    checkApi();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (apiStatus !== 'online') {
      toast.error('Бэкенд недоступен');
      return;
    }
    
    if (!email || !password) {
      toast.error('Заполните все поля');
      return;
    }

    setLoading(true);
    
    try {
      const result = await loginUser(email, password);
      
      if (result.success) {
        toast.success('Успешный вход!');
        navigate('/dashboard');
      } else {
        toast.error(result.message || 'Ошибка входа');
      }
    } catch (error: any) {
      toast.error(error.message || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">TripPlanner</h1>
          <p className="text-gray-600 mt-2">Войдите в свой аккаунт</p>
          
          {/* Статус API */}
          <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm"
               style={{ 
                 backgroundColor: apiStatus === 'online' ? '#dcfce7' : 
                                apiStatus === 'offline' ? '#fee2e2' : '#fef3c7',
                 color: apiStatus === 'online' ? '#166534' : 
                       apiStatus === 'offline' ? '#991b1b' : '#92400e'
               }}>
            <span className="w-2 h-2 rounded-full mr-2"
                  style={{ 
                    backgroundColor: apiStatus === 'online' ? '#16a34a' : 
                                   apiStatus === 'offline' ? '#dc2626' : '#d97706'
                  }}></span>
            {apiStatus === 'online' ? 'API подключён' : 
             apiStatus === 'offline' ? 'API отключён' : 'Проверка соединения...'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100"
              placeholder="your@email.com"
              required
              disabled={loading || apiStatus !== 'online'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100"
              placeholder="••••••••"
              required
              disabled={loading || apiStatus !== 'online'}
            />
          </div>

          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p className="font-medium">Тестовые данные:</p>
            <p>Email: test@example.com</p>
            <p>Пароль: password123</p>
          </div>

          <button
            type="submit"
            disabled={loading || apiStatus !== 'online'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Вход...
              </>
            ) : 'Войти'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
              Зарегистрироваться
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            <p className="font-medium">Для разработчиков:</p>
            <p className="mt-1">Бэкенд: <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:5000</code></p>
            <p className="mt-1">Проверка API: <a href="http://localhost:5000/api/health" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">/api/health</a></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;