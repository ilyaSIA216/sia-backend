// api/index.js - ТЕСТОВАЯ РАБОЧАЯ ВЕРСИЯ
module.exports = (req, res) => {
  // Устанавливаем заголовки
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  console.log(`Request: ${req.method} ${req.url}`);
  
  // Обрабатываем разные URL
  if (req.url === '/' || req.url === '') {
    return res.end(JSON.stringify({
      success: true,
      message: '🚀 SiaMatch Backend работает!',
      endpoint: 'Root',
      timestamp: new Date().toISOString(),
      nodeVersion: process.version
    }));
  }
  
  if (req.url === '/api/health') {
    return res.end(JSON.stringify({
      status: 'OK',
      service: 'SiaMatch',
      timestamp: new Date().toISOString()
    }));
  }
  
  if (req.url === '/api/users/Moscow') {
    return res.end(JSON.stringify({
      city: 'Moscow',
      users: [
        { id: 1, name: 'Тест 1' },
        { id: 2, name: 'Тест 2' }
      ]
    }));
  }
  
  // Если ничего не подошло - 404
  res.statusCode = 404;
  res.end(JSON.stringify({
    error: 'Not Found',
    path: req.url,
    method: req.method,
    available: ['/', '/api/health', '/api/users/Moscow']
  }));
};
