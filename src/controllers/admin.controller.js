const { Application, User, StatusHistory, ApplicationFile } = require('../models');
const sequelize = require('../config/sequelize');
const { Op } = require('sequelize');
const { Application: ApplicationModel } = require('../models');

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

      // Формируем ключ кеша на основе параметров запроса
      const cacheKey = `admin_applications_${userId}_${userRole}_${JSON.stringify({
        status,
        service_type,
        priority,
        assigned_to,
        date_from,
        date_to,
        search,
        page,
        limit,
        sort_by,
        order
      })}`;

      const cachedResult = require('../config/cache').get(cacheKey);

      if (cachedResult) {
        console.log(`CACHE HIT: Returning cached admin applications for ${cacheKey}`);
        return res.json(cachedResult);
      }

      // Базовые условия
      const where = {};

      // Менеджеры видят только назначенные им заявки
      if (userRole === User.ROLES.MANAGER) {
        where.assigned_to = userId;
      } else if (userRole === User.ROLES.ADMIN && assigned_to) {
        // Админы могут фильтровать по менеджеру
        where.assigned_to = assigned_to;
      }

      // Фильтрация по статусу
      if (status) {
        if (status === 'active') {
          where.status = {
            [Op.in]: [
              Application.STATUSES.SUBMITTED,
              Application.STATUSES.IN_REVIEW,
              Application.STATUSES.IN_PROGRESS,
              Application.STATUSES.ESTIMATED,
              Application.STATUSES.APPROVED
            ]
          };
        } else {
          where.status = status;
        }
      }

      // Фильтрация по типу услуги
      if (service_type) {
        where.service_type = service_type;
      }

      // Фильтрация по приоритету
      if (priority) {
        where.priority = priority;
      }

      // Фильтрация по дате
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
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
          { contact_full_name: { [Op.iLike]: `%${search}%` } },
          { company_name: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Пагинация
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Сортировка
      const orderBy = [[sort_by, order.toUpperCase()]];

      const { count, rows: applications } = await Application.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: orderBy,
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
          },
          {
            model: StatusHistory,
            as: 'status_history',
            limit: 5,
            order: [['created_at', 'DESC']],
            include: [{
              model: User,
              as: 'changer',
              attributes: ['id', 'full_name', 'email']
            }]
          }
        ]
      });

      // Получаем доступные фильтры
      const statuses = await Application.findAll({
        attributes: ['status'],
        group: ['status'],
        where: userRole === User.ROLES.MANAGER ? { assigned_to: userId } : {}
      });

      const serviceTypes = await Application.findAll({
        attributes: ['service_type'],
        group: ['service_type'],
        where: userRole === User.ROLES.MANAGER ? { assigned_to: userId } : {}
      });

      const priorities = await Application.findAll({
        attributes: ['priority'],
        group: ['priority'],
        where: userRole === User.ROLES.MANAGER ? { assigned_to: userId } : {}
      });

      // Добавляем display значения
      const applicationsWithDisplay = applications.map(app => ({
        ...app.toJSON(),
        statusDisplay: app.statusDisplay,
        serviceTypeDisplay: app.serviceTypeDisplay
      }));

      const result = {
        success: true,
        data: {
          applications: applicationsWithDisplay,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit),
            has_next: offset + parseInt(limit) < count,
            has_prev: offset > 0
          },
          filters: {
            available: {
              statuses: statuses.map(s => ({
                value: s.status,
                label: Application.STATUSES_DISPLAY[s.status] || s.status
              })),
              service_types: serviceTypes.map(s => ({
                value: s.service_type,
                label: Application.SERVICE_TYPES_DISPLAY[s.service_type] || s.service_type
              })),
              priorities: priorities.map(p => ({
                value: p.priority,
                label: Application.PRIORITIES_DISPLAY[p.priority] || p.priority
              }))
            },
            applied: {
              status,
              service_type,
              priority,
              assigned_to,
              date_from,
              date_to,
              search
            }
          }
        }
      };

      // Кешируем результат на 5 минут
      require('../config/cache').set(cacheKey, result, 300);

      res.json(result);
    } catch (error) {
      console.error('Get applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения заявок'
      });
    }
  }

  static async updateApplicationStatus(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { id } = req.params;
      const { status, comment } = req.body;
      const userId = req.user.id;
      const ip = req.ip;
      const userAgent = req.headers['user-agent'];

      // Валидация статуса
      const validStatuses = Object.values(Application.STATUSES);

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Некорректный статус'
        });
      }

      // Находим заявку
      const application = await Application.findByPk(id, {
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'email', 'full_name']
        }],
        transaction
      });

      if (!application) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена'
        });
      }

      // Проверяем возможность смены статуса
      // Если статус не меняется, просто возвращаем успешный ответ
      if (application.status === status) {
        await transaction.commit();

        res.json({
          success: true,
          message: 'Статус не изменился (уже был таким)',
          data: {
            application: {
              ...application.toJSON(),
              statusDisplay: application.statusDisplay,
              serviceTypeDisplay: application.serviceTypeDisplay
            },
            status_change: {
              old_status: application.status,
              old_status_display: application.statusDisplay,
              new_status: status,
              new_status_display: ApplicationModel.STATUSES_DISPLAY[status] || status,
              changed_by: req.user.full_name,
              changed_at: new Date()
            }
          }
        });
        return;
      }

      if (!application.canChangeStatus(status)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Невозможно изменить статус с "${application.statusDisplay}" на "${status}"`,
          availableTransitions: Application.getStatusTransitions(application.status)
        });
      }

      // Используем метод модели для изменения статуса
      await application.changeStatus(status, userId, {
        comment,
        ipAddress: ip,
        userAgent,
        transaction
      });

      // Коммитим транзакцию
      await transaction.commit();

      // Получаем обновленную заявку
      const updatedApplication = await Application.findByPk(id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email']
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'full_name', 'email']
          },
          {
            model: StatusHistory,
            as: 'status_history',
            limit: 10,
            order: [['created_at', 'DESC']],
            include: [{
              model: User,
              as: 'changer',
              attributes: ['id', 'full_name', 'email']
            }]
          }
        ]
      });

      // TODO: Отправка email уведомления клиенту

      res.json({
        success: true,
        message: `Статус заявки изменен с "${application.statusDisplay}" на "${updatedApplication.statusDisplay}"`,
        data: {
          application: updatedApplication,
          status_change: {
            old_status: application.status,
            old_status_display: application.statusDisplay,
            new_status: updatedApplication.status,
            new_status_display: updatedApplication.statusDisplay,
            changed_by: req.user.full_name,
            changed_at: new Date()
          }
        }
      });
    } catch (error) {
      await transaction.rollback();
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

      if (!manager_id) {
        return res.status(400).json({
          success: false,
          message: 'ID менеджера обязателен'
        });
      }

      // Проверяем, что менеджер существует и имеет нужную роль
      const manager = await User.findOne({
        where: {
          id: manager_id,
          role: { [Op.in]: [User.ROLES.MANAGER, User.ROLES.ADMIN] }
        }
      });

      if (!manager) {
        return res.status(404).json({
          success: false,
          message: 'Менеджер не найден или не имеет нужных прав'
        });
      }

      // Находим заявку
      const application = await Application.findByPk(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена'
        });
      }

      // Сохраняем старого менеджера для истории
      const oldManagerId = application.assigned_to;

      // Обновляем заявку
      await application.update({ assigned_to: manager_id });

      // TODO: Запись в историю назначений
      // TODO: Уведомление менеджеру

      res.json({
        success: true,
        message: `Менеджер назначен: ${manager.full_name}`,
        data: {
          application_id: id,
          old_manager_id: oldManagerId,
          new_manager: {
            id: manager.id,
            full_name: manager.full_name,
            email: manager.email
          }
        }
      });
    } catch (error) {
      console.error('Assign manager error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка назначения менеджера'
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
      const orderBy = [[sort_by, order.toUpperCase()]];

      // Включаем подсчет заявок пользователя
      const include = [
        {
          model: Application,
          as: 'applications',
          attributes: [],
          required: has_applications === 'true'
        }
      ];

      // Получаем пользователей
      const { count, rows: users } = await User.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: orderBy,
        include,
        attributes: {
          include: [
            [
              sequelize.literal(`(
                SELECT COUNT(*)
                FROM applications
                WHERE applications.user_id = "User".id
                AND applications.deleted_at IS NULL
              )`),
              'applications_count'
            ],
            [
              sequelize.literal(`(
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
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: { deleted_at: null },
        group: ['role']
      });

      // Добавляем флаги для пользователей
      const usersWithFlags = users.map(user => ({
        ...user.toJSON(),
        isManager: user.isManager,
        isAdmin: user.isAdmin,
        emailVerified: user.emailVerified
      }));

      res.json({
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
      });
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

      if (!role || !Object.values(User.ROLES).includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Некорректная роль. Допустимые значения: ' + Object.values(User.ROLES).join(', ')
        });
      }

      // Находим пользователя
      const user = await User.findByPk(id, {
        attributes: { exclude: ['password_hash'] }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }

      // Проверяем, что не меняем роль самому себе
      if (user.id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Нельзя изменить свою собственную роль'
        });
      }

      // Сохраняем старую роль
      const oldRole = user.role;

      // Обновляем роль
      await user.update({ role });

      // TODO: Запись в AuditLog
      // TODO: Уведомление пользователю об изменении роли

      res.json({
        success: true,
        message: `Роль пользователя изменена с "${oldRole}" на "${role}"`,
        data: {
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            old_role: oldRole,
            new_role: role
          }
        }
      });
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

      const where = {};
      if (userRole === User.ROLES.MANAGER) {
        where.assigned_to = req.user.id;
      }

      // Статистика по заявкам
      const applicationStats = await Application.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [
            sequelize.literal(`COUNT(CASE WHEN priority = 'urgent' THEN 1 END)`),
            'urgent_count'
          ],
          [
            sequelize.literal(`COUNT(CASE WHEN priority = 'high' THEN 1 END)`),
            'high_count'
          ]
        ],
        where,
        group: ['status']
      });

      // Статистика по пользователям
      const userStats = await User.findAll({
        attributes: [
          'role',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [
            sequelize.literal(`COUNT(CASE WHEN is_email_verified = true THEN 1 END)`),
            'verified_count'
          ]
        ],
        where: { deleted_at: null },
        group: ['role']
      });

      // Статистика по типам услуг
      const serviceStats = await Application.findAll({
        attributes: [
          'service_type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where,
        group: ['service_type'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 5
      });

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
          role: { [Op.in]: [User.ROLES.MANAGER, User.ROLES.ADMIN] },
          deleted_at: null
        },
        order: [[sequelize.literal('active_applications'), 'DESC']],
        limit: 10
      });

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

      // Сводная статистика
      const totalApplications = applicationStats.reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0);
      const activeApplications = applicationStats
        .filter(stat => [
          Application.STATUSES.SUBMITTED,
          Application.STATUSES.IN_REVIEW,
          Application.STATUSES.ESTIMATED,
          Application.STATUSES.APPROVED,
          Application.STATUSES.IN_PROGRESS
        ].includes(stat.status))
        .reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0);

      const newToday = await Application.count({
        where: {
          created_at: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          },
          ...where
        }
      });

      const completedThisMonth = await Application.count({
        where: {
          status: Application.STATUSES.COMPLETED,
          created_at: {
            [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          },
          ...where
        }
      });

      // Заявки, требующие внимания (высокий приоритет или просроченные)
      const attentionNeeded = await Application.count({
        where: {
          ...where,
          [Op.or]: [
            { priority: { [Op.in]: ['high', 'urgent'] } },
            { status: Application.STATUSES.NEEDS_INFO }
          ],
          status: {
            [Op.notIn]: [Application.STATUSES.COMPLETED, Application.STATUSES.CANCELLED]
          }
        }
      });

      res.json({
        success: true,
        data: {
          overview: {
            total_applications: totalApplications,
            active_applications: activeApplications,
            new_today: newToday,
            completed_this_month: completedThisMonth,
            attention_needed: attentionNeeded,
            total_users: userStats.reduce((sum, stat) => sum + parseInt(stat.dataValues.count), 0)
          },
          by_status: applicationStats.map(stat => ({
            status: stat.status,
            status_display: Application.STATUSES_DISPLAY[stat.status] || stat.status,
            count: parseInt(stat.dataValues.count),
            urgent_count: parseInt(stat.dataValues.urgent_count),
            high_count: parseInt(stat.dataValues.high_count)
          })),
          by_service: serviceStats.map(stat => ({
            service_type: stat.service_type,
            service_type_display: Application.SERVICE_TYPES_DISPLAY[stat.service_type] || stat.service_type,
            count: parseInt(stat.dataValues.count)
          })),
          by_role: userStats.map(stat => ({
            role: stat.role,
            count: parseInt(stat.dataValues.count),
            verified_count: parseInt(stat.dataValues.verified_count)
          })),
          manager_load: managerStats.map(manager => ({
            id: manager.id,
            full_name: manager.full_name,
            email: manager.email,
            role: manager.role,
            active_applications: parseInt(manager.dataValues.active_applications) || 0
          })),
          recent_activity: recentActivity.map(activity => ({
            id: activity.id,
            type: 'status_changed',
            old_status: activity.old_status,
            old_status_display: Application.STATUSES_DISPLAY[activity.old_status] || activity.old_status,
            new_status: activity.new_status,
            new_status_display: Application.STATUSES_DISPLAY[activity.new_status] || activity.new_status,
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
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения статистики'
      });
    }
  }

  static async getApplicationDetails(req, res) {
    try {
      const { id } = req.params;

      const application = await Application.findByPk(id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email', 'phone', 'company_name']
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'full_name', 'email', 'phone']
          },
          {
            model: StatusHistory,
            as: 'status_history',
            include: [{
              model: User,
              as: 'changer',
              attributes: ['id', 'full_name', 'email']
            }],
            order: [['created_at', 'DESC']]
          },
          {
            model: ApplicationFile,
            as: 'files',
            attributes: ['id', 'original_name', 'filename', 'file_category', 'uploaded_at', 'size', 'mime_type', 'description']
          }
        ]
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена'
        });
      }

      // Добавляем display значения
      const applicationWithDisplay = {
        ...application.toJSON(),
        statusDisplay: application.statusDisplay,
        serviceTypeDisplay: application.serviceTypeDisplay,
        isActive: application.isActive,
        isEditable: application.isEditable
      };

      // Форматируем размеры файлов
      applicationWithDisplay.files = applicationWithDisplay.files.map(file => ({
        ...file,
        sizeFormatted: ApplicationFile.prototype.sizeFormatted.call({ size: file.size }),
        isImage: file.mime_type.startsWith('image/'),
        isDocument: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mime_type)
      }));

      res.json({
        success: true,
        data: { application: applicationWithDisplay }
      });
    } catch (error) {
      console.error('Get application details error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения информации о заявке'
      });
    }
  }

  static async addInternalNote(req, res) {
    try {
      const { id } = req.params;
      const { note } = req.body;

      if (!note || note.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Заметка не может быть пустой'
        });
      }

      const application = await Application.findByPk(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена'
        });
      }

      // Форматируем заметку с датой и автором
      const timestamp = new Date().toLocaleString('ru-RU');
      const author = req.user.full_name;
      const formattedNote = `[${timestamp}] ${author}:\n${note.trim()}\n\n`;

      // Добавляем к существующим заметкам или создаем новые
      const currentNotes = application.internal_notes || '';
      const updatedNotes = currentNotes + formattedNote;

      await application.update({ internal_notes: updatedNotes });

      res.json({
        success: true,
        message: 'Заметка добавлена',
        data: {
          application_id: id,
          note: formattedNote.trim(),
          added_by: author,
          added_at: timestamp
        }
      });
    } catch (error) {
      console.error('Add internal note error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка добавления заметки'
      });
    }
  }

  static async resetToDraft(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const application = await Application.findByPk(id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена'
        });
      }

      // Используем метод модели
      await application.resetToDraft(reason);

      res.json({
        success: true,
        message: 'Заявка возвращена в статус черновика',
        data: {
          application_id: id,
          status: application.status,
          status_display: application.statusDisplay
        }
      });
    } catch (error) {
      console.error('Reset to draft error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Ошибка возврата заявки в черновик'
      });
    }
  }
}

