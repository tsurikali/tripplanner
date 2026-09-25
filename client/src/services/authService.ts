import api from './api';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
  };
  message?: string; // Добавьте это поле
}

export interface ApiError {
  message: string;
  success: boolean;
}

// Вход пользователя
export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    
    if (response.data.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Ошибка входа');
  }
};

// Регистрация пользователя
export const registerUser = async (data: RegisterData): Promise<AuthResponse> => {
  try {
    const response = await api.post<AuthResponse>('/auth/register', data);
    
    if (response.data.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Ошибка регистрации');
  }
};

// Выход
export const logoutUser = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

// Получение текущего пользователя
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// Проверка токена
export const verifyToken = async () => {
  try {
    const response = await api.get<AuthResponse>('/auth/verify');
    return response.data;
  } catch (error) {
    logoutUser();
    throw error;
  }
};

// Проверка здоровья API
export const checkApiHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('API недоступен');
  }
};