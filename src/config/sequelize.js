const { Sequelize } = require('sequelize');
const config = require('./database')[process.env.NODE_ENV || 'development'];

const sequelize = new Sequelize(
  config.database || config.storage,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    pool: config.pool,
    dialectOptions: config.dialectOptions,
    define: config.define,
    storage: config.storage // для SQLite
  }
);

module.exports = sequelize;