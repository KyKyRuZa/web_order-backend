const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

/**
 * @swagger
 * components:
 *   schemas:
 *     Application:
 *       type: object
 *       required:
 *         - title
 *         - service_type
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Уникальный идентификатор заявки
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID пользователя, создавшего заявку
 *           example: 123e4567-e89b-12d3-a456-426614174001
 *         title:
 *           type: string
 *           description: Название заявки
 *           example: "Создание корпоративного сайта"
 *         description:
 *           type: string
 *           description: Описание заявки
 *           example: "Необходимо создать современный корпоративный сайт с CMS"
 *         service_type:
 *           type: string
 *           enum: [landing_page, corporate_site, ecommerce, web_application, other]
 *           description: Тип услуги
 *           example: corporate_site
 *         contact_full_name:
 *           type: string
 *           description: Контактное имя (автоматически заполняется из профиля пользователя)
 *           example: Иван Иванов
 *         contact_email:
 *           type: string
 *           format: email
 *           description: Контактный email (автоматически заполняется из профиля пользователя)
 *           example: client@example.com
 *         contact_phone:
 *           type: string
 *           description: Контактный телефон (автоматически заполняется из профиля пользователя)
 *           example: +79991234567
 *         company_name:
 *           type: string
 *           description: Название компании клиента (автоматически заполняется из профиля пользователя)
 *           example: ООО "Рога и копыта"
 *         expected_budget:
 *           type: integer
 *           description: Ожидаемый бюджет в рублях
 *           example: 150000
 *         status:
 *           type: string
 *           enum: [draft, submitted, in_review, approved, in_progress, completed, cancelled, rejected]
 *           description: Статус заявки
 *           example: draft
 *         priority:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *           description: Приоритет заявки
 *           example: normal
 *         assigned_to:
 *           type: string
 *           format: uuid
 *           description: ID менеджера, назначенного на заявку
 *           example: 123e4567-e89b-12d3-a456-426614174002
 *         submitted_at:
 *           type: string
 *           format: date-time
 *           description: Дата подачи заявки
 *           example: 2023-01-01T00:00:00.000Z
 *         deadline:
 *           type: string
 *           format: date-time
 *           description: Крайний срок выполнения
 *           example: 2023-02-01T00:00:00.000Z
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Дата создания заявки
 *           example: 2023-01-01T00:00:00.000Z
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Дата последнего обновления
 *           example: 2023-01-01T00:00:00.000Z
 *     CreateApplicationRequest:
 *       type: object
 *       required:
 *         - title
 *         - service_type
 *       properties:
 *         title:
 *           type: string
 *           description: Название заявки
 *           example: "Создание корпоративного сайта"
 *         description:
 *           type: string
 *           description: Описание заявки
 *           example: "Необходимо создать современный корпоративный сайт с CMS"
 *         service_type:
 *           type: string
 *           enum: [landing_page, corporate_site, ecommerce, web_application, other]
 *           description: Тип услуги
 *           example: corporate_site
 *         expected_budget:
 *           type: integer
 *           description: Ожидаемый бюджет в рублях
 *           example: 150000
 *     UpdateApplicationRequest:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Название заявки
 *         description:
 *           type: string
 *           description: Описание заявки
 *         service_type:
 *           type: string
 *           enum: [landing_page, corporate_site, ecommerce, web_application, other]
 *           description: Тип услуги
 *         contact_full_name:
 *           type: string
 *           description: Контактное имя
 *         contact_email:
 *           type: string
 *           format: email
 *           description: Контактный email
 *         contact_phone:
 *           type: string
 *           description: Контактный телефон
 *         company_name:
 *           type: string
 *           description: Название компании клиента
 *         expected_budget:
 *           type: integer
 *           description: Ожидаемый бюджет в рублях
 *         status:
 *           type: string
 *           enum: [draft, submitted, in_review, approved, in_progress, completed, cancelled, rejected]
 *           description: Статус заявки
 *     Pagination:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Общее количество элементов
 *           example: 100
 *         page:
 *           type: integer
 *           description: Номер текущей страницы
 *           example: 1
 *         limit:
 *           type: integer
 *           description: Количество элементов на странице
 *           example: 10
 *         pages:
 *           type: integer
 *           description: Общее количество страниц
 *           example: 10
 *         has_next:
 *           type: boolean
 *           description: Есть ли следующая страница
 *           example: true
 *         has_prev:
 *           type: boolean
 *           description: Есть ли предыдущая страница
 *           example: false
 */

