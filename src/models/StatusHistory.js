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

  // Форматирование для отображения
  toDisplayFormat() {
    return {
      id: this.id,
      oldStatus: this.old_status,
      newStatus: this.new_status,
      changeSummary: this.changeSummary,
      comment: this.comment,
      changedAt: this.createdAt,
      ipAddress: this.ip_address,
      userAgent: this.user_agent
    };
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
      field: 'application_id'
    },
    old_status: {
      type: DataTypes.STRING(50)
    },
    new_status: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    changed_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'changed_by'
    },
    comment: {
      type: DataTypes.TEXT
    },
    ip_address: {
      type: DataTypes.STRING(45)
    },
    user_agent: {
      type: DataTypes.TEXT
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
      }
    ]
  }
);

module.exports = StatusHistory;