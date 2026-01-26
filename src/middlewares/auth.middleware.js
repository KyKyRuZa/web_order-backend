const JWTService = require('../services/jwt.service');

const authMiddleware = async (req, res, next) => {
  try {
    const logger = require('../config/logger');
    logger.debug(`Проверка аутентификации для маршрута: ${req.method} ${req.path}`);

    const authHeader = req.headers.authorization;
    logger.debug(`Заголовок авторизации: ${!!authHeader}`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(`Отсутствует заголовок авторизации для маршрута: ${req.path}`);
      return res.status(401).json({
        success: false,
        message: 'Требуется авторизация'
      });
    }

    const token = authHeader.split(' ')[1];
    logger.debug(`Токен получен, длина: ${token.length}`);

    const decoded = JWTService.verifyAccessToken(token);

    if (!decoded) {
      logger.warn(`Недействительный токен для маршрута: ${req.path}`);
      return res.status(401).json({
        success: false,
        message: 'Недействительный токен'
      });
    }

    logger.debug(`Токен расшифрован, ID пользователя: ${decoded.id}`);

    // Получаем пользователя из базы
    const { User } = require('../models');
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user || user.deleted_at) {
      logger.warn(`Пользователь не найден или удален: ${decoded.id}`);
      return res.status(401).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    if (!user.is_email_verified) {
      logger.warn(`Email не подтвержден для пользователя: ${decoded.id}`);
      return res.status(403).json({
        success: false,
        message: 'Email не подтвержден'
      });
    }

    logger.debug(`Пользователь аутентифицирован: ${user.email} (ID: ${user.id})`);

    // Добавляем пользователя в запрос
    req.user = user;
    next();
  } catch (error) {
    const logger = require('../config/logger');
    logger.error(`Ошибка в middleware аутентификации: ${error.message}`, { error: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Ошибка аутентификации'
    });
  }
};

const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Требуется авторизация'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав'
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  roleMiddleware
};