// api/index.js - САМЫЙ ПРОСТОЙ РАБОЧИЙ КОД
module.exports = (req, res) => {
  console.log('📨 Request received:', req.method, req.url);
  
  // Всегда возвращаем JSON
  res.setHeader('Content-Type', 'application/json');
  
  // Просто возвращаем успешный ответ для ЛЮБОГО запроса
  res.end(JSON.stringify({
    success: true,
    message: '✅ SiaMatch Backend работает!',
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    note: 'Это тестовый ответ для всех запросов'
  }));
};
