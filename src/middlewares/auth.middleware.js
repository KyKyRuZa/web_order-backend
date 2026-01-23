const JWTService = require('../services/jwt.service');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Требуется авторизация'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = JWTService.verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Недействительный токен'
      });
    }

    // Получаем пользователя из базы
    const { User } = require('../models');
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user || user.deleted_at) {
      return res.status(401).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    if (!user.is_email_verified) {
      return res.status(403).json({
        success: false,
        message: 'Email не подтвержден'
      });
    }

    // Добавляем пользователя в запрос
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
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