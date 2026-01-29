const { User, Application, AuditLog } = require('../models');
const { Op } = require('sequelize');

class UserService {
  // Получение списка пользователей с фильтрацией
  static async getUsers(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      order = 'DESC'
    } = options;

    const {
      role,
      is_active,
      date_from,
      date_to,
      search,
      has_applications
    } = filters;

    const where = {};

    // Фильтрация по роли
    if (role && Object.values(User.ROLES).includes(role)) {
      where.role = role;
    }

    // Фильтрация по активности
    if (is_active !== undefined) {
      if (is_active === 'true') {
        where.deleted_at = null;
      } else if (is_active === 'false') {
        where.deleted_at = { [Op.ne]: null };
      }
    } else {
      // По умолчанию показываем только активных
      where.deleted_at = null;
    }

    // Фильтрация по дате регистрации
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) {
        where.created_at[Op.gte] = new Date(date_from);
      }
      if (date_to) {
        where.created_at[Op.lte] = new Date(date_to);
      }
    }

    // Поиск
    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { full_name: { [Op.iLike]: `%${search}%` } },
        { company_name: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Пагинация
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Сортировка
    const orderBy = [[sortBy, order.toUpperCase()]];

    // Включаем подсчет заявок пользователя
    const include = [
      {
        model: Application,
        as: 'applications',
        attributes: [],
        required: has_applications === 'true'
      }
    ];

    const { count, rows: users } = await User.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: orderBy,
      include,
      attributes: {
        include: [
          [
            require('sequelize').literal(`(
              SELECT COUNT(*)
              FROM applications
              WHERE applications.user_id = "User".id
              AND applications.deleted_at IS NULL
            )`),
            'applications_count'
          ],
          [
            require('sequelize').literal(`(
              SELECT COUNT(*)
              FROM applications
              WHERE applications.assigned_to = "User".id
              AND applications.deleted_at IS NULL
              AND applications.status NOT IN ('completed', 'cancelled')
            )`),
            'assigned_applications_count'
          ]
        ],
        exclude: ['password_hash', 'reset_password_token', 'reset_password_expires', 'email_verification_token']
      },
      group: ['User.id']
    });

    // Получаем статистику по ролям
    const roleStats = await User.findAll({
      attributes: [
        'role',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: { deleted_at: null },
      group: ['role']
    });

    // Добавляем флаги для пользователей
    const usersWithFlags = users.map(user => ({
      ...user.toJSON(),
      isManager: user.isManager,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      emailVerified: user.emailVerified
    }));

    return {
      success: true,
      data: {
        users: usersWithFlags,
        pagination: {
          total: count.length || count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil((count.length || count) / limit),
          has_next: offset + parseInt(limit) < (count.length || count),
          has_prev: offset > 0
        },
        statistics: {
          by_role: roleStats.reduce((acc, stat) => {
            acc[stat.role] = parseInt(stat.dataValues.count);
            return acc;
          }, {})
        }
      }
    };
  }

  // Обновление роли пользователя
  static async updateUserRole(id, newRole, userId, req) {
    // Проверяем, что новая роль допустима
    if (!newRole || !Object.values(User.ROLES).includes(newRole)) {
      return {
        success: false,
        message: 'Некорректная роль. Допустимые значения: ' + Object.values(User.ROLES).join(', ')
      };
    }

    // Находим пользователя
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password_hash'] }
    });

    if (!user) {
      return {
        success: false,
        message: 'Пользователь не найден'
      };
    }

    // Проверяем, что не меняем роль самому себе
    if (user.id === userId) {
      return {
        success: false,
        message: 'Нельзя изменить свою собственную роль'
      };
    }

    // Сохраняем старую роль
    const oldRole = user.role;

    // Сохраняем старые значения для аудита
    const oldValues = { role: user.role };

    // Обновляем роль
    await user.update({ role: newRole });

    // Записываем событие в аудит
    await AuditLog.logAction({
      action: AuditLog.ACTIONS.USER_ROLE_CHANGE,
      userId: userId,
      targetEntity: 'user',
      targetId: user.id,
      oldValue: oldValues,
      newValue: { role: newRole },
      ipAddress: (() => {
        const { isValidIP } = require('../utils/ip-validator.util');
        if (isValidIP(req.ip)) return req.ip;
        if (isValidIP(req.connection?.remoteAddress)) return req.connection.remoteAddress;
        if (isValidIP(req.socket?.remoteAddress)) return req.socket.remoteAddress;
        return null;
      })(),
      userAgent: req.headers['user-agent']
    });

    return {
      success: true,
      message: `Роль пользователя изменена с "${oldRole}" на "${newRole}"`,
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          old_role: oldRole,
          new_role: newRole
        }
      }
    };
  }

  // Получение профиля пользователя
  static async getProfile(userId) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash', 'reset_password_token', 'reset_password_expires', 'email_verification_token'] }
    });

    if (!user) {
      return null;
    }

    const userWithFlags = {
      ...user.toJSON(),
      isManager: user.isManager,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      emailVerified: user.emailVerified
    };

    return {
      success: true,
      data: {
        user: userWithFlags
      }
    };
  }

  // Обновление профиля пользователя
  static async updateProfile(userId, updateData) {
    const user = await User.findByPk(userId);

    if (!user) {
      return { error: 'Пользователь не найден' };
    }

    // Сохраняем старые значения для аудита
    const oldValues = { ...user.toJSON() };

    // Обновляем только переданные поля
    const updatePayload = {};
    if (updateData.full_name !== undefined) updatePayload.full_name = updateData.full_name;
    if (updateData.phone !== undefined) updatePayload.phone = updateData.phone;
    if (updateData.company_name !== undefined) updatePayload.company_name = updateData.company_name;

    await user.update(updatePayload);

    // Записываем событие в аудит
    await AuditLog.logAction({
      action: AuditLog.ACTIONS.USER_UPDATE,
      userId: userId,
      targetEntity: 'user',
      targetId: user.id,
      oldValue: oldValues,
      newValue: { ...oldValues, ...updatePayload },
      ipAddress: (() => {
        const { isValidIP } = require('../utils/ip-validator.util');
        if (updateData.req?.ip && isValidIP(updateData.req.ip)) return updateData.req.ip;
        if (updateData.req?.connection?.remoteAddress && isValidIP(updateData.req.connection.remoteAddress)) return updateData.req.connection.remoteAddress;
        if (updateData.req?.socket?.remoteAddress && isValidIP(updateData.req.socket.remoteAddress)) return updateData.req.socket.remoteAddress;
        return null;
      })(),
      userAgent: updateData.req?.headers?.['user-agent']
    });

    return {
      success: true,
      message: 'Профиль успешно обновлен',
      data: {
        user: {
          ...user.toJSON(),
          isManager: user.isManager,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          emailVerified: user.emailVerified
        }
      }
    };
  }

  // Деактивация аккаунта
  static async deactivateAccount(userId, req) {
    const user = await User.findByPk(userId);

    if (!user) {
      return { error: 'Пользователь не найден' };
    }

    // Сохраняем данные для аудита перед деактивацией
    const userData = { ...user.toJSON() };

    // Деактивируем аккаунт (soft delete)
    await user.destroy();

    // Записываем событие в аудит
    await AuditLog.logAction({
      action: AuditLog.ACTIONS.USER_DEACTIVATE,
      userId: userId,
      targetEntity: 'user',
      targetId: user.id,
      oldValue: userData,
      ipAddress: (() => {
        const { isValidIP } = require('../utils/ip-validator.util');
        if (isValidIP(req.ip)) return req.ip;
        if (isValidIP(req.connection?.remoteAddress)) return req.connection.remoteAddress;
        if (isValidIP(req.socket?.remoteAddress)) return req.socket.remoteAddress;
        return null;
      })(),
      userAgent: req.headers['user-agent']
    });

    return {
      success: true,
      message: 'Аккаунт успешно деактивирован'
    };
  }

  // Получение статистики пользователя
  static async getUserStats(userId, userRole) {
    // Используем оптимизированный сервис для получения статистики
    const PerformanceService = require('./performance.service');
    return await PerformanceService.getStatsOptimized(userId, userRole);
  }

  // Получение заявок пользователя
  static async getUserApplications(userId, filters = {}) {
    const { status, page = 1, limit = 10 } = filters;

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

    return {
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
    };
  }
}

module.exports = UserService;