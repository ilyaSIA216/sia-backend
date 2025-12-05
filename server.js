// server.js - основной сервер для SiaMatch
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// Диагностика при запуске
console.log('🔧 SiaMatch Backend starting...');
console.log('📦 NODE_ENV:', process.env.NODE_ENV);
console.log('🔗 DATABASE_URL present:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  console.log('🔗 DATABASE_URL length:', process.env.DATABASE_URL.length);
  // Безопасный вывод URL (без пароля)
  const url = new URL(process.env.DATABASE_URL.replace('postgresql://', 'http://'));
  console.log('🔗 Database host:', url.hostname);
}

// Подключение к Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Логирование всех запросов (для отладки)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Обработка ошибок подключения к базе
pool.on('error', (err) => {
  console.error('💥 Unexpected database error:', err);
});

// ============ МАРШРУТЫ API ============

// 1. КОРНЕВОЙ МАРШРУТ - ДОЛЖЕН БЫТЬ ПЕРВЫМ
app.get('/', (req, res) => {
  res.json({
    service: 'SiaMatch Backend API',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      root: 'GET /',
      health: 'GET /api/health',
      register: 'POST /api/register',
      users: 'GET /api/users/:city',
      swipe: 'POST /api/swipe'
    },
    database: {
      connected: true,
      tables: ['users', 'swipes', 'matches']
    }
  });
});

// 2. ПРОВЕРКА ЗДОРОВЬЯ СИСТЕМЫ
app.get('/api/health', async (req, res) => {
  try {
    // Проверяем подключение к базе
    const dbResult = await pool.query('SELECT NOW() as db_time, version() as db_version');
    
    // Проверяем наличие таблиц
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    
    res.json({ 
      status: 'OK', 
      service: 'SiaMatch Backend',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        time: dbResult.rows[0].db_time,
        version: dbResult.rows[0].db_version,
        tables: tables,
        tablesCount: tables.length
      },
      system: {
        node_version: process.version,
        environment: process.env.NODE_ENV || 'development'
      }
    });
    
    console.log('✅ Health check passed, tables found:', tables);
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    res.status(500).json({ 
      status: 'ERROR', 
      error: error.message,
      hint: 'Check DATABASE_URL connection string',
      timestamp: new Date().toISOString()
    });
  }
});

// 3. РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ
app.post('/api/register', async (req, res) => {
  console.log('📝 Registration attempt:', req.body);
  
  const { telegramId, username, firstName, city, age, gender } = req.body;
  
  // Валидация
  if (!telegramId) {
    return res.status(400).json({ error: 'telegramId is required' });
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO users (telegram_id, username, first_name, city, age, gender) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (telegram_id) DO UPDATE SET
       username = $2, first_name = $3, city = $4, age = $5, gender = $6,
       updated_at = NOW()
       RETURNING id, created_at`,
      [telegramId, username, firstName, city, age, gender]
    );
    
    console.log('✅ User registered/updated:', result.rows[0]);
    
    res.json({ 
      success: true, 
      userId: result.rows[0].id,
      createdAt: result.rows[0].created_at,
      message: username ? `User ${username} registered` : 'User registered'
    });
    
  } catch (error) {
    console.error('💥 Registration error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Database error during registration'
    });
  }
});

// 4. ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЕЙ ДЛЯ СВАЙПИНГА
app.get('/api/users/:city', async (req, res) => {
  const { city } = req.params;
  const { userId } = req.query;
  
  console.log(`🌆 Getting users for city: ${city}, excluding user: ${userId}`);
  
  if (!city) {
    return res.status(400).json({ error: 'City parameter is required' });
  }
  
  try {
    // Если userId не указан, ищем всех пользователей города
    let query, params;
    
    if (userId) {
      query = `
        SELECT id, username, first_name, age, city, gender, created_at
        FROM users 
        WHERE city ILIKE $1 AND id != $2 AND verified = true
        ORDER BY RANDOM() 
        LIMIT 20`;
      params = [`%${city}%`, userId];
    } else {
      query = `
        SELECT id, username, first_name, age, city, gender, created_at
        FROM users 
        WHERE city ILIKE $1 AND verified = true
        ORDER BY RANDOM() 
        LIMIT 20`;
      params = [`%${city}%`];
    }
    
    const result = await pool.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} users in ${city}`);
    
    res.json({
      success: true,
      city: city,
      count: result.rows.length,
      users: result.rows
    });
    
  } catch (error) {
    console.error('💥 Users fetch error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Database error while fetching users'
    });
  }
});