// Добавляем объекты для display значений
Application.STATUSES_DISPLAY = {
  [Application.STATUSES.DRAFT]: 'Черновик',
  [Application.STATUSES.SUBMITTED]: 'Отправлено',
  [Application.STATUSES.IN_REVIEW]: 'На рассмотрении',
  [Application.STATUSES.NEEDS_INFO]: 'Требуется информация',
  [Application.STATUSES.ESTIMATED]: 'Оценено',
  [Application.STATUSES.APPROVED]: 'Утверждено',
  [Application.STATUSES.IN_PROGRESS]: 'В работе',
  [Application.STATUSES.COMPLETED]: 'Завершено',
  [Application.STATUSES.CANCELLED]: 'Отменено'
};

Application.SERVICE_TYPES_DISPLAY = {
  [Application.SERVICE_TYPES.LANDING]: 'Лендинг',
  [Application.SERVICE_TYPES.CORPORATE]: 'Корпоративный сайт',
  [Application.SERVICE_TYPES.ECOMMERCE]: 'Интернет-магазин',
  [Application.SERVICE_TYPES.WEB_APP]: 'Веб-приложение',
  [Application.SERVICE_TYPES.REDESIGN]: 'Редизайн',
  [Application.SERVICE_TYPES.OTHER]: 'Другое'
};

Application.PRIORITIES_DISPLAY = {
  [Application.PRIORITIES.LOW]: 'Низкий',
  [Application.PRIORITIES.NORMAL]: 'Обычный',
  [Application.PRIORITIES.HIGH]: 'Высокий',
  [Application.PRIORITIES.URGENT]: 'Срочный'
};

Application.BUDGET_RANGES_DISPLAY = {
  [Application.BUDGET_RANGES.UNDER_50K]: 'До 50 000 ₽',
  [Application.BUDGET_RANGES.FROM_50K_TO_100K]: '50 000 - 100 000 ₽',
  [Application.BUDGET_RANGES.FROM_100K_TO_300K]: '100 000 - 300 000 ₽',
  [Application.BUDGET_RANGES.FROM_300K_TO_500K]: '300 000 - 500 000 ₽',
  [Application.BUDGET_RANGES.NEGOTIABLE]: 'Договорная'
};

module.exports = AdminController;