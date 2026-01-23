const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

class ApplicationFile extends Model {}

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
      field: 'mime_type'
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
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
      }
    ]
  }
);

module.exports = ApplicationFile;