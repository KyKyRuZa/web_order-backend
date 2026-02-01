const { User, Application, AuditLog } = require('../models');
const { Op } = require('sequelize');
const { wrapController } = require('../utils/controller-wrapper.util');
const UserService = require('../services/user.service');

class UserController {
  static async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      let updateData = req.body;

      updateData.req = req;

      const result = await UserService.updateProfile(userId, updateData);

      if (result.error) {
        return res.status(400).json({
          success: false,
          message: result.error
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Update profile error:', error);

      if (error.name === 'SequelizeValidationError') {
        const errors = error.errors.map(e => ({
          field: e.path,
          message: e.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Ошибка валидации',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Ошибка обновления профиля'
      });
    }
  }

  static async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      // Добавляем логирование
      const logger = require('../config/logger');
      logger.debug(`Попытка изменения пароля для пользователя: ${userId}`);
      logger.debug(`Ключи тела запроса: ${Object.keys(req.body)}`);
      logger.debug(`Текущий пароль предоставлен: ${!!currentPassword}`);
      logger.debug(`Новый пароль предоставлен: ${!!newPassword}`);
      logger.debug(`Длина текущего пароля: ${currentPassword ? currentPassword.length : 'N/A'}`);
      logger.debug(`Длина нового пароля: ${newPassword ? newPassword.length : 'N/A'}`);

      const user = await User.findByPk(userId);

      if (!user) {
        logger.warn(`Пользователь не найден для изменения пароля: ${userId}`);
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }

      logger.debug(`Пользователь найден: ${user.email}`);

      // Проверяем текущий пароль
      const isValidPassword = await user.validatePassword(currentPassword);
      logger.debug(`Результат проверки пароля: ${isValidPassword}`);

      if (!isValidPassword) {
        logger.warn(`Неверный текущий пароль для пользователя: ${userId}`);
        return res.status(400).json({
          success: false,
          message: 'Текущий пароль неверен'
        });
      }

      // Убеждаемся, что новый пароль отличается от старого
      if (currentPassword === newPassword) {
        logger.warn(`Новый пароль совпадает с текущим для пользователя: ${userId}`);
        return res.status(400).json({
          success: false,
          message: 'Новый пароль должен отличаться от текущего'
        });
      }

      // Обновляем пароль напрямую с хешированием
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      user.password_hash = hashedPassword;
      await user.save({ fields: ['password_hash'] });

      logger.info(`Пароль успешно изменен для пользователя: ${userId}`);
      res.json({
        success: true,
        message: 'Пароль успешно изменен'
      });
    } catch (error) {
      console.error('Change password error:', error);

      if (error.name === 'SequelizeValidationError') {
        const errors = error.errors.map(e => ({
          field: e.path,
          message: e.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Ошибка валидации',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Ошибка изменения пароля'
      });
    }
  }

  static async getMyApplications(req, res) {
    try {
      const userId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;

      const filters = {
        status,
        page,
        limit
      };

      const result = await UserService.getUserApplications(userId, filters);

      if (result.error) {
        return res.status(404).json({
          success: false,
          message: result.error
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Get applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения заявок'
      });
    }
  }

  static async deactivateAccount(req, res) {
    try {
      const userId = req.user.id;

      const result = await UserService.deactivateAccount(userId, req);

      if (result.error) {
        return res.status(404).json({
          success: false,
          message: result.error
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Deactivate account error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка деактивации аккаунта'
      });
    }
  }

  static async getStats(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      // Используем оптимизированный сервис для получения статистики
      const PerformanceService = require('../services/performance.service');
      const stats = await PerformanceService.getStatsOptimized(userId, userRole);

      res.json(stats);
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения статистики'
      });
    }
  }

  static async getProfile(req, res) {
    try {
      const userId = req.user.id;

      const result = await UserService.getProfile(userId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения профиля'
      });
    }
  }
}

module.exports = UserController;