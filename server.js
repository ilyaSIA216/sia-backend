// server.js - основной сервер
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Подключение к Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Проверка работы
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: 'OK', 
      service: 'SiaMatch Backend',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      error: error.message 
    });
  }
});

// Главная страница (корневой маршрут)
app.get('/', (req, res) => {
  res.json({
    service: 'SiaMatch Backend API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      register: '/api/register',
      users: '/api/users/:city',
      swipe: '/api/swipe'
    },
    timestamp: new Date().toISOString()
  });
});

// Регистрация пользователя
app.post('/api/register', async (req, res) => {
  const { telegramId, username, firstName, city, age, gender } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO users (telegram_id, username, first_name, city, age, gender) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (telegram_id) DO UPDATE SET
       username = $2, first_name = $3, city = $4, age = $5, gender = $6
       RETURNING id`,
      [telegramId, username, firstName, city, age, gender]
    );
    res.json({ success: true, userId: result.rows[0].id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Получение пользователей для свайпинга
app.get('/api/users/:city', async (req, res) => {
  const { city } = req.params;
  const { userId } = req.query;
  
  try {
    const result = await pool.query(
      `SELECT id, username, first_name, age, city, gender 
       FROM users 
       WHERE city = $1 AND id != $2 AND verified = true
       ORDER BY RANDOM() 
       LIMIT 10`,
      [city, userId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Свайп (лайк/дизлайк)
app.post('/api/swipe', async (req, res) => {
  const { swiperId, targetId, liked } = req.body;
  
  try {
    await pool.query(
      `INSERT INTO swipes (swiper_id, target_id, liked) 
       VALUES ($1, $2, $3)`,
      [swiperId, targetId, liked]
    );
    
    res.json({ success: true, isMatch: false });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Экспорт для Vercel (это должно быть в конце файла)
module.exports = app;

// Локальный запуск (только если запускаем напрямую)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📚 API Documentation:`);
    console.log(`   GET  /          - API info`);
    console.log(`   GET  /api/health - Health check`);
    console.log(`   POST /api/register - Register user`);
    console.log(`   GET  /api/users/:city - Get users by city`);
    console.log(`   POST /api/swipe - Swipe (like/dislike)`);
  });
}