class Application extends Model {
  static STATUSES = Object.freeze({
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    IN_REVIEW: 'in_review',
    APPROVED: 'approved',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    REJECTED: 'rejected'
    // Убрали NEEDS_INFO и ESTIMATED - они усложняют логику
  });

  static SERVICE_TYPES = Object.freeze({
    LANDING: 'landing_page',
    CORPORATE: 'corporate_site',
    ECOMMERCE: 'ecommerce',
    WEB_APP: 'web_application',
    OTHER: 'other'
    // Убрали REDESIGN - можно указать в описании
  });

  // Статический метод для получения отображаемого значения статуса
  static getStatusDisplay(status) {
    const statusMap = {
      [Application.STATUSES.DRAFT]: 'Черновик',
      [Application.STATUSES.SUBMITTED]: 'Отправлено',
      [Application.STATUSES.IN_REVIEW]: 'На рассмотрении',
      [Application.STATUSES.APPROVED]: 'Утверждено',
      [Application.STATUSES.IN_PROGRESS]: 'В работе',
      [Application.STATUSES.COMPLETED]: 'Завершено',
      [Application.STATUSES.CANCELLED]: 'Отменено',
      [Application.STATUSES.REJECTED]: 'Отклонено'
    };

    return statusMap[status] || status;
  }

  // Статический метод для получения отображаемого значения типа услуги
  static getServiceTypeDisplay(serviceType) {
    const serviceMap = {
      [Application.SERVICE_TYPES.LANDING]: 'Лендинг',
      [Application.SERVICE_TYPES.CORPORATE]: 'Корпоративный сайт',
      [Application.SERVICE_TYPES.ECOMMERCE]: 'Интернет-магазин',
      [Application.SERVICE_TYPES.WEB_APP]: 'Веб-приложение',
      [Application.SERVICE_TYPES.OTHER]: 'Другое'
    };

    return serviceMap[serviceType] || serviceType;
  }

  // Проверка доступных статусов для перехода
  static getStatusTransitions(currentStatus) {
    const transitions = {
      [Application.STATUSES.DRAFT]: [
        Application.STATUSES.SUBMITTED,
        Application.STATUSES.CANCELLED
      ],
      [Application.STATUSES.SUBMITTED]: [
        Application.STATUSES.IN_REVIEW,
        Application.STATUSES.CANCELLED,
        Application.STATUSES.REJECTED
      ],
      [Application.STATUSES.IN_REVIEW]: [
        Application.STATUSES.APPROVED,
        Application.STATUSES.REJECTED,
        Application.STATUSES.CANCELLED
      ],
      [Application.STATUSES.APPROVED]: [
        Application.STATUSES.IN_PROGRESS,
        Application.STATUSES.CANCELLED
      ],
      [Application.STATUSES.IN_PROGRESS]: [
        Application.STATUSES.COMPLETED,
        Application.STATUSES.CANCELLED
      ],
      [Application.STATUSES.COMPLETED]: [],
      [Application.STATUSES.CANCELLED]: [],
      [Application.STATUSES.REJECTED]: []
    };

    return transitions[currentStatus] || [];
  }

  // Упрощенная логика проверки редактируемости
  static isEditableStatus(status) {
    return [
      Application.STATUSES.DRAFT,
      Application.STATUSES.SUBMITTED,
      Application.STATUSES.IN_REVIEW
    ].includes(status);
  }

  // Валидация обязательных полей при отправке
  static validateSubmission(application) {
    const errors = [];

    if (!application.title || application.title.trim().length < 5) {
      errors.push('Заголовок должен содержать не менее 5 символов');
    }

    if (!application.description || application.description.trim().length < 10) {
      errors.push('Описание должно содержать не менее 10 символов');
    }

    // Не проверяем контактные данные, так как они берутся из профиля пользователя

    return errors;
  }

