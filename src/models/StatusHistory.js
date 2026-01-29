const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

class StatusHistory extends Model {
  // Метод для получения истории в удобном формате
  get changeSummary() {
    return `${this.old_status || 'Нет'} → ${this.new_status}`;
  }

  // Геттер для времени изменения
  get changeTime() {
    return this.createdAt;
  }

  // Получение продолжительности статуса (если это последний статус)
  get durationInStatus() {
    if (this.application && this.application.status === this.new_status) {
      // Если это текущий статус заявки, возвращаем время с момента изменения
      return Date.now() - this.created_at.getTime();
    }
    // Если это не текущий статус, можно вычислить длительность до следующего изменения
    if (this.application && this.application.statusHistory) {
      const nextStatusChange = this.application.statusHistory.find(history =>
        history.created_at > this.created_at
      );
      if (nextStatusChange) {
        return nextStatusChange.created_at.getTime() - this.created_at.getTime();
      }
    }
    return 0;
  }

  // Форматирование продолжительности в читаемый вид
  get durationFormatted() {
    const durationMs = this.durationInStatus;
    if (durationMs === 0) return 'N/A';

    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} дн. ${hours % 24} ч.`;
    } else if (hours > 0) {
      return `${hours} ч. ${minutes % 60} мин.`;
    } else if (minutes > 0) {
      return `${minutes} мин. ${seconds % 60} сек.`;
    } else {
      return `${seconds} сек.`;
    }
  }

  // Проверка, был ли статус изменен пользователем
  get isUserInitiated() {
    return !this.comment || !this.comment.includes('[Система]');
  }

  // Форматирование для отображения
  toDisplayFormat() {
    return {
      id: this.id,
      oldStatus: this.old_status,
      newStatus: this.new_status,
      changeSummary: this.changeSummary,
      comment: this.comment,
      changedAt: this.createdAt,
      durationInStatus: this.durationInStatus,
      durationFormatted: this.durationFormatted,
      isUserInitiated: this.isUserInitiated,
      ipAddress: this.ip_address,
      userAgent: this.user_agent
    };
  }

  // Статический метод для создания записи истории статуса
  static async createStatusChange(params) {
    const { applicationId, oldStatus, newStatus, changedBy, comment, ipAddress, userAgent, transaction } = params;

    return await StatusHistory.create({
      application_id: applicationId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      comment: comment || null,
      ip_address: ipAddress || null,
      user_agent: userAgent || null
    }, { transaction });
  }

  // Статический метод для получения полной истории статусов для заявки
  static async getApplicationStatusHistory(applicationId) {
    return await StatusHistory.findAll({
      where: { application_id: applicationId },
      include: [{
        association: 'changer',
        attributes: ['id', 'full_name', 'email']
      }],
      order: [['created_at', 'ASC']]
    });
  }
}

StatusHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    application_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'applications',
        key: 'id'
      },
      field: 'application_id',
      onDelete: 'CASCADE' // При удалении заявки удаляется и история
    },
    old_status: {
      type: DataTypes.STRING(50),
      allowNull: true, // Может быть null для первоначального статуса
      validate: {
        isIn: {
          args: [['draft', 'submitted', 'in_review', 'approved', 'in_progress', 'completed', 'cancelled', 'rejected']],
          msg: 'Недопустимый старый статус'
        }
      }
    },
    new_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: {
          args: [['draft', 'submitted', 'in_review', 'approved', 'in_progress', 'completed', 'cancelled', 'rejected']],
          msg: 'Недопустимый новый статус'
        }
      }
    },
    changed_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'changed_by',
      onDelete: 'CASCADE' // При удалении пользователя удаляются его записи
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      validate: {
        isIP: {
          args: [4],
          msg: 'Некорректный IPv4 адрес'
        }
      }
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'StatusHistory',
    tableName: 'status_history',
    timestamps: true,
    paranoid: false,
    indexes: [
      {
        fields: ['application_id']
      },
      {
        fields: ['changed_by']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['new_status']
      },
      {
        fields: ['application_id', 'created_at'] // Для получения истории по заявке
      },
      {
        fields: ['changed_by', 'created_at'] // Для получения истории по пользователю
      }
    ],
    validate: {
      // Проверка, что старый и новый статусы различаются
      oldNewStatusDifferent() {
        if (this.old_status && this.old_status === this.new_status) {
          throw new Error('Старый и новый статусы не могут совпадать');
        }
      }
    },
    scopes: {
      // По заявке
      byApplication: (applicationId) => ({
        where: { application_id: applicationId }
      }),
      // По пользователю
      byUser: (userId) => ({
        where: { changed_by: userId }
      }),
      // За период
      inPeriod: (startDate, endDate) => ({
        where: {
          created_at: {
            [require('sequelize').Op.between]: [startDate, endDate]
          }
        }
      })
    }
  }
);

module.exports = StatusHistory;