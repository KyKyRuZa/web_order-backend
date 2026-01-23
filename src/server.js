require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/sequelize');
const { User, Application, ApplicationFile } = require('./models');

const PORT = process.env.PORT || 5000;

// Функция для инициализации базы данных
const initializeDatabase = async () => {
  try {
    // Автентификация с БД
    await sequelize.authenticate();
    console.log('✅ Подключение к базе данных установлено');

    // Синхронизация моделей (в development сбрасываем таблицы)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('🗑️  База данных пересоздана (только для разработки)');
    } else {
      await sequelize.sync({ alter: true });
      console.log('✅ Модели синхронизированы');
    }

    return true;
  } catch (error) {
    console.error('❌ Ошибка подключения к базе данных:', error.message);
    throw error;
  }
};

// Запуск сервера
const startServer = async () => {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на порту ${PORT}`);
      console.log(`📁 Environment: ${process.env.NODE_ENV}`);
      console.log(`🌐 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
      console.log(`🛢️  Database: ${process.env.DB_NAME}`);
    });
  } catch (error) {
    console.error('❌ Не удалось запустить сервер:', error);
    process.exit(1);
  }
};

// Обработка graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Получен SIGTERM, завершаем работу...');
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Получен SIGINT, завершаем работу...');
  await sequelize.close();
  process.exit(0);
});

// Запуск приложения
startServer();