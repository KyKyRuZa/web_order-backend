  // src/middlewares/errorHandler.js
  const logger = require('../config/logger');
  const { ApplicationFile } = require('../models');

  const errorHandler = (err, req, res, next) => {
    // Логируем ошибку
    logger.error({
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    // Проверяем, является ли ошибка ограничением размера файла от Multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `Файл превышает максимальный размер ${ApplicationFile.MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }

    // Проверяем, является ли ошибка фильтром файлов от Multer
    if (err instanceof Error && err.message && err.message.includes('Неподдерживаемый тип файла')) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    // Проверяем, является ли ошибка валидацией Sequelize
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
      const errors = err.errors.map(e => ({
        field: e.path,
        message: e.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Ошибка валидации',
        errors
      });
    }

    // JWT ошибки
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Недействительный токен'
      });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Токен истек'
      });
    }

    // По умолчанию - внутренняя ошибка сервера
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Внутренняя ошибка сервера',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  };

  module.exports = errorHandler;