  // Автоматическое заполнение submitted_at
  static hooks = {
    beforeValidate: (application) => {
      // Нормализация email
      if (application.contact_email) {
        application.contact_email = application.contact_email.toLowerCase().trim();
      }

      // Валидация при смене статуса на submitted
      if (application.status === Application.STATUSES.SUBMITTED) {
        const validationErrors = Application.validateSubmission(application);
        if (validationErrors.length > 0) {
          throw new Error(`Ошибка валидации при отправке: ${validationErrors.join(', ')}`);
        }
      }
    },
    beforeCreate: (application) => {
      // Убедиться, что контактные данные заполнены из профиля пользователя при создании
      // (это будет обрабатываться в сервисе, но добавим базовую защиту)
    },
    beforeUpdate: (application) => {
      if (
        application.changed('status') &&
        application.status === Application.STATUSES.SUBMITTED &&
        !application.previous('submitted_at')
      ) {
        application.submitted_at = new Date();
      }
    }
  };

  // Вычисляемые свойства
  get timeInStatus() {
    // Время, проведенное в текущем статусе
    if (this.statusHistory && this.statusHistory.length > 0) {
      const currentStatusHistory = this.statusHistory.find(history =>
        history.new_status === this.status &&
        new Date(history.created_at) <= new Date(this.updated_at)
      );
      if (currentStatusHistory) {
        return Date.now() - new Date(currentStatusHistory.created_at).getTime();
      }
    }
    return 0;
  }

  get timeToApproval() {
    // Время от подачи до утверждения (если заявка утверждена)
    if (this.approved_at && this.submitted_at) {
      return new Date(this.approved_at).getTime() - new Date(this.submitted_at).getTime();
    }
    return null;
  }

  get isOverdue() {
    // Проверка, просрочена ли заявка
    if (this.deadline) {
      return new Date(this.deadline) < new Date() && this.status !== Application.STATUSES.COMPLETED;
    }
    return false;
  }

