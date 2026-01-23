const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middlewares/errorHandler');

// Импорт маршрутов
const authRoutes = require('./routes/auth.routes');
const applicationRoutes = require('./routes/application.routes');

const app = express();

// Базовые middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Парсинг JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Лимит запросов
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // лимит запросов с одного IP
  message: 'Слишком много запросов с этого IP, попробуйте позже'
});
app.use('/api', limiter);

// Health-check маршруты
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Сервер работает',
    timestamp: new Date().toISOString()
  });
});

// Тестовый маршрут для проверки БД
app.get('/api/test-db', async (req, res, next) => {
  try {
    const sequelize = require('./config/sequelize');
    await sequelize.authenticate();
    res.json({
      success: true,
      message: 'База данных подключена успешно'
    });
  } catch (error) {
    next(error);
  }
});

// Основные маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);

// Обработчик ошибок
app.use(errorHandler);

// Обработка 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не найден'
  });
});

module.exports = app;