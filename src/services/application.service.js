const { Application, User, StatusHistory, ApplicationFile, AuditLog } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/sequelize');

class ApplicationService {
  // Получение списка заявок с фильтрацией
  static async getApplications(filters = {}, options = {}) {
    const {
      userId,
      userRole,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      order = 'DESC',
      includeStats = false
    } = options;

    const {
      status,
      service_type,
      priority,
      assigned_to,
      date_from,
      date_to,
      search
    } = filters;

    // Базовые условия
    const where = {};

    // Клиенты видят только свои заявки
    if (userRole === User.ROLES.CLIENT) {
      where.user_id = userId;
    }
    // Менеджеры видят только назначенные им заявки
    else if (userRole === User.ROLES.MANAGER) {
      where.assigned_to = userId;
    }
    // Администраторы могут фильтровать по менеджеру
    else if ((userRole === User.ROLES.ADMIN || userRole === User.ROLES.SUPER_ADMIN) && assigned_to) {
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
    const orderBy = [[sortBy, order.toUpperCase()]];

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
      where: (userRole === User.ROLES.MANAGER || userRole === User.ROLES.ADMIN || userRole === User.ROLES.SUPER_ADMIN) ? { assigned_to: userId } : {}
    });

    const serviceTypes = await Application.findAll({
      attributes: ['service_type'],
      group: ['service_type'],
      where: (userRole === User.ROLES.MANAGER || userRole === User.ROLES.ADMIN || userRole === User.ROLES.SUPER_ADMIN) ? { assigned_to: userId } : {}
    });

