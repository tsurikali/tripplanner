import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Создаем пул соединений с базой данных
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'trip_planner',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z' 
});

// Функция для проверки подключения
export const testConnection = async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ База данных подключена успешно');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error);
    return false;
  }
};

export { db };