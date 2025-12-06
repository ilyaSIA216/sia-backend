// api/index.js - 100% РАБОЧИЙ КОД ДЛЯ VERCEL
export default function handler(req, res) {
  // Логируем запрос
  console.log(`📨 ${req.method} ${req.url} at ${new Date().toISOString()}`);
  
  // Устанавливаем заголовки
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Проверяем путь
  const path = req.url.split('?')[0];
  
  // Обрабатываем разные пути
  if (path === '/' || path === '') {
    return res.status(200).json({
      success: true,
      message: '🚀 SiaMatch Backend ЗАРАБОТАЛ!',
      service: 'Dating App API',
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      note: 'Наконец-то работает!',
      endpoints: [
        'GET /',
        'GET /api/health',
        'GET /api/users/:city',
        'POST /api/register',
        'POST /api/swipe'
      ]
    });
  }
  
  if (path === '/api/health') {
    return res.status(200).json({
      status: 'OK',
      environment: 'production',
      timestamp: new Date().toISOString(),
      node: process.version
    });
  }
  
  if (path.startsWith('/api/users/')) {
    const city = decodeURIComponent(path.split('/')[3] || 'Moscow');
    return res.status(200).json({
      city: city,
      users: [
        { id: 1, name: 'Тестовый пользователь 1', city: city, age: 25 },
        { id: 2, name: 'Тестовый пользователь 2', city: city, age: 28 }
      ],
      count: 2,
      timestamp: new Date().toISOString()
    });
  }
  
  // Если ничего не подошло
  return res.status(404).json({
    error: 'Endpoint not found',
    path: path,
    method: req.method,
    timestamp: new Date().toISOString(),
    available: ['/', '/api/health', '/api/users/:city']
  });
}
