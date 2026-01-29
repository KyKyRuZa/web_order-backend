const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

class ApplicationNote extends Model {
  // Типы заметок
  static NOTE_TYPES = Object.freeze({
    INTERNAL: 'internal',
    COMMENT: 'comment',
    SYSTEM: 'system',
    CHANGE_LOG: 'change_log'
  });

  // Валидация содержимого заметки
  static validateContent(content, noteType) {
    const errors = [];

    if (!content || content.trim().length === 0) {
      errors.push('Содержание заметки не может быть пустым');
    }

    if (content.length > 5000) {
      errors.push('Содержание заметки не должно превышать 5000 символов');
    }

    if (noteType === ApplicationNote.NOTE_TYPES.SYSTEM && content.length > 1000) {
      // Системные сообщения должны быть короче
      errors.push('Системные сообщения не должны превышать 1000 символов');
    }

    return errors;
  }

  // Проверка, является ли заметка внутренней
  get isInternal() {
    return this.note_type === ApplicationNote.NOTE_TYPES.INTERNAL;
  }

  // Проверка, является ли заметка комментарием
  get isComment() {
    return this.note_type === ApplicationNote.NOTE_TYPES.COMMENT;
  }

  // Проверка, является ли заметка системной
  get isSystem() {
    return this.note_type === ApplicationNote.NOTE_TYPES.SYSTEM;
  }

  // Проверка, является ли заметка логом изменений
  get isChangeLog() {
    return this.note_type === ApplicationNote.NOTE_TYPES.CHANGE_LOG;
  }

  // Проверка, была ли заметка изменена
  get isModified() {
    return this.updated_at.getTime() > this.created_at.getTime();
  }

  // Форматирование для отображения
  toDisplayFormat() {
    return {
      id: this.id,
      content: this.content,
      noteType: this.note_type,
      isInternal: this.isInternal,
      isComment: this.isComment,
      isSystem: this.isSystem,
      isChangeLog: this.isChangeLog,
      isPinned: this.is_pinned,
      isModified: this.isModified,
      author: this.author ? {
        id: this.author.id,
        fullName: this.author.full_name,
        email: this.author.email
      } : null,
      createdAt: this.created_at,
      updatedAt: this.updated_at
    };
  }

  // Получение краткого описания заметки
  get preview() {
    return this.content.substring(0, 100) + (this.content.length > 100 ? '...' : '');
  }
}

ApplicationNote.init(
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
      onDelete: 'CASCADE' // При удалении заявки удаляются все заметки
    },
    author_id: {
      type: DataTypes.UUID,
      allowNull: true, // Может быть null для системных заметок
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'author_id',
      onDelete: 'SET NULL' // При удалении автора сохраняем заметку
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        len: {
          args: [1, 5000],
          msg: 'Содержание заметки должно быть от 1 до 5000 символов'
        },
        customValidator(value) {
          if (!value || value.trim().length === 0) {
            throw new Error('Содержание заметки не может быть пустым');
          }
        }
      }
    },
    note_type: {
      type: DataTypes.ENUM(
        'internal',
        'comment',
        'system',
        'change_log'
      ),
      defaultValue: 'internal',
      field: 'note_type',
      validate: {
        isIn: {
          args: [Object.keys(ApplicationNote.NOTE_TYPES).map(key => ApplicationNote.NOTE_TYPES[key])],
          msg: 'Недопустимый тип заметки'
        }
      }
    },
    is_pinned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_pinned'
    },
    metadata: {
      type: DataTypes.JSONB, // Дополнительные метаданные
      allowNull: true,
      field: 'metadata'
    }
  },
  {
    sequelize,
    modelName: 'ApplicationNote',
    tableName: 'application_notes',
    timestamps: true,
    paranoid: false, // Не используем мягкое удаление для заметок
    hooks: {
      beforeValidate: (note) => {
        // Валидация содержимого перед сохранением
        const errors = ApplicationNote.validateContent(note.content, note.note_type);
        if (errors.length > 0) {
          throw new Error(errors.join(', '));
        }
      }
    },
    indexes: [
      {
        fields: ['application_id']
      },
      {
        fields: ['author_id']
      },
      {
        fields: ['note_type']
      },
      {
        fields: ['created_at']
      },
      {
        fields: ['is_pinned']
      },
      // Комбинированные индексы для часто используемых запросов
      {
        fields: ['application_id', 'created_at']
      },
      {
        fields: ['application_id', 'note_type']
      },
      {
        fields: ['author_id', 'created_at']
      },
      {
        fields: ['application_id', 'is_pinned']
      }
    ],
    scopes: {
      // Только внутренние заметки
      internal: {
        where: { note_type: ApplicationNote.NOTE_TYPES.INTERNAL }
      },
      // Только комментарии
      comments: {
        where: { note_type: ApplicationNote.NOTE_TYPES.COMMENT }
      },
      // Только системные заметки
      system: {
        where: { note_type: ApplicationNote.NOTE_TYPES.SYSTEM }
      },
      // Только закрепленные заметки
      pinned: {
        where: { is_pinned: true }
      },
      // По типу заметки
      byType: (type) => ({
        where: { note_type: type }
      }),
      // По заявке
      byApplication: (applicationId) => ({
        where: { application_id: applicationId }
      })
    }
  }
);

module.exports = ApplicationNote;