  get daysUntilDeadline() {
    // Количество дней до крайнего срока
    if (this.deadline) {
      const diffTime = new Date(this.deadline).getTime() - new Date().getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return null;
  }

  // Упрощенный геттер для отображения
  get displayInfo() {
    return {
      title: this.title,
      status: Application.getStatusDisplay(this.status),
      serviceType: Application.getServiceTypeDisplay(this.service_type),
      isActive: this.isActive,
      isEditable: this.isEditable,
      isOverdue: this.isOverdue,
      daysUntilDeadline: this.daysUntilDeadline
    };
  }

  // Проверка, можно ли редактировать заявку
  get isEditable() {
    return Application.isEditableStatus(this.status);
  }

  // Проверка, является ли заявка активной
  get isActive() {
    return ![
      Application.STATUSES.COMPLETED,
      Application.STATUSES.CANCELLED,
      Application.STATUSES.REJECTED
    ].includes(this.status);
  }

  // Проверка возможности смены статуса
  canChangeStatus(newStatus) {
    return Application.getStatusTransitions(this.status).includes(newStatus);
  }

  // Геттер для человекочитаемого статуса
  get statusDisplay() {
    return Application.getStatusDisplay(this.status);
  }

  // Геттер для типа услуги
  get serviceTypeDisplay() {
    return Application.getServiceTypeDisplay(this.service_type);
  }

  // Изменение статуса заявки с записью в историю
  async changeStatus(newStatus, changedBy, options = {}) {
    if (!this.canChangeStatus(newStatus)) {
      const availableTransitions = Application.getStatusTransitions(this.status);
      throw new Error(`Невозможно изменить статус с "${this.statusDisplay}" на "${Application.getStatusDisplay(newStatus)}". Доступные переходы: ${availableTransitions.map(s => Application.getStatusDisplay(s)).join(', ')}`);
    }

    const oldStatus = this.status;
    this.status = newStatus;

    // Обновляем дату подачи, если статус меняется на "submitted"
    if (newStatus === Application.STATUSES.SUBMITTED && !this.submitted_at) {
      this.submitted_at = new Date();
    }

    // Обновляем дату утверждения, если статус меняется на "approved"
    if (newStatus === Application.STATUSES.APPROVED && !this.approved_at) {
      this.approved_at = new Date();
    }

    // Обновляем дату завершения, если статус меняется на "completed"
    if (newStatus === Application.STATUSES.COMPLETED && !this.completed_at) {
      this.completed_at = new Date();
    }

    // Сохраняем заявку
    await this.save(options);

    // Создаем запись в истории статусов
    if (changedBy) {
      try {
        // Используем динамический импорт для избежания циклических зависимостей
        const StatusHistoryModule = require('./StatusHistory');
        const StatusHistory = StatusHistoryModule.default || StatusHistoryModule;
        await StatusHistory.create({
          application_id: this.id,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by: changedBy,
          comment: options.comment || null,
          ip_address: options.ipAddress || null,
          user_agent: options.userAgent || null
        }, { transaction: options.transaction });
      } catch (error) {
        console.error('Error creating status history:', error);
        // Не прерываем операцию изменения статуса, даже если не удалось создать запись в истории
      }
    }

    return this;
  }
}

Application.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE' // При удалении пользователя удаляются его заявки
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: {
          args: [5, 200],
          msg: 'Название должно содержать от 5 до 200 символов'
        },
        notEmpty: {
          msg: 'Название не может быть пустым'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 2000],
          msg: 'Описание не должно превышать 2000 символов'
        }
      }
    },
    service_type: {
      type: DataTypes.ENUM(Object.values(Application.SERVICE_TYPES)),
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values(Application.SERVICE_TYPES)],
          msg: 'Недопустимый тип услуги'
        }
      }
    },
    // Контактная информация - будет заполняться из профиля пользователя
    contact_full_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: 'Контактное имя не должно превышать 100 символов'
        }
      }
    },
    contact_email: {
      type: DataTypes.STRING(255),
      allowNull: true, // Сделать опциональным, так как будет браться из профиля
      validate: {
        isEmail: {
          msg: 'Некорректный формат email'
        }
      }
    },
    contact_phone: {
      type: DataTypes.STRING(20),
      allowNull: true, // Сделать опциональным, так как будет браться из профиля
      validate: {
        is: {
          args: [/^[\+]?[1-9]\d{1,14}$/],
          msg: 'Некорректный формат номера телефона'
        }
      }
    },
    // Опциональные поля
    company_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: 'Название компании не должно превышать 100 символов'
        }
      }
    },
    expected_budget: {
      type: DataTypes.INTEGER, // Число вместо ENUM
      allowNull: true,
      validate: {
        min: 0,
        max: 10000000 // Максимальный бюджет 10 млн
      }
    },
    status: {
      type: DataTypes.ENUM(Object.values(Application.STATUSES)),
      defaultValue: Application.STATUSES.DRAFT,
      validate: {
        isIn: {
          args: [Object.values(Application.STATUSES)],
          msg: 'Недопустимый статус заявки'
        }
      }
    },
    // Приоритет заявки
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal',
      validate: {
        isIn: {
          args: [['low', 'normal', 'high', 'urgent']],
          msg: 'Недопустимый приоритет заявки'
        }
      }
    },
    // Дополнительные поля для менеджеров (заполняются позже)
    assigned_to: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL' // При удалении менеджера сбрасываем назначение
    },
    // Даты для аналитики
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Дополнительные даты для аналитики
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'Application',
    tableName: 'applications',
    timestamps: true,
    paranoid: true, // Поддержка мягкого удаления
    hooks: Application.hooks,
    indexes: [
      { fields: ['user_id', 'status'] },
      { fields: ['assigned_to', 'status'] },
      { fields: ['status', 'created_at'] },
      { fields: ['submitted_at'] },
      { fields: ['deadline'] },
      { fields: ['user_id'] },
      { fields: ['assigned_to'] },
      { fields: ['created_at'] }
    ],
    scopes: {
      // Активные заявки
      active: {
        where: {
          status: {
            [require('sequelize').Op.notIn]: [
              Application.STATUSES.COMPLETED,
              Application.STATUSES.CANCELLED,
              Application.STATUSES.REJECTED
            ]
          }
        }
      },
      // Просроченные заявки
      overdue: {
        where: {
          deadline: {
            [require('sequelize').Op.lt]: new Date()
          },
          status: {
            [require('sequelize').Op.notIn]: [Application.STATUSES.COMPLETED]
          }
        }
      },
      // По типу услуги
      byServiceType: (serviceType) => ({
        where: { service_type: serviceType }
      }),
      // По статусу
      byStatus: (status) => ({
        where: { status }
      }),
      // Назначенные менеджеру
      assignedTo: (userId) => ({
        where: { assigned_to: userId }
      })
    }
  }
);

module.exports = Application;