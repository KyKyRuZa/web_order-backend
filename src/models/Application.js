const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

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

    if (!application.contact_email || !/\S+@\S+\.\S+/.test(application.contact_email)) {
      errors.push('Необходимо указать корректный email');
    }

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
      const StatusHistory = require('./StatusHistory');
      await StatusHistory.create({
        application_id: this.id,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: changedBy,
        comment: options.comment || null,
        ip_address: options.ipAddress || null,
        user_agent: options.userAgent || null
      }, { transaction: options.transaction });
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
    // Контактная информация - минимальный набор
    contact_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: {
          msg: 'Некорректный формат email'
        },
        notEmpty: {
          msg: 'Email контакта обязателен'
        }
      }
    },
    contact_phone: {
      type: DataTypes.STRING(20),
      allowNull: true, // Сделать опциональным
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