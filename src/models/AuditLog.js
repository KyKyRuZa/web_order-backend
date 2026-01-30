const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

class AuditLog extends Model {
  static ACTIONS = Object.freeze({
    // Заявки
    APPLICATION_CREATE: 'application_create',
    APPLICATION_UPDATE: 'application_update',
    APPLICATION_DELETE: 'application_delete',
    APPLICATION_STATUS_CHANGE: 'application_status_change',
    APPLICATION_ASSIGN: 'application_assign',
    
    // Пользователи
    USER_CREATE: 'user_create',
    USER_UPDATE: 'user_update',
    USER_DELETE: 'user_delete',
    USER_ROLE_CHANGE: 'user_role_change',
    USER_DEACTIVATE: 'user_deactivate',
    USER_ACTIVATE: 'user_activate',
    
    // Заметки
    NOTE_CREATE: 'note_create',
    NOTE_UPDATE: 'note_update',
    NOTE_DELETE: 'note_delete',
    NOTE_PIN_TOGGLE: 'note_pin_toggle',
    
    // Файлы
    FILE_UPLOAD: 'file_upload',
    FILE_DELETE: 'file_delete',
    
    // Аутентификация
    LOGIN: 'login',
    LOGOUT: 'logout',
    PASSWORD_CHANGE: 'password_change',
    EMAIL_VERIFY: 'email_verify',
    
    // Системные
    SYSTEM_CONFIG_UPDATE: 'system_config_update',
    PERMISSION_GRANT: 'permission_grant',
    PERMISSION_REVOKE: 'permission_revoke'
  });

  static SEVERITY_LEVELS = Object.freeze({
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  });

  // Получение описания действия
  get actionDescription() {
    const descriptions = {
      [AuditLog.ACTIONS.APPLICATION_CREATE]: 'Создание заявки',
      [AuditLog.ACTIONS.APPLICATION_UPDATE]: 'Обновление заявки',
      [AuditLog.ACTIONS.APPLICATION_DELETE]: 'Удаление заявки',
      [AuditLog.ACTIONS.APPLICATION_STATUS_CHANGE]: 'Изменение статуса заявки',
      [AuditLog.ACTIONS.APPLICATION_ASSIGN]: 'Назначение менеджера на заявку',
      [AuditLog.ACTIONS.USER_CREATE]: 'Создание пользователя',
      [AuditLog.ACTIONS.USER_UPDATE]: 'Обновление пользователя',
      [AuditLog.ACTIONS.USER_DELETE]: 'Удаление пользователя',
      [AuditLog.ACTIONS.USER_ROLE_CHANGE]: 'Изменение роли пользователя',
      [AuditLog.ACTIONS.USER_DEACTIVATE]: 'Деактивация пользователя',
      [AuditLog.ACTIONS.USER_ACTIVATE]: 'Активация пользователя',
      [AuditLog.ACTIONS.NOTE_CREATE]: 'Создание заметки',
      [AuditLog.ACTIONS.NOTE_UPDATE]: 'Обновление заметки',
      [AuditLog.ACTIONS.NOTE_DELETE]: 'Удаление заметки',
      [AuditLog.ACTIONS.NOTE_PIN_TOGGLE]: 'Переключение статуса закрепления заметки',
      [AuditLog.ACTIONS.FILE_UPLOAD]: 'Загрузка файла',
      [AuditLog.ACTIONS.FILE_DELETE]: 'Удаление файла',
      [AuditLog.ACTIONS.LOGIN]: 'Вход в систему',
      [AuditLog.ACTIONS.LOGOUT]: 'Выход из системы',
      [AuditLog.ACTIONS.PASSWORD_CHANGE]: 'Изменение пароля',
      [AuditLog.ACTIONS.EMAIL_VERIFY]: 'Подтверждение email',
      [AuditLog.ACTIONS.SYSTEM_CONFIG_UPDATE]: 'Обновление системной конфигурации',
      [AuditLog.ACTIONS.PERMISSION_GRANT]: 'Выдача разрешений',
      [AuditLog.ACTIONS.PERMISSION_REVOKE]: 'Отзыв разрешений'
    };

    return descriptions[this.action] || this.action;
  }

