const { Application, User, ApplicationFile } = require('../models');
const { Op, fn, col } = require('sequelize');
const cache = require('../config/cache');

class PerformanceService {
  /**
   * Оптимизированный метод получения заявок с кешированием и эффективной выборкой
   */
  static async getApplicationsOptimized(filters = {}, options = {}) {
    const {
      userId,
      userRole,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      order = 'DESC',
      includeStats = false
    } = options;

    // Формируем ключ кеша
    const cacheKey = `optimized_applications_${userId}_${userRole}_${JSON.stringify(filters)}_${page}_${limit}_${sortBy}_${order}`;
    const cachedResult = cache.get(cacheKey);

    if (cachedResult) {
      console.log(`CACHE HIT: Returning cached optimized applications for ${cacheKey}`);
      return cachedResult;
    }

    try {
      const where = {};

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
          statusDisplay: app.statusDisplay,  // Используем геттер модели
          serviceTypeDisplay: app.serviceTypeDisplay,  // Используем геттер модели
          isActive: app.isActive,  // Используем геттер модели
          isEditable: app.isEditable  // Используем геттер модели
        };
      });

      const result = {
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

      // Кешируем результат на 5 минут
      cache.set(cacheKey, result, 300);

      return result;
    } catch (error) {
      console.error('Optimized applications query error:', error);
      throw error;
    }
  }

  /**
   * Оптимизированный метод получения статистики
   */
  static async getStatsOptimized(userId, userRole) {
    const cacheKey = `user_stats_optimized_${userId}_${userRole}`;
    const cachedResult = cache.get(cacheKey);

    if (cachedResult) {
      console.log(`CACHE HIT: Returning cached optimized stats for ${cacheKey}`);
      return cachedResult;
    }

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

      const result = {
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

      // Кешируем результат на 2 минуты
      cache.set(cacheKey, result, 120);

      return result;
    } catch (error) {
      console.error('Optimized stats query error:', error);
      throw error;
    }
  }

  /**
   * Метод для очистки кеша по ключевым событиям
   */
  static invalidateCache(pattern) {
    // В реальной реализации здесь будет логика очистки кеша по шаблону
    console.log(`CACHE INVALIDATION: Clearing cache for pattern ${pattern}`);
  }
}

// Экспортируем отдельные функции для удобства импорта
module.exports = {
  getApplicationsOptimized: PerformanceService.getApplicationsOptimized.bind(PerformanceService),
  getStatsOptimized: PerformanceService.getStatsOptimized.bind(PerformanceService),
  invalidateCache: PerformanceService.invalidateCache.bind(PerformanceService)
};