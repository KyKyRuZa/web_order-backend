// src/server.js
require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/sequelize');
const logger = require('./config/logger');

const PORT = process.env.PORT || 5000;

// Функция для инициализации базы данных
const initializeDatabase = async () => {
  try {
    // Автентификация с БД
    await sequelize.authenticate();
    logger.info('✅ Подключение к базе данных установлено');

    // Синхронизация моделей
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('🔄 База данных синхронизирована (режим разработки)');
    } else if (process.env.NODE_ENV === 'test') {
      await sequelize.sync({ force: true });
      logger.info('🗑️  База данных пересоздана (режим тестирования)');
    } else {
      await sequelize.sync({ alter: false });
      logger.info('✅ Модели проверены (режим продакшена)');
    }

    return true;
  } catch (error) {
    logger.error('❌ Ошибка подключения к базе данных:', error.message);
    throw error;
  }
};

// Запуск сервера
const startServer = async () => {
  try {
    await initializeDatabase();
    
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Сервер запущен на порту ${PORT}`);
      logger.info(`📁 Окружение: ${process.env.NODE_ENV}`);
      logger.info(`🌐 Клиентский URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
      logger.info(`🛢️  База данных: ${process.env.DB_NAME || 'postgres'}`);
      logger.info(`📊 API доступно по адресу: http://localhost:${PORT}/api`);
      logger.info(`📈 Health-check: http://localhost:${PORT}/api/health`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info(`\n🧪 Для создания тестовых данных выполните:`);
        logger.info(`npm run seed`);
      }
    });
    
    return server;
  } catch (error) {
    logger.error('❌ Не удалось запустить сервер:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const setupGracefulShutdown = (server) => {
  const shutdown = async (signal) => {
    logger.info(`🛑 Получен сигнал ${signal}, завершаем работу...`);
    
    server.close(async (err) => {
      if (err) {
        logger.error('❌ Ошибка при закрытии сервера:', err);
        process.exit(1);
      }
      
      try {
        await sequelize.close();
        logger.info('✅ Подключение к базе данных закрыто');
        process.exit(0);
      } catch (dbError) {
        logger.error('❌ Ошибка при закрытии базы данных:', dbError);
        process.exit(1);
      }
    });
    
    setTimeout(() => {
      logger.error('❌ Принудительное завершение после таймаута');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2'));
  
  process.on('uncaughtException', (error) => {
    logger.error('❌ Необработанное исключение:', error);
    shutdown('UNCAUGHT_EXCEPTION');
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ Необработанный промис:', reason);
    shutdown('UNHANDLED_REJECTION');
  });
};

// Запускаем сервер
startServer().then(setupGracefulShutdown);