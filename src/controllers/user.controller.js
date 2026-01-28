const { User, Application } = require('../models');
const { Op } = require('sequelize');
const { wrapController } = require('../utils/controller-wrapper.util');

class UserController {
  static async updateProfile(req, res) {
    try {
      const { fullName, phone, companyName } = req.body;
      const userId = req.user.id;

      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }

      // Обновляем только переданные поля
      const updateData = {};
      if (fullName !== undefined) updateData.full_name = fullName;
      if (phone !== undefined) updateData.phone = phone;
      if (companyName !== undefined) updateData.company_name = companyName;

      await user.update(updateData);

      res.json({
        success: true,
        message: 'Профиль успешно обновлен',
        data: {
          user: {
            ...user.toJSON(),
            isManager: user.isManager,
            isAdmin: user.isAdmin,
            emailVerified: user.emailVerified
          }
        }
      });
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

      const where = { user_id: userId };
      
      if (status) {
        where.status = status;
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows: applications } = await Application.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        include: [
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'full_name', 'email']
          }
        ]
      });

      // Добавляем display значения
      const applicationsWithDisplay = applications.map(app => ({
        ...app.toJSON(),
        statusDisplay: app.statusDisplay,
        serviceTypeDisplay: app.serviceTypeDisplay,
        isActive: app.isActive,
        isEditable: app.isEditable
      }));

      res.json({
        success: true,
        data: {
          applications: applicationsWithDisplay,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit)
          }
        }
      });
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

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }

      // Деактивируем аккаунт (soft delete)
      await user.destroy();

      res.json({
        success: true,
        message: 'Аккаунт успешно деактивирован'
      });
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
}

module.exports = UserController;