// 5. СВАЙП (ЛАЙК/ДИЗЛАЙК)
app.post('/api/swipe', async (req, res) => {
  console.log('💖 Swipe attempt:', req.body);
  
  const { swiperId, targetId, liked } = req.body;
  
  if (!swiperId || !targetId || liked === undefined) {
    return res.status(400).json({ 
      error: 'swiperId, targetId, and liked are required' 
    });
  }
  
  try {
    // Сохраняем свайп
    await pool.query(
      `INSERT INTO swipes (swiper_id, target_id, liked) 
       VALUES ($1, $2, $3)
       ON CONFLICT (swiper_id, target_id) DO UPDATE SET
       liked = $3, created_at = NOW()`,
      [swiperId, targetId, liked]
    );
    
    console.log(`✅ Swipe saved: ${swiperId} -> ${targetId} (liked: ${liked})`);
    
    // Проверяем на взаимный лайк (мэтч)
    let isMatch = false;
    if (liked) {
      const mutualCheck = await pool.query(
        `SELECT 1 FROM swipes 
         WHERE swiper_id = $1 AND target_id = $2 AND liked = true`,
        [targetId, swiperId]
      );
      
      if (mutualCheck.rows.length > 0) {
        // Создаем запись о мэтче
        const user1 = Math.min(swiperId, targetId);
        const user2 = Math.max(swiperId, targetId);
        
        await pool.query(
          `INSERT INTO matches (user1_id, user2_id) 
           VALUES ($1, $2)
           ON CONFLICT (user1_id, user2_id) DO NOTHING`,
          [user1, user2]
        );
        
        isMatch = true;
        console.log(`🎉 MATCH! ${swiperId} ❤️ ${targetId}`);
      }
    }
    
    res.json({ 
      success: true, 
      isMatch: isMatch,
      message: isMatch ? 'It\'s a match! 🎉' : 'Swipe recorded'
    });
    
  } catch (error) {
    console.error('💥 Swipe error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Database error while saving swipe'
    });
  }
});

// 6. ОБРАБОТКА НЕСУЩЕСТВУЮЩИХ МАРШРУТОВ (404)
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
    availableRoutes: [
      'GET /',
      'GET /api/health',
      'POST /api/register',
      'GET /api/users/:city',
      'POST /api/swipe'
    ],
    timestamp: new Date().toISOString()
  });
});

// ============ ЭКСПОРТ И ЗАПУСК ============

// Экспорт для Vercel (обязательно)
module.exports = app;

// Локальный запуск (только если запускаем напрямую)
if (require.main === module) {
  // Проверяем подключение к базе перед запуском
  (async () => {
    try {
      const client = await pool.connect();
      console.log('✅ Database connected successfully!');
      
      // Проверяем таблицы
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      console.log(`📊 Found ${tables.rows.length} tables:`, 
        tables.rows.map(t => t.table_name));
      
      client.release();
      
      // Запускаем сервер
      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () => {
        console.log(`
🚀 SiaMatch Backend запущен!
📍 Порт: ${PORT}
🌐 API доступен по: http://localhost:${PORT}

📚 ДОСТУПНЫЕ ЭНДПОИНТЫ:
   GET  /                 - Информация об API
   GET  /api/health      - Проверка здоровья системы
   POST /api/register    - Регистрация пользователя
   GET  /api/users/:city - Поиск пользователей по городу
   POST /api/swipe       - Свайп (лайк/дизлайк)
   
🔗 База данных: ${process.env.DATABASE_URL ? 'Подключена' : 'Нет подключения'}
📅 ${new Date().toLocaleString()}
        `);
      });
      
    } catch (err) {
      console.error('💥 Невозможно подключиться к базе данных:', err.message);
      console.log('💡 Проверьте:');
      console.log('   1. DATABASE_URL в .env файле');
      console.log('   2. Сетевое подключение');
      console.log('   3. Настройки Supabase');
      process.exit(1);
    }
  })();
}
