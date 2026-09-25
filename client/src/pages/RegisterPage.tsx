import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser, checkApiHealth } from '../services/authService';
import toast from 'react-hot-toast';

const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const navigate = useNavigate();

  // Проверяем статус API
  useEffect(() => {
    const checkApi = async () => {
      try {
        await checkApiHealth();
        setApiStatus('online');
      } catch (error) {
        setApiStatus('offline');
        toast.error('Бэкенд недоступен');
      }
    };
    
    checkApi();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (apiStatus !== 'online') {
      toast.error('Бэкенд недоступен');
      return;
    }
    
    // Валидация
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Заполните все поля');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await registerUser({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      
      if (result.success) {
        toast.success('Регистрация успешна!');
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-teal-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Регистрация</h1>
          <p className="text-gray-600 mt-2">Создайте новый аккаунт</p>
          
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Имя
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition disabled:bg-gray-100"
              placeholder="Ваше имя"
              required
              disabled={loading || apiStatus !== 'online'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition disabled:bg-gray-100"
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
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition disabled:bg-gray-100"
              placeholder="Не менее 6 символов"
              required
              disabled={loading || apiStatus !== 'online'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Подтвердите пароль
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition disabled:bg-gray-100"
              placeholder="Повторите пароль"
              required
              disabled={loading || apiStatus !== 'online'}
            />
          </div>

          <button
            type="submit"
            disabled={loading || apiStatus !== 'online'}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Регистрация...
              </>
            ) : 'Зарегистрироваться'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-green-600 hover:text-green-800 font-medium">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;