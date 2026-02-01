const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middlewares/errorHandler');
const logger = require('./config/logger');

// Импорт маршрутов
const authRoutes = require('./routes/auth.routes');
const applicationRoutes = require('./routes/application.routes');
const adminRoutes = require('./routes/admin.routes');
const noteRoutes = require('./routes/notes.routes');
const auditRoutes = require('./routes/audit.routes');

const app = express();

// === Базовые middleware ===

// Логирование запросов
app.use(morgan('combined', { stream: logger.stream }));

// Безопасность
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "https://api.example.com"], // Замените на ваши доверенные источники
      frameSrc: ["'none'"], // Запрещаем iframe'ы
      objectSrc: ["'none'"], // Запрещаем плагины
      upgradeInsecureRequests: [], // Автоматическое обновление HTTP до HTTPS
    },
  },
  dnsPrefetchControl: {
    allow: false // Отключаем предзагрузку DNS
  },
  referrerPolicy: {
    policy: 'same-origin' // Политика реферера
  },
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none' // Запрещаем политики Adobe
  },
  crossOriginEmbedderPolicy: false,
}));

// Дополнительная защита XSS
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400, // 24 часа
}));

// Сжатие ответов
app.use(compression());

// Парсинг JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware для логирования тела запроса после парсинга
app.use((req, res, next) => {
  const logger = require('./config/logger');

  // Сохраняем оригинальный метод send
  const originalSend = res.send;

  // Переопределяем send для логирования после обработки запроса
  res.send = function(data) {
    // Логируем только для проблемного маршрута
    if (req.path.includes('/auth/change-password') && req.method === 'PUT') {
      logger.debug(`Ответ на /auth/change-password: ${req.method} ${req.path}`);
      logger.debug(`Код ответа: ${res.statusCode}`);
      logger.debug(`Тело ответа: ${data}`);
    }
    return originalSend.call(this, data);
  };

  // Логируем запрос перед его обработкой
  if (req.path.includes('/auth/change-password') && req.method === 'PUT') {
    logger.debug(`Запрос к /auth/change-password: ${req.method} ${req.path}`);
    logger.debug(`Заголовки: ${JSON.stringify(req.headers)}`);
    logger.debug(`Тело запроса: ${JSON.stringify(req.body)}`);
  }

  next();
});

// === Лимит запросов ===

// Общий лимит для всех API
// const generalLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 минут
//   max: 100, // лимит запросов с одного IP
//   message: {
//     success: false,
//     message: 'Слишком много запросов с этого IP, попробуйте позже'
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
//   skip: (req, res) => {
//     // Пропускаем рейт-лимит для тестов
//     return req.headers['user-agent'] && req.headers['user-agent'].includes('axios');
//   }
// });  

// // Более строгий лимит для аутентификации
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 20,
//   message: {
//     success: false,
//     message: 'Слишком много попыток входа, попробуйте позже'
//   }
// });

// // Применяем лимиты
// app.use('/api', generalLimiter);
// app.use('/api/auth/login', authLimiter);
// app.use('/api/auth/register', authLimiter);
// app.use('/api/auth/forgot-password', authLimiter);

// === Health-check и тестовые маршруты ===

// Простой health-check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Сервер работает',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

app.get('/api/health/detailed', async (req, res, next) => {
  try {
    const sequelize = require('./config/sequelize');
    await sequelize.authenticate();
    const { User, Application } = require('./models');
    
    const [userCount, applicationCount] = await Promise.all([
      User.count(),
      Application.count()
    ]);
    
    res.json({
      success: true,
      message: 'Все системы работают нормально',
      database: {
        status: 'connected',
        users: userCount,
        applications: applicationCount
      },
      memory: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`
      },
      node: {
        version: process.version,
        platform: process.platform
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/test-db', async (req, res, next) => {
  try {
    const sequelize = require('./config/sequelize');
    await sequelize.authenticate();
    
    // Проверяем основные таблицы
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    
    res.json({
      success: true,
      message: 'База данных подключена успешно',
      tables: tables
    });
  } catch (error) {
    next(error);
  }
});

// === Swagger UI ===
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const path = require('path');

// === Обслуживание файлов ===
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// === Основные маршруты API ===
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/audit', auditRoutes);

// === Обработка ошибок ===
app.use(errorHandler);


// === Обработка 404 ===
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не найден'
  });
});

module.exports = app;