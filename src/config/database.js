require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'webdev_orders_dev',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 20, // Увеличиваем максимальное количество соединений
      min: 5,  // Увеличиваем минимальное количество соединений
      acquire: 60000, // Увеличиваем время ожидания при получении соединения
      idle: 30000,    // Увеличиваем время жизни неиспользуемого соединения
      evict: 60000,   // Интервал проверки простаивающих соединений
      handleDisconnects: true // Обработка разрыва соединений
    },
    retry: {
      max: 3, // Количество попыток при ошибках
      match: [
        /SQLITE_BUSY/,
        /SQLITE_LOCKED/,
        /TimeoutError/,
        /Deadlock/
      ]
    },
    dialectOptions: {
      // Дополнительные опции для PostgreSQL
      application_name: 'WebDev Orders API',
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true
      // Не устанавливаем глобальные индексы, чтобы избежать конфликта с переопределенными полями в моделях
    }
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME + '_test',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 30, // Увеличиваем максимальное количество соединений для продакшена
      min: 10,  // Увеличиваем минимальное количество соединений
      acquire: 60000, // Увеличиваем время ожидания при получении соединения
      idle: 30000,    // Увеличиваем время жизни неиспользуемого соединения
      evict: 60000,   // Интервал проверки простаивающих соединений
      handleDisconnects: true // Обработка разрыва соединений
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      application_name: 'WebDev Orders Production API'
    },
    retry: {
      max: 5, // Увеличиваем количество попыток для продакшена
      match: [
        /SQLITE_BUSY/,
        /SQLITE_LOCKED/,
        /TimeoutError/,
        /Deadlock/,
        /Connection terminated unexpectedly/
      ]
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true
      // Не устанавливаем глобальные индексы, чтобы избежать конфликта с переопределенными полями в моделях
    }
  }
};