    const priorities = await Application.findAll({
      attributes: ['priority'],
      group: ['priority'],
      where: (userRole === User.ROLES.MANAGER || userRole === User.ROLES.ADMIN || userRole === User.ROLES.SUPER_ADMIN) ? { assigned_to: userId } : {}
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
              label: Application.getStatusDisplay(s.status) || s.status
            })),
            service_types: serviceTypes.map(s => ({
              value: s.service_type,
              label: Application.getServiceTypeDisplay(s.service_type) || s.service_type
            })),
            priorities: priorities.map(p => ({
              value: p.priority,
              label: p.priority // Используем значение напрямую, т.к. нет метода для приоритетов
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

    return result;
  }

  // Получение заявки по ID
  static async getById(id, userId, userRole) {
    const where = { id };

    // Клиенты могут видеть только свои заявки
    if (userRole === User.ROLES.CLIENT) {
      where.user_id = userId;
    }
    // Менеджеры видят только назначенные им заявки
    else if (userRole === User.ROLES.MANAGER) {
      where.assigned_to = userId;
    }

    const application = await Application.findOne({
      where,
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
          model: ApplicationFile,
          as: 'files',
          attributes: ['id', 'original_name', 'file_category', 'uploaded_at', 'size', 'mime_type', 'description']
        }
      ]
    });

    if (!application) {
      return null;
    }

    // Добавляем display значения
    const applicationWithDisplay = {
      ...application.toJSON(),
      statusDisplay: application.statusDisplay,
      serviceTypeDisplay: application.serviceTypeDisplay,
      isActive: application.isActive,
      isEditable: application.isEditable
    };

    if (applicationWithDisplay.files) {
      // Проверяем, является ли files массивом, если нет - преобразуем в массив
      let filesArray = Array.isArray(applicationWithDisplay.files) ? applicationWithDisplay.files : [applicationWithDisplay.files];

      // Фильтруем null/undefined значения и файлы без id и форматируем оставшиеся файлы
      applicationWithDisplay.files = filesArray
        .filter(file => file && file.id && typeof file.id !== 'undefined') // Убираем null/undefined файлы и файлы без id
        .map(file => ({
          ...file,
          sizeFormatted: file.size != null ? new (ApplicationFile)( { size: file.size }).sizeFormatted : '0 B',
          isImage: file.mime_type && file.mime_type.startsWith('image/'),
          isDocument: file.mime_type && ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mime_type)
        }));
    } else {
      applicationWithDisplay.files = []; // Устанавливаем пустой массив, если файлов нет
    }

    return {
      success: true,
      data: { application: applicationWithDisplay }
    };
  }

  // Создание новой заявки
  static async create(userId, applicationData) {
    // Получаем информацию о пользователе для автозаполнения контактных данных
    const user = await User.findByPk(userId, {
      attributes: ['full_name', 'email', 'phone', 'company_name']
    });

    const application = await Application.create({
      user_id: userId,
      title: applicationData.title,
      description: applicationData.description,
      service_type: applicationData.service_type,
      contact_full_name: applicationData.contactFullName || applicationData.contact_full_name || user.full_name,
      contact_email: applicationData.contactEmail || applicationData.contact_email || user.email,
      contact_phone: applicationData.contactPhone || applicationData.contact_phone || user.phone,
      company_name: applicationData.companyName || applicationData.company_name || user.company_name,
      expected_budget: applicationData.expectedBudget || applicationData.expected_budget,
      status: Application.STATUSES.DRAFT
    });

    return application;
  }

  // Обновление заявки
  static async update(id, userId, userRole, updateData) {
    const where = { id };

    // Клиенты могут обновлять только свои заявки в определенных статусах
    if (userRole === User.ROLES.CLIENT) {
      where.user_id = userId;
      // Клиенты могут редактировать заявки в статусах DRAFT, SUBMITTED, IN_REVIEW
      where.status = {
        [Op.in]: [Application.STATUSES.DRAFT, Application.STATUSES.SUBMITTED, Application.STATUSES.IN_REVIEW]
      };
    }
    // Менеджеры могут обновлять назначенные им заявки
    else if (userRole === User.ROLES.MANAGER) {
      where.assigned_to = userId;
      // Менеджеры не могут менять статус на черновик
      if (updateData.status === Application.STATUSES.DRAFT) {
        delete updateData.status;
      }
    }

    const application = await Application.findOne({ where });

    if (!application) {
      return null;
    }

    // Проверяем возможность редактирования
    if (userRole === User.ROLES.CLIENT && !application.isEditable) {
      return { error: 'Заявка не может быть отредактирована в текущем статусе' };
    }

    // Если пользователь - клиент и не предоставил контактные данные, используем данные из профиля
    if (userRole === User.ROLES.CLIENT) {
      // Получаем информацию о пользователе для автозаполнения контактных данных
      const user = await User.findByPk(userId, {
        attributes: ['full_name', 'email', 'phone', 'company_name']
      });

      // Автоматически заполняем контактные данные, если они не были предоставлены
      if (!updateData.contact_full_name) {
        updateData.contact_full_name = user.full_name;
      }
      if (!updateData.contact_email) {
        updateData.contact_email = user.email;
      }
      if (!updateData.contact_phone) {
        updateData.contact_phone = user.phone;
      }
      if (!updateData.company_name) {
        updateData.company_name = user.company_name;
      }
    }

    await application.update(updateData);

    return application;
  }

  // Удаление заявки
  static async delete(id, userId, userRole) {
    const where = { id };

    // Клиенты могут удалять только свои заявки в определенных статусах
    if (userRole === User.ROLES.CLIENT) {
      where.user_id = userId;
      // Клиенты могут удалять заявки в статусах DRAFT, SUBMITTED, IN_REVIEW
      where.status = {
        [Op.in]: [Application.STATUSES.DRAFT, Application.STATUSES.SUBMITTED, Application.STATUSES.IN_REVIEW]
      };
    }
    // Админы могут удалять любые заявки
    else if (userRole !== User.ROLES.ADMIN && userRole !== User.ROLES.SUPER_ADMIN) {
      return { error: 'Недостаточно прав для удаления заявки' };
    }

    const application = await Application.findOne({ where });

    if (!application) {
      return null;
    }

    await application.destroy();

    return application;
  }

  // Отправка заявки
  static async submit(id, userId) {
    const application = await Application.findOne({
      where: {
        id,
        user_id: userId,
        status: Application.STATUSES.DRAFT
      }
    });

    if (!application) {
      return null;
    }

    // Проверяем обязательные поля
    const requiredFields = ['title', 'service_type', 'contact_full_name', 'contact_email', 'contact_phone'];
    const missingFields = requiredFields.filter(field => !application[field]);

    if (missingFields.length > 0) {
      return { 
        error: 'Заполните обязательные поля',
        missingFields
      };
    }

    // Используем метод модели для изменения статуса
    await application.changeStatus(Application.STATUSES.SUBMITTED, userId);

    return application;
  }

  // Изменение статуса заявки
  static async updateStatus(id, status, userId, comment, req) {
    const transaction = await sequelize.transaction();

    try {
      // Валидация статуса
      const validStatuses = Object.values(Application.STATUSES);

      if (!validStatuses.includes(status)) {
        await transaction.rollback();
        return { error: 'Некорректный статус' };
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
        return { error: 'Заявка не найдена' };
      }

      // Проверяем возможность смены статуса
      // Если статус не меняется, просто возвращаем успешный ответ
      if (application.status === status) {
        await transaction.commit();

        return {
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
              new_status_display: Application.getStatusDisplay(status) || status,
              changed_by: req.user.full_name,
              changed_at: new Date()
            }
          }
        };
      }

      if (!application.canChangeStatus(status)) {
        await transaction.rollback();
        return {
          error: `Невозможно изменить статус с "${application.statusDisplay}" на "${status}"`,
          availableTransitions: Application.getStatusTransitions(application.status)
        };
      }

      // Сохраняем старые значения для аудита
      const oldStatus = application.status;

      // Используем метод модели для изменения статуса
      await application.changeStatus(status, userId, {
        comment,
        ipAddress: (() => {
          const { isValidIP } = require('../utils/ip-validator.util');
          if (isValidIP(req.ip)) return req.ip;
          if (isValidIP(req.connection?.remoteAddress)) return req.connection.remoteAddress;
          if (isValidIP(req.socket?.remoteAddress)) return req.socket.remoteAddress;
          return null;
        })(),
        userAgent: req.headers['user-agent'],
        transaction
      });

      // Записываем событие в аудит
      await AuditLog.logAction({
        action: AuditLog.ACTIONS.APPLICATION_STATUS_CHANGE,
        userId: userId,
        targetEntity: 'application',
        targetId: application.id,
        oldValue: { status: oldStatus },
        newValue: { status: application.status },
        ipAddress: (() => {
          const { isValidIP } = require('../utils/ip-validator.util');
          if (isValidIP(req.ip)) return req.ip;
          if (isValidIP(req.connection?.remoteAddress)) return req.connection.remoteAddress;
          if (isValidIP(req.socket?.remoteAddress)) return req.socket.remoteAddress;
          return null;
        })(),
        userAgent: req.headers['user-agent'],
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

      return {
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
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  // Назначение менеджера на заявку
  static async assignManager(id, managerId, userId, req) {
    // Проверяем, что менеджер существует и имеет нужную роль
    const manager = await User.findOne({
      where: {
        id: managerId,
        role: { [Op.in]: [User.ROLES.MANAGER, User.ROLES.ADMIN, User.ROLES.SUPER_ADMIN] }
      }
    });

    if (!manager) {
      return { error: 'Менеджер не найден или не имеет нужных прав' };
    }

    // Находим заявку
    const application = await Application.findByPk(id);

    if (!application) {
      return { error: 'Заявка не найдена' };
    }

    // Сохраняем старого менеджера для истории
    const oldManagerId = application.assigned_to;

    // Сохраняем старые значения для аудита
    const oldAssignment = { assigned_to: application.assigned_to };

    // Обновляем заявку
    await application.update({ assigned_to: managerId });

    // Записываем событие в аудит
    await AuditLog.logAction({
      action: AuditLog.ACTIONS.APPLICATION_ASSIGN,
      userId: userId,
      targetEntity: 'application',
      targetId: application.id,
      oldValue: oldAssignment,
      newValue: { assigned_to: managerId },
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
    };
  }

  // Получение доступных переходов статуса
  static async getStatusTransitions(id, userId, userRole) {
    const where = { id };
    if (userRole === User.ROLES.CLIENT) {
      where.user_id = userId;
    } else if (userRole === User.ROLES.MANAGER) {
      where.assigned_to = userId;
    }

    const application = await Application.findOne({ where });

    if (!application) {
      return { error: 'Заявка не найдена' };
    }

    const transitions = Application.getStatusTransitions(application.status);

    return {
      success: true,
      data: {
        current_status: application.status,
        current_status_display: application.statusDisplay,
        available_transitions: transitions.map(status => ({
          value: status,
          label: Application.getStatusDisplay(status) || status
        }))
      }
    };
  }
}

module.exports = ApplicationService;