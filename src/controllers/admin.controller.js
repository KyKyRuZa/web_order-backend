const { Application, User, StatusHistory, ApplicationFile, AuditLog } = require('../models');
const sequelize = require('../config/sequelize');
const { Op } = require('sequelize');
const { Application: ApplicationModel } = require('../models');
const ApplicationService = require('../services/application.service');
const UserService = require('../services/user.service');
const FileService = require('../services/file.service');
const NoteService = require('../services/note.service');
const AuditService = require('../services/audit.service');

class AdminController {
  static async getApplications(req, res) {
    try {
      const {
        status,
        service_type,
        priority,
        assigned_to,
        date_from,
        date_to,
        search,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        order = 'DESC'
      } = req.query;

      const userId = req.user.id;
      const userRole = req.user.role;

      // Подготовим фильтры и опции
      const filters = {
        status,
        service_type,
        priority,
        assigned_to,
        date_from,
        date_to,
        search
      };

      const options = {
        userId,
        userRole,
        page,
        limit,
        sortBy: sort_by,
        order
      };

      const result = await ApplicationService.getApplications(filters, options);
      res.json(result);
    } catch (error) {
      console.error('Get applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения заявок'
      });
    }
  }

  static async getApplicationDetails(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await ApplicationService.getById(id, userId, userRole);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена или у вас нет к ней доступа'
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Get application details error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения деталей заявки'
      });
    }
  }

  static async updateApplicationStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, comment } = req.body;
      const userId = req.user.id;

      const result = await ApplicationService.updateStatus(id, status, userId, comment, req);

      if (result.error) {
        return res.status(400).json({
          success: false,
          message: result.error
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Update application status error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка изменения статуса заявки'
      });
    }
  }

  static async assignManager(req, res) {
    try {
      const { id } = req.params;
      const { manager_id } = req.body;
      const userId = req.user.id;

      const result = await ApplicationService.assignManager(id, manager_id, userId, req);

      if (result.error) {
        return res.status(404).json({
          success: false,
          message: result.error
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Assign manager error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка назначения менеджера'
      });
    }
  }

  static async addInternalNote(req, res) {
    try {
      const { id } = req.params; // id заявки
      const { note } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Подготовим данные для создания заметки
      const noteData = {
        content: note,
        noteType: 'internal', // внутренняя заметка
        ip: (() => {
          const { isValidIP } = require('../utils/ip-validator.util');
          if (isValidIP(req.ip)) return req.ip;
          if (isValidIP(req.connection?.remoteAddress)) return req.connection.remoteAddress;
          if (isValidIP(req.socket?.remoteAddress)) return req.socket.remoteAddress;
          return null;
        })(),
        userAgent: req.headers['user-agent']
      };

      const result = await NoteService.createNote(id, userId, userRole, noteData);

      if (result.error) {
        return res.status(400).json({
          success: false,
          message: result.error
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Add internal note error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка добавления внутренней заметки'
      });
    }
  }

  static async getUsers(req, res) {
    try {
      const {
        role,
        is_active,
        date_from,
        date_to,
        search,
        has_applications,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        order = 'DESC'
      } = req.query;

      const userRole = req.user.role;

      // Проверяем права доступа
      if (userRole !== User.ROLES.ADMIN && userRole !== User.ROLES.SUPER_ADMIN) {
        // Менеджеры могут получать только список других менеджеров
        if (userRole === User.ROLES.MANAGER) {
          if (role && role !== 'manager') {
            return res.status(403).json({
              success: false,
              message: 'Менеджеры могут получать только список других менеджеров'
            });
          }
          // Устанавливаем принудительно роль 'manager', чтобы предотвратить получение других ролей
          const filters = {
            role: 'manager', // Только менеджеры
            is_active,
            date_from,
            date_to,
            search,
            has_applications
          };

          const options = {
            page,
            limit,
            sortBy: sort_by,
            order
          };

          const result = await UserService.getUsers(filters, options);
          res.json(result);
        } else {
          return res.status(403).json({
            success: false,
            message: 'Недостаточно прав для получения списка пользователей'
          });
        }
      } else {
        // Администраторы и суперадмины могут получать список всех пользователей
        const filters = {
          role,
          is_active,
          date_from,
          date_to,
          search,
          has_applications
        };

        const options = {
          page,
          limit,
          sortBy: sort_by,
          order
        };

        const result = await UserService.getUsers(filters, options);
        res.json(result);
      }
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения пользователей'
      });
    }
  }

  static async updateUserRole(req, res) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const userId = req.user.id;

      const result = await UserService.updateUserRole(id, role, userId, req);

      if (result.error) {
        return res.status(400).json({
          success: false,
          message: result.message || result.error
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка изменения роли пользователя'
      });
    }
  }

  static async getDashboardStats(req, res) {
    try {
      const userRole = req.user.role;
      const userId = req.user.id;

      // Используем оптимизированный сервис для получения статистики
      const PerformanceService = require('../services/performance.service');
      const stats = await PerformanceService.getStatsOptimized(userId, userRole);

      res.json(stats);
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения статистики'
      });
    }
  }

  static async resetToDraft(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Находим заявку
      const application = await Application.findByPk(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена'
        });
      }

      // Проверяем возможность сброса
      if (![Application.STATUSES.SUBMITTED, Application.STATUSES.IN_REVIEW, Application.STATUSES.APPROVED].includes(application.status)) {
        return res.status(400).json({
          success: false,
          message: 'Заявку можно вернуть в черновик только из статусов: отправлена, на рассмотрении, утверждена'
        });
      }

      // Используем метод модели для сброса в черновик
      await application.resetToDraft('Возврат в черновик администратором', userId, {
        ipAddress: (() => {
          const { isValidIP } = require('../utils/ip-validator.util');
          if (isValidIP(req.ip)) return req.ip;
          if (isValidIP(req.connection?.remoteAddress)) return req.connection.remoteAddress;
          if (isValidIP(req.socket?.remoteAddress)) return req.socket.remoteAddress;
          return null;
        })(),
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Заявка возвращена в черновик',
        data: {
          application: {
            ...application.toJSON(),
            statusDisplay: application.statusDisplay,
            serviceTypeDisplay: application.serviceTypeDisplay
          }
        }
      });
    } catch (error) {
      console.error('Reset to draft error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка возврата заявки в черновик'
      });
    }
  }

  static async getApplicationStatusHistory(req, res) {
    try {
      const { id } = req.params;

      // Проверяем, существует ли заявка и есть ли к ней доступ
      const application = await Application.findByPk(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена'
        });
      }

      // Получаем историю статусов
      const statusHistory = await StatusHistory.findAll({
        where: { application_id: id },
        order: [['created_at', 'DESC']],
        include: [{
          model: User,
          as: 'changer',
          attributes: ['id', 'full_name', 'email']
        }]
      });

      res.json({
        success: true,
        data: {
          status_history: statusHistory.map(record => ({
            ...record.toJSON(),
            change_summary: record.changeSummary,
            change_time: record.changeTime
          }))
        }
      });
    } catch (error) {
      console.error('Get application status history error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения истории статусов'
      });
    }
  }

  static async getApplicationFiles(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await FileService.getFiles(id, userId, userRole);

      if (result.error) {
        return res.status(404).json({
          success: false,
          message: result.error
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Get application files error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения файлов заявки'
      });
    }
  }

  static async getAuditLogs(req, res) {
    try {
      const {
        action,
        userId,
        targetEntity,
        targetId,
        dateFrom,
        dateTo,
        severity,
        page = 1,
        limit = 20
      } = req.query;

      const filters = {
        action,
        userId,
        targetEntity,
        targetId,
        dateFrom,
        dateTo,
        severity,
        page,
        limit
      };

      const result = await AuditService.getLogs(filters);

      if (result.error) {
        return res.status(404).json({
          success: false,
          message: result.error
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения логов аудита'
      });
    }
  }

  static async getUserApplications(req, res) {
    try {
      const { id } = req.params; // ID пользователя
      const { status, page = 1, limit = 10 } = req.query;

      const filters = {
        status,
        page,
        limit
      };

      const result = await UserService.getUserApplications(id, filters);

      if (result.error) {
        return res.status(404).json({
          success: false,
          message: result.error
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Get user applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения заявок пользователя'
      });
    }
  }

  static async getManagerLoad(req, res) {
    try {
      // Статистика по менеджерам (нагрузка)
      const managerStats = await User.findAll({
        attributes: [
          'id',
          'full_name',
          'email',
          'role',
          [
            sequelize.literal(`(
              SELECT COUNT(*)
              FROM applications
              WHERE applications.assigned_to = "User".id
              AND applications.deleted_at IS NULL
              AND applications.status NOT IN ('completed', 'cancelled')
            )`),
            'active_applications'
          ]
        ],
        where: {
          role: { [Op.in]: [User.ROLES.MANAGER, User.ROLES.ADMIN, User.ROLES.SUPER_ADMIN] },
          deleted_at: null
        },
        order: [[sequelize.literal('active_applications'), 'DESC']],
        limit: 10
      });

      res.json({
        success: true,
        data: {
          manager_load: managerStats.map(manager => ({
            id: manager.id,
            full_name: manager.full_name,
            email: manager.email,
            role: manager.role,
            active_applications: parseInt(manager.dataValues.active_applications) || 0
          }))
        }
      });
    } catch (error) {
      console.error('Get manager load error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения нагрузки на менеджеров'
      });
    }
  }

  static async getRecentActivity(req, res) {
    try {
      const userRole = req.user.role;
      const userId = req.user.id;

      let where = {};
      if (userRole === User.ROLES.MANAGER) {
        where = { '$application.assigned_to$': userId };
      }

      // Последняя активность
      const recentActivity = await StatusHistory.findAll({
        attributes: [
          'id',
          'old_status',
          'new_status',
          'comment',
          'created_at',
          'ip_address'
        ],
        include: [
          {
            model: User,
            as: 'changer',
            attributes: ['id', 'full_name', 'email']
          },
          {
            model: Application,
            as: 'application',
            attributes: ['id', 'title'],
            include: [{
              model: User,
              as: 'user',
              attributes: ['id', 'full_name']
            }]
          }
        ],
        where: userRole === User.ROLES.MANAGER ?
          { '$application.assigned_to$': req.user.id } : {},
        order: [['created_at', 'DESC']],
        limit: 15
      });

      res.json({
        success: true,
        data: {
          recent_activity: recentActivity.map(activity => ({
            id: activity.id,
            type: 'status_changed',
            old_status: activity.old_status,
            old_status_display: ApplicationModel.getStatusDisplay(activity.old_status) || activity.old_status,
            new_status: activity.new_status,
            new_status_display: ApplicationModel.getStatusDisplay(activity.new_status) || activity.new_status,
            comment: activity.comment,
            application: {
              id: activity.application?.id,
              title: activity.application?.title,
              client: activity.application?.user?.full_name
            },
            changed_by: activity.changer?.full_name,
            ip_address: activity.ip_address,
            time: activity.created_at
          }))
        }
      });
    } catch (error) {
      console.error('Get recent activity error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения последней активности'
      });
    }
  }
}

module.exports = AdminController;