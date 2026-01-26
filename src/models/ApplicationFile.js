const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

class ApplicationFile extends Model {
  static FILE_CATEGORIES = Object.freeze({
    TECHNICAL_SPEC: 'technical_spec',
    DESIGN_REFERENCE: 'design_reference',
    CONTENT: 'content',
    OTHER: 'other'
  });

  // Валидация размера файла (в байтах)
  static MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // Разрешенные MIME-типы
  static ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ];

  // Проверка типа файла
  get isImage() {
    return this.mime_type.startsWith('image/');
  }

  get isDocument() {
    return [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ].includes(this.mime_type);
  }

  // Форматирование размера файла
  get sizeFormatted() {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = this.size;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }
}

ApplicationFile.init(
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
    uploaded_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'uploaded_by'
    },
    filename: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    original_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'original_name'
    },
    mime_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'mime_type',
      validate: {
        isIn: {
          args: [ApplicationFile.ALLOWED_MIME_TYPES],
          msg: 'Неподдерживаемый тип файла'
        }
      }
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: ApplicationFile.MAX_FILE_SIZE
      }
    },
    storage_path: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'storage_path'
    },
    file_category: {
      type: DataTypes.ENUM(
        'technical_spec',
        'design_reference',
        'content',
        'other'
      ),
      defaultValue: 'other',
      field: 'file_category'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: 'ApplicationFile',
    tableName: 'application_files',
    timestamps: true,
    createdAt: 'uploaded_at',
    updatedAt: false,
    paranoid: false,
    indexes: [
      {
        fields: ['application_id']
      },
      {
        fields: ['uploaded_by']
      },
      {
        fields: ['uploaded_at']
      },
      {
        fields: ['file_category']
      }
    ]
  }
);

module.exports = ApplicationFile;