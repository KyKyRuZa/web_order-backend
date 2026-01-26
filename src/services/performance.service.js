const { Application, User, ApplicationFile } = require('../models');
const { Op, fn, col } = require('sequelize');

class PerformanceService {
  static async getApplicationsOptimized(filters = {}, options = {}) {
    try {
      const {
        userId,
        userRole,
        page = 1,
        limit = 20,
        sortBy = 'created_at',
        order = 'DESC',
        includeStats = false
      } = options;

      let where = {};

      // Ограничиваем доступ в зависимости от роли
      if (userRole === User.ROLES.CLIENT) {
        where.user_id = userId;
      } else if (userRole === User.ROLES.MANAGER) {
        where.assigned_to = userId;
      }

      // Применяем фильтры
      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          where[key] = filters[key];
        }
      });

      // Опции для запроса
      const queryOptions = {
        where,
        attributes: { 
          exclude: ['description', 'internal_notes'] // Исключаем тяжелые поля, если не нужны
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email', 'phone']
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'full_name', 'email']
          }
        ],
        order: [[sortBy, order]],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit),
        subQuery: false // Оптимизация для JOIN запросов
      };

      // Добавляем файлы если нужно
      if (includeStats) {
        queryOptions.include.push({
          model: ApplicationFile,
          as: 'files',
          attributes: ['id', 'size', 'mime_type'],
          required: false
        });
      }

      const { count, rows: applications } = await Application.findAndCountAll(queryOptions);

      // Добавляем вычисляемые поля
      const applicationsWithComputed = applications.map(app => {
        const appJSON = app.toJSON();

        // Добавляем вычисляемые поля без дополнительных запросов
        return {
          ...appJSON,
          statusDisplay: app.statusDisplay,
          serviceTypeDisplay: app.serviceTypeDisplay,
          isActive: app.isActive,
          isEditable: app.isEditable
        };
      });

      return {
        success: true,
        data: {
          applications: applicationsWithComputed,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / parseInt(limit)),
            has_next: (parseInt(page) * parseInt(limit)) < count,
            has_prev: parseInt(page) > 1
          }
        }
      };
    } catch (error) {
      console.error('Optimized applications query error:', error);
      throw error;
    }
  }

  static async getStatsOptimized(userId, userRole) {
    try {
      // Используем raw: true для более быстрых запросов без создания экземпляров моделей
      const [totalApplications, activeApplications, statusBreakdown] = await Promise.all([
        // Общее количество заявок
        Application.count({
          where: userRole === User.ROLES.CLIENT ? { user_id: userId } :
                 userRole === User.ROLES.MANAGER ? { assigned_to: userId } : {}
        }),
        
        // Активные заявки
        Application.count({
          where: {
            ...(userRole === User.ROLES.CLIENT ? { user_id: userId } :
              userRole === User.ROLES.MANAGER ? { assigned_to: userId } : {}),
            status: {
              [Op.in]: [
                Application.STATUSES.SUBMITTED,
                Application.STATUSES.IN_REVIEW,
                Application.STATUSES.ESTIMATED,
                Application.STATUSES.APPROVED,
                Application.STATUSES.IN_PROGRESS
              ]
            }
          }
        }),
        
        // Распределение по статусам
        Application.findAll({
          attributes: ['status', [fn('COUNT', col('id')), 'count']],
          where: userRole === User.ROLES.CLIENT ? { user_id: userId } :
                 userRole === User.ROLES.MANAGER ? { assigned_to: userId } : {},
          group: ['status'],
          raw: true // Используем raw для более быстрого запроса
        })
      ]);

      return {
        success: true,
        data: {
          overview: {
            total_applications: totalApplications,
            active_applications: activeApplications,
            completed_applications: totalApplications - activeApplications
          },
          by_status: statusBreakdown.map(item => ({
            status: item.status,
            status_display: Application.getStatusDisplay(item.status),
            count: parseInt(item.count)
          }))
        }
      };
    } catch (error) {
      console.error('Optimized stats query error:', error);
      throw error;
    }
  }

  static invalidateCache(pattern) {
    // В реальной реализации здесь будет логика очистки кеша по шаблону
    console.log(`CACHE INVALIDATION: Clearing cache for pattern ${pattern}`);
  }
}

module.exports = PerformanceService;