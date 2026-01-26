const { User, Application } = require('../models');
const { Op } = require('sequelize');

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

      const user = await User.findByPk(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }

      // Проверяем текущий пароль
      const isValidPassword = await user.validatePassword(currentPassword);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Текущий пароль неверен'
        });
      }

      // Убеждаемся, что новый пароль отличается от старого
      if (currentPassword === newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Новый пароль должен отличаться от текущего'
        });
      }

      // Обновляем пароль (хэширование в хуке модели)
      user.password = newPassword;
      await user.save();

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
      const { password } = req.body;

      const user = await User.findByPk(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }

      // Проверяем пароль
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        return res.status(400).json({
          success: false,
          message: 'Неверный пароль'
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
      
      // Статистика по заявкам пользователя
      const applicationStats = await Application.findAll({
        attributes: [
          'status',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        where: { user_id: userId },
        group: ['status']
      });
      
      // Общее количество заявок
      const totalApplications = applicationStats.reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0);
      
      // Активные заявки
      const activeApplications = applicationStats
        .filter(stat => [
          Application.STATUSES.SUBMITTED,
          Application.STATUSES.IN_REVIEW,
          Application.STATUSES.ESTIMATED,
          Application.STATUSES.APPROVED,
          Application.STATUSES.IN_PROGRESS
        ].includes(stat.status))
        .reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0);
      
      // Последние заявки
      const recentApplications = await Application.findAll({
        where: { user_id: userId },
        limit: 5,
        order: [['created_at', 'DESC']],
        attributes: ['id', 'title', 'status', 'created_at', 'service_type']
      });
      
      res.json({
        success: true,
        data: {
          overview: {
            total_applications: totalApplications,
            active_applications: activeApplications,
            draft_applications: applicationStats
              .find(stat => stat.status === Application.STATUSES.DRAFT)?.dataValues.count || 0,
            completed_applications: applicationStats
              .find(stat => stat.status === Application.STATUSES.COMPLETED)?.dataValues.count || 0
          },
          by_status: applicationStats.map(stat => ({
            status: stat.status,
            status_display: Application.STATUSES_DISPLAY[stat.status] || stat.status,
            count: parseInt(stat.dataValues.count)
          })),
          recent_applications: recentApplications.map(app => ({
            ...app.toJSON(),
            statusDisplay: app.statusDisplay,
            serviceTypeDisplay: app.serviceTypeDisplay
          }))
        }
      });
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