  // Определение уровня критичности
  get severityLevel() {
    const criticalActions = [
      AuditLog.ACTIONS.USER_DELETE,
      AuditLog.ACTIONS.USER_ROLE_CHANGE,
      AuditLog.ACTIONS.USER_DEACTIVATE,
      AuditLog.ACTIONS.NOTE_DELETE,
      AuditLog.ACTIONS.APPLICATION_DELETE,
      AuditLog.ACTIONS.SYSTEM_CONFIG_UPDATE
    ];

    const highActions = [
      AuditLog.ACTIONS.APPLICATION_STATUS_CHANGE,
      AuditLog.ACTIONS.APPLICATION_ASSIGN,
      AuditLog.ACTIONS.NOTE_UPDATE,
      AuditLog.ACTIONS.PASSWORD_CHANGE
    ];

    if (criticalActions.includes(this.action)) {
      return AuditLog.SEVERITY_LEVELS.CRITICAL;
    } else if (highActions.includes(this.action)) {
      return AuditLog.SEVERITY_LEVELS.HIGH;
    } else {
      return AuditLog.SEVERITY_LEVELS.MEDIUM;
    }
  }

  // Форматирование для отображения
  toDisplayFormat() {
    return {
      id: this.id,
      action: this.action,
      actionDescription: this.actionDescription,
      severity: this.severityLevel,
      userId: this.user_id,
      targetEntity: this.target_entity,
      targetId: this.target_id,
      oldValue: this.old_value,
      newValue: this.new_value,
      ipAddress: this.ip_address,
      userAgent: this.user_agent,
      createdAt: this.created_at,
      metadata: this.metadata
    };
  }

  // Статический метод для создания записи аудита
  static async logAction(params) {
    const { 
      action, 
      userId, 
      targetEntity, 
      targetId, 
      oldValue, 
      newValue, 
      ipAddress, 
      userAgent, 
      metadata,
      transaction 
    } = params;

    return await AuditLog.create({
      action,
      user_id: userId,
      target_entity: targetEntity,
      target_id: targetId,
      old_value: oldValue,
      new_value: newValue,
      ip_address: ipAddress,
      user_agent: userAgent,
      metadata: metadata || {}
    }, { transaction });
  }
}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        isIn: {
          args: [Object.values(AuditLog.ACTIONS)],
          msg: 'Недопустимое действие аудита'
        }
      },
      field: 'action'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true, // Может быть null для системных действий
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id',
      onDelete: 'SET NULL' // При удалении пользователя сохраняем запись аудита
    },
    target_entity: {
      type: DataTypes.STRING(50), // 'application', 'user', 'note', 'file'
      allowNull: false,
      field: 'target_entity'
    },
    target_id: {
      type: DataTypes.UUID,
      allowNull: true, // Может быть null для глобальных действий
      field: 'target_id'
    },
    old_value: {
      type: DataTypes.JSONB, // Предыдущее значение (до изменения)
      allowNull: true,
      field: 'old_value'
    },
    new_value: {
      type: DataTypes.JSONB, // Новое значение (после изменения)
      allowNull: true,
      field: 'new_value'
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
      validate: {
        isNotInvalidIP(value) {
          if (value === null || value === undefined || value === '') {
            return; // Пропускаем валидацию для null/undefined/пустой строки
          }
          // Проверяем, является ли значение валидным IP-адресом
          const net = require('net');
          if (value && !net.isIP(value)) {
            throw new Error('Некорректный IP адрес');
          }
        }
      },
      field: 'ip_address'
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent'
    },
    metadata: {
      type: DataTypes.JSONB, // Дополнительные метаданные
      allowNull: true,
      field: 'metadata'
    }
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    paranoid: false, // Аудит-логи не должны быть удалены
    indexes: [
      {
        fields: ['action']
      },
      {
        fields: ['user_id']
      },
      {
        fields: ['target_entity']
      },
      {
        fields: ['target_id']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['user_id', 'created_at']
      },
      {
        fields: ['target_entity', 'target_id']
      },
      {
        fields: ['action', 'created_at']
      }
    ],
    validate: {
      // Проверка, что old_value и new_value не равны одновременно null для действий обновления
      oldNewValueNotNullForUpdates() {
        if (
          this.action.includes('_update') && 
          !this.old_value && 
          !this.new_value
        ) {
          throw new Error('Для действий обновления должны быть указаны старые или новые значения');
        }
      }
    }
  }
);

module.exports = AuditLog;