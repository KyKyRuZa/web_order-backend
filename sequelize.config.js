// sequelize.config.js
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
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 30000,
      evict: 60000,
      handleDisconnects: true
    },
    retry: {
      max: 3,
      match: [
        /SQLITE_BUSY/,
        /SQLITE_LOCKED/,
        /TimeoutError/,
        /Deadlock/
      ]
    },
    dialectOptions: {
      application_name: 'WebDev Orders Development API',
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true
    }
  },
  test: {
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME_TEST || 'webdev_orders_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      deletedAt: 'deleted_at',
      paranoid: true
    }
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
      max: 30,
      min: 10,
      acquire: 60000,
      idle: 30000,
      evict: 60000,
      handleDisconnects: true
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      },
      application_name: 'WebDev Orders Production API'
    },
    retry: {
      max: 5,
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
    }
  }
};