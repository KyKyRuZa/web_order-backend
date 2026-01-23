const { User, Application } = require('../models');

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
      if (fullName !== undefined) user.full_name = fullName;
      if (phone !== undefined) user.phone = phone;
      if (companyName !== undefined) user.company_name = companyName;

      await user.save();

      res.json({
        success: true,
        message: 'Профиль успешно обновлен',
        data: {
          user: user.toJSON()
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
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
      user.password_hash = newPassword;
      await user.save();

      res.json({
        success: true,
        message: 'Пароль успешно изменен'
      });
    } catch (error) {
      console.error('Change password error:', error);
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

      const offset = (page - 1) * limit;

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

      res.json({
        success: true,
        data: {
          applications,
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
}

module.exports = UserController;