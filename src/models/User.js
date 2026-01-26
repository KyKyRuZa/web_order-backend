const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const bcrypt = require('bcryptjs');

class User extends Model {
  static ROLES = Object.freeze({
    CLIENT: 'client',
    MANAGER: 'manager',
    ADMIN: 'admin'
  });

  async validatePassword(password) {
    return await bcrypt.compare(password, this.password_hash);
  }

  toJSON() {
    const values = Object.assign({}, this.get());
    const sensitiveFields = [
      'password_hash',
      'reset_password_token',
      'reset_password_expires',
      'email_verification_token'
    ];
    
    sensitiveFields.forEach(field => delete values[field]);
    return values;
  }

  get isManager() {
    return this.role === User.ROLES.MANAGER || this.role === User.ROLES.ADMIN;
  }

  get isAdmin() {
    return this.role === User.ROLES.ADMIN;
  }

  async updateLastLogin() {
    this.last_login_at = new Date();
    return await this.save();
  }

  get emailVerified() {
    return this.is_email_verified;
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: {
        name: 'users_email_unique',
        msg: 'Email уже используется'
      },
      validate: {
        isEmail: {
          msg: 'Некорректный формат email'
        },
        notEmpty: {
          msg: 'Email обязателен'
        }
      },
      set(value) {
        this.setDataValue('email', value.toLowerCase().trim());
      }
    },
    password: {
      type: DataTypes.VIRTUAL,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Пароль обязателен'
        },
        len: {
          args: [6, 100],
          msg: 'Пароль должен содержать от 6 до 100 символов'
        }
      }
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,  
      field: 'password_hash'
    },
    full_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: {
          args: [2, 100],
          msg: 'ФИО должно содержать от 2 до 100 символов'
        }
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: /^[\+]?[1-9]\d{1,14}$/,
          msg: 'Некорректный формат номера телефона'
        }
      }
    },
    company_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    is_email_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_email_verified'
    },
    email_verification_token: {
      type: DataTypes.STRING(100),
      field: 'email_verification_token'
    },
    reset_password_token: {
      type: DataTypes.STRING(100),
      field: 'reset_password_token'
    },
    reset_password_expires: {
      type: DataTypes.DATE,
      field: 'reset_password_expires'
    },
    role: {
      type: DataTypes.ENUM('client', 'manager', 'admin'),
      defaultValue: 'client'
    },
    last_login_at: {
      type: DataTypes.DATE,
      field: 'last_login_at'
    }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    paranoid: true,
    hooks: {
      // ВАЖНО: Используем beforeValidate вместо beforeCreate/beforeSave
      beforeValidate: async (user) => {
        console.log('🔄 beforeValidate hook для:', user.email);
        console.log('Пароль:', user.password);
        
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password_hash = await bcrypt.hash(user.password, salt);
          console.log('✅ Password_hash создан');
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password') && user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password_hash = await bcrypt.hash(user.password, salt);
        }
      }
    },
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['role']
      },
      {
        fields: ['created_at']
      }
    ],
  }
);

module.exports = User;