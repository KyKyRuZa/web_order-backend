const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

class Application extends Model {
  static STATUSES = {
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    IN_REVIEW: 'in_review',
    NEEDS_INFO: 'needs_info',
    ESTIMATED: 'estimated',
    APPROVED: 'approved',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  };

  static SERVICE_TYPES = {
    LANDING: 'landing_page',
    CORPORATE: 'corporate_site',
    ECOMMERCE: 'ecommerce',
    WEB_APP: 'web_application',
    REDESIGN: 'redesign',
    OTHER: 'other'
  };
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
      }
    ]
  }
);

module.exports = Application;