const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

class Notification extends Model {
  static TYPES = Object.freeze({
    STATUS_CHANGED: 'status_changed',
    NOTE_ADDED: 'note_added',
    APPLICATION_ASSIGNED: 'application_assigned',
    APPLICATION_SUBMITTED: 'application_submitted',
    APPLICATION_APPROVED: 'application_approved',
    APPLICATION_COMPLETED: 'application_completed'
  });

  static STATUSES = Object.freeze({
    UNREAD: 'unread',
    READ: 'read'
  });

  // Геттер для отображения уведомления
  get displayInfo() {
    const typeMap = {
      [Notification.TYPES.STATUS_CHANGED]: `Статус заявки изменен на "${this.metadata?.new_status_display || this.metadata?.new_status}"`,
      [Notification.TYPES.NOTE_ADDED]: `Добавлена заметка к заявке`,
      [Notification.TYPES.APPLICATION_ASSIGNED]: `Вам назначена заявка`,
      [Notification.TYPES.APPLICATION_SUBMITTED]: `Заявка отправлена на рассмотрение`,
      [Notification.TYPES.APPLICATION_APPROVED]: `Заявка утверждена`,
      [Notification.TYPES.APPLICATION_COMPLETED]: `Заявка завершена`
    };

    return {
      id: this.id,
      type: this.type,
      title: typeMap[this.type] || 'Новое уведомление',
      message: this.message,
      is_read: this.is_read,
      created_at: this.created_at,
      metadata: this.metadata
    };
  }
}

Notification.init(
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
      onDelete: 'CASCADE',
      field: 'user_id'
    },
    type: {
      type: DataTypes.ENUM(...Object.values(Notification.TYPES)),
      allowNull: false,
      field: 'type'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'message'
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_read'
    },
    metadata: {
      type: DataTypes.JSONB, // Дополнительные данные для уведомления
      allowNull: true,
      field: 'metadata'
    }
  },
  {
    sequelize,
    modelName: 'Notification',
    tableName: 'notifications',
    timestamps: true,
    paranoid: true, // Мягкое удаление
    indexes: [
      {
        fields: ['user_id', 'is_read']
      },
      {
        fields: ['user_id', 'created_at']
      },
      {
        fields: ['type']
      }
    ],
    scopes: {
      unread: {
        where: { is_read: false }
      },
      read: {
        where: { is_read: true }
      },
      byType: (type) => ({
        where: { type }
      }),
      byUser: (userId) => ({
        where: { user_id: userId }
      })
    }
  }
);

module.exports = Notification;