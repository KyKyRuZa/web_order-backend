const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

class Application extends Model {
  static STATUSES = Object.freeze({
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    IN_REVIEW: 'in_review',
    NEEDS_INFO: 'needs_info',
    ESTIMATED: 'estimated',
    APPROVED: 'approved',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  });

  static SERVICE_TYPES = Object.freeze({
    LANDING: 'landing_page',
    CORPORATE: 'corporate_site',
    ECOMMERCE: 'ecommerce',
    WEB_APP: 'web_application',
    REDESIGN: 'redesign',
    OTHER: 'other'
  });

  static BUDGET_RANGES = Object.freeze({
    UNDER_50K: 'under_50k',
    FROM_50K_TO_100K: '50k_100k',
    FROM_100K_TO_300K: '100k_300k',
    FROM_300K_TO_500K: '300k_500k',
    NEGOTIABLE: 'negotiable'
  });

  static PRIORITIES = Object.freeze({
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
  });

  // Статический метод для получения отображаемого значения статуса
  static getStatusDisplay(status) {
    const statusMap = {
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

    return statusMap[status] || status;
  }

  // Статический метод для получения отображаемого значения типа услуги
  static getServiceTypeDisplay(serviceType) {
    const serviceMap = {
      [Application.SERVICE_TYPES.LANDING]: 'Лендинг',
      [Application.SERVICE_TYPES.CORPORATE]: 'Корпоративный сайт',
      [Application.SERVICE_TYPES.ECOMMERCE]: 'Интернет-магазин',
      [Application.SERVICE_TYPES.WEB_APP]: 'Веб-приложение',
      [Application.SERVICE_TYPES.REDESIGN]: 'Редизайн',
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
        Application.STATUSES.CANCELLED
      ],
      [Application.STATUSES.IN_REVIEW]: [
        Application.STATUSES.NEEDS_INFO,
        Application.STATUSES.ESTIMATED,
        Application.STATUSES.CANCELLED
      ],
      [Application.STATUSES.NEEDS_INFO]: [
        Application.STATUSES.IN_REVIEW
      ],
      [Application.STATUSES.ESTIMATED]: [
        Application.STATUSES.APPROVED,
        Application.STATUSES.NEEDS_INFO
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
      [Application.STATUSES.CANCELLED]: []
    };

    return transitions[currentStatus] || [];
  }

  // Проверка возможности смены статуса
  canChangeStatus(newStatus) {
    return Application.getStatusTransitions(this.status).includes(newStatus);
  }

  // Геттер для человекочитаемого статуса
  get statusDisplay() {
    const statusMap = {
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

    return statusMap[this.status] || this.status;
  }

  // Геттер для типа услуги
  get serviceTypeDisplay() {
    const serviceMap = {
      [Application.SERVICE_TYPES.LANDING]: 'Лендинг',
      [Application.SERVICE_TYPES.CORPORATE]: 'Корпоративный сайт',
      [Application.SERVICE_TYPES.ECOMMERCE]: 'Интернет-магазин',
      [Application.SERVICE_TYPES.WEB_APP]: 'Веб-приложение',
      [Application.SERVICE_TYPES.REDESIGN]: 'Редизайн',
      [Application.SERVICE_TYPES.OTHER]: 'Другое'
    };

    return serviceMap[this.service_type] || this.service_type;
  }

  // Проверка, является ли заявка активной
  get isActive() {
    return ![
      Application.STATUSES.COMPLETED,
      Application.STATUSES.CANCELLED
    ].includes(this.status);
  }

  // Проверка, можно ли редактировать заявку
  get isEditable() {
    return [
      Application.STATUSES.DRAFT,
      Application.STATUSES.NEEDS_INFO
    ].includes(this.status);
  }

  // Сброс заявки в черновик (если нужно больше информации)
  async resetToDraft(reason) {
    if (!this.isEditable) {
      throw new Error('Невозможно сбросить статус заявки');
    }

    this.status = Application.STATUSES.DRAFT;
    if (reason && this.internal_notes) {
      this.internal_notes += `\n${new Date().toISOString()}: ${reason}`;
    }

    return await this.save();
  }

  // Изменение статуса заявки с записью в историю
  async changeStatus(newStatus, changedBy, options = {}) {
    if (!this.canChangeStatus(newStatus)) {
      throw new Error(`Невозможно изменить статус с "${this.statusDisplay}" на "${newStatus}"`);
    }

    const oldStatus = this.status;
    this.status = newStatus;

    // Сохраняем заявку
    await this.save(options);

    // Создаем запись в истории статусов
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
      field: 'user_id'
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: {
          args: [5, 200],
          msg: 'Название должно содержать от 5 до 200 символов'
        }
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    service_type: {
      type: DataTypes.ENUM(
        'landing_page',
        'corporate_site',
        'ecommerce',
        'web_application',
        'redesign',
        'other'
      ),
      allowNull: false,
      field: 'service_type'
    },
    contact_full_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'contact_full_name'
    },
    contact_email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        isEmail: true
      },
      field: 'contact_email'
    },
    contact_phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        is: /^[\+]?[1-9]\d{1,14}$/
      },
      field: 'contact_phone'
    },
    company_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'company_name'
    },
    budget_range: {
      type: DataTypes.ENUM(
        'under_50k',
        '50k_100k',
        '100k_300k',
        '300k_500k',
        'negotiable'
      ),
      allowNull: true,
      field: 'budget_range'
    },
    status: {
      type: DataTypes.ENUM(
        'draft',
        'submitted',
        'in_review',
        'needs_info',
        'estimated',
        'approved',
        'in_progress',
        'completed',
        'cancelled'
      ),
      defaultValue: 'draft'
    },
    internal_notes: {
      type: DataTypes.TEXT,
      field: 'internal_notes'
    },
    priority: {
      type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
      defaultValue: 'normal'
    },
    assigned_to: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'assigned_to'
    },
    submitted_at: {
      type: DataTypes.DATE,
      field: 'submitted_at'
    }
  },
  {
    sequelize,
    modelName: 'Application',
    tableName: 'applications',
    timestamps: true,
    paranoid: true,
    hooks: {
      beforeUpdate: (application) => {
        if (application.changed('status') && application.status === 'submitted') {
          application.submitted_at = new Date();
        }
      }
    },
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['service_type']
      },
      {
        fields: ['assigned_to']
      },
      {
        fields: ['created_at']
      },
      // Комбинированные индексы для часто используемых запросов
      {
        fields: ['user_id', 'status']
      },
      {
        fields: ['assigned_to', 'status']
      },
      {
        fields: ['user_id', 'created_at']
      },
      {
        fields: ['status', 'created_at']
      }
    ]
  }
);

module.exports = Application;