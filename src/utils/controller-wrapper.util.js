const logger = require('../config/logger');

const wrapController = (controller) => {
  return async (req, res, next) => {
    try {
      await controller(req, res, next);
    } catch (error) {
      logger.error(`Controller error in ${req.method} ${req.path}: ${error.message}`, {
        error: error.stack,
        userId: req.user?.id,
        params: req.params,
        query: req.query,
        body: req.body
      });

      // Определение типа ошибки для правильного кода ответа
      if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
        const errors = error.errors.map(e => ({
          field: e.path,
          message: e.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Ошибка валидации данных',
          errors
        });
      }

      if (error.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'Ошибка ссылочной целостности'
        });
      }

      if (error.name === 'SequelizeDatabaseError') {
        return res.status(500).json({
          success: false,
          message: 'Ошибка базы данных'
        });
      }

      // Ошибки аутентификации
      if (error.status === 401) {
        return res.status(401).json({
          success: false,
          message: error.message || 'Требуется аутентификация'
        });
      }

      // Ошибки авторизации
      if (error.status === 403) {
        return res.status(403).json({
          success: false,
          message: error.message || 'Недостаточно прав'
        });
      }

      // Ошибки ресурса не найден
      if (error.status === 404) {
        return res.status(404).json({
          success: false,
          message: error.message || 'Ресурс не найден'
        });
      }

      // Ошибки валидации
      if (error.status === 400) {
        return res.status(400).json({
          success: false,
          message: error.message || 'Некорректный запрос'
        });
      }

      // Общая ошибка сервера
      res.status(500).json({
        success: false,
        message: 'Внутренняя ошибка сервера'
      });
    }
  };
};

const successResponse = (res, data, message = 'Операция выполнена успешно', statusCode = 200) => {
  const response = {
    success: true,
    message
  };

  if (data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

const errorResponse = (res, message = 'Произошла ошибка', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  wrapController,
  successResponse,
  errorResponse
};