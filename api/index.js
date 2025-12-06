// api/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Простой лог
console.log('🚀 SiaMatch Backend starting...');

// 1. КОРЕНЬ
app.get('/', (req, res) => {
  res.json({
    service: 'SiaMatch Backend API',
    status: 'running ✅',
    version: '1.0.1',
    timestamp: new Date().toISOString(),
    message: 'Сервер работает! База данных временно отключена',
    endpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/register',
      'GET /api/users/:city',
      'POST /api/swipe'
    ]
  });
});

// 2. HEALTH CHECK (без базы)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'SiaMatch Backend',
    timestamp: new Date().toISOString(),
    database: {
      connected: false,
      message: 'Database temporarily disabled for testing'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// 3. РЕГИСТРАЦИЯ (тестовая)
app.post('/api/register', (req, res) => {
  console.log('📝 Registration attempt:', req.body);
  
  res.json({
    success: true,
    message: 'User registered (test mode - no database)',
    data: req.body,
    userId: Date.now(), // временный ID
    timestamp: new Date().toISOString()
  });
});

// 4. ПОЛЬЗОВАТЕЛИ (тестовые данные)
app.get('/api/users/:city', (req, res) => {
  const { city } = req.params;
  
  const testUsers = [
    {
      id: 1,
      username: 'anna_' + city,
      first_name: 'Анна',
      age: 25,
      city: city,
      gender: 'female',
      bio: 'Люблю путешествия и книги'
    },
    {
      id: 2,
      username: 'max_' + city,
      first_name: 'Максим',
      age: 28,
      city: city,
      gender: 'male',
      bio: 'Занимаюсь спортом, учусь программировать'
    },
    {
      id: 3,
      username: 'katya_' + city,
      first_name: 'Екатерина',
      age: 23,
      city: city,
      gender: 'female',
      bio: 'Фотограф, люблю природу и животных'
    }
  ];
  
  res.json({
    success: true,
    city: city,
    count: testUsers.length,
    users: testUsers,
    note: 'Test data - database connection pending'
  });
});

// 5. СВАЙП (тестовый)
app.post('/api/swipe', (req, res) => {
  const { swiperId, targetId, liked } = req.body;
  
  const isMatch = liked && Math.random() > 0.7; // 30% шанс мэтча
  
  res.json({
    success: true,
    isMatch: isMatch,
    message: isMatch ? 'It\'s a match! 🎉' : 'Swipe recorded',
    data: req.body,
    timestamp: new Date().toISOString()
  });
});

// 6. 404 обработчик
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /api/health',
      'POST /api/register',
      'GET /api/users/:city',
      'POST /api/swipe'
    ],
    timestamp: new Date().toISOString()
  });
});

// Экспорт для Vercel
module.exports = app;

// Локальный запуск
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running: http://localhost:${PORT}`);
  });
}
