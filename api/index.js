// Самый простой рабочий код
export default async (req, res) => {
  console.log('📨 Request received:', req.method, req.url);
  
  // Всегда возвращаем успешный ответ
  return Response.json({
    success: true,
    message: '✅ SiaMatch Backend работает!',
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method,
    version: '1.0.0'
  });
};
