const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const bcrypt = require('bcryptjs');

class User extends Model {
  static ROLES = Object.freeze({
    CLIENT: 'client',
    MANAGER: 'manager',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
  });

  // Валидация пароля
  static validatePasswordStrength(password) {
    const errors = [];

    if (!password) {
      errors.push('Пароль обязателен');
      return errors;
    }

    if (password.length < 8) {
      errors.push('Пароль должен содержать не менее 8 символов');
    }

    if (!/(?=.*[a-z])/.test(password)) {
      errors.push('Пароль должен содержать хотя бы одну строчную букву');
    }

    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push('Пароль должен содержать хотя бы одну заглавную букву');
    }

    if (!/(?=.*[0-9])/.test(password)) {
      errors.push('Пароль должен содержать хотя бы одну цифру');
    }

    if (!/(?=.*[!@#$%^&*])/.test(password)) {
      errors.push('Пароль должен содержать хотя бы один специальный символ (!@#$%^&*)');
    }

    return errors;
  }

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
    return [
      User.ROLES.MANAGER,
      User.ROLES.ADMIN,
      User.ROLES.SUPER_ADMIN
    ].includes(this.role);
  }

  get isAdmin() {
    return this.role === User.ROLES.ADMIN || this.role === User.ROLES.SUPER_ADMIN;
  }

  get isSuperAdmin() {
    return this.role === User.ROLES.SUPER_ADMIN;
  }

  async updateLastLogin() {
    this.last_login_at = new Date();
    return await this.save();
  }

  get emailVerified() {
    return this.is_email_verified;
  }

  // Проверка, является ли пользователь активным
  get isActive() {
    // В простой реализации - все неудаленные пользователи активны
    // Если добавить поле is_active, то можно будет проверять его
    return !this.deletedAt;
  }

  // Получение количества заявок пользователя
  async getApplicationsCount() {
    const Application = require('./Application');
    return await Application.count({ where: { user_id: this.id } });
  }

  // Получение количества назначенных заявок (для менеджеров)
  async getAssignedApplicationsCount() {
    const Application = require('./Application');
    return await Application.count({ where: { assigned_to: this.id } });
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
        },
        customValidator(value) {
          if (!value || value.trim().length === 0) {
            throw new Error('Email обязателен');
          }
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
          args: [8, 100], // Увеличили минимальную длину до 8
          msg: 'Пароль должен содержать от 8 до 100 символов'
        },
        strongPassword(value) {
          if (!value) return;

          if (value.length < 8) {
            throw new Error('Пароль должен содержать не менее 8 символов');
          }

          if (!/(?=.*[a-z])/.test(value)) {
            throw new Error('Пароль должен содержать хотя бы одну строчную букву');
          }

          if (!/(?=.*[A-Z])/.test(value)) {
            throw new Error('Пароль должен содержать хотя бы одну заглавную букву');
          }

          if (!/(?=.*[0-9])/.test(value)) {
            throw new Error('Пароль должен содержать хотя бы одну цифру');
          }

          if (!/(?=.*[!@#$%^&*])/.test(value)) {
            throw new Error('Пароль должен содержать хотя бы один специальный символ (!@#$%^&*)');
          }
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
        },
        notEmpty: {
          msg: 'ФИО обязательно'
        }
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: [/^[\+]?[1-9]\d{1,14}$/],
          msg: 'Некорректный формат номера телефона'
        }
      }
    },
    company_name: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        len: {
          args: [0, 100],
          msg: 'Название компании не должно превышать 100 символов'
        }
      }
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
      defaultValue: 'client',
      validate: {
        isIn: {
          args: [['client', 'manager', 'admin']],
          msg: 'Недопустимая роль пользователя'
        }
      }
    },
    last_login_at: {
      type: DataTypes.DATE,
      field: 'last_login_at'
    },
    // Добавляем поле для отслеживания активности
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    paranoid: true,
    hooks: {
      beforeValidate: async (user) => {
        // Валидация пароля при создании или изменении
        if (user.password) {
          const passwordErrors = User.validatePasswordStrength(user.password);
          if (passwordErrors.length > 0) {
            throw new Error(`Ошибка валидации пароля: ${passwordErrors.join(', ')}`);
          }

          const salt = await bcrypt.genSalt(10);
          user.password_hash = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password') && user.password) {
          const passwordErrors = User.validatePasswordStrength(user.password);
          if (passwordErrors.length > 0) {
            throw new Error(`Ошибка валидации пароля: ${passwordErrors.join(', ')}`);
          }

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
      },
      {
        fields: ['is_active']
      },
      {
        fields: ['last_login_at']
      }
    ],
    scopes: {
      // Активные пользователи
      active: {
        where: { is_active: true }
      },
      // Только клиенты
      clients: {
        where: { role: 'client' }
      },
      // Только менеджеры
      managers: {
        where: {
          role: {
            [require('sequelize').Op.in]: [
              'manager',
              'admin',
              'super_admin'
            ]
          }
        }
      },
      // Только администраторы
      admins: {
        where: {
          role: {
            [require('sequelize').Op.in]: ['admin', 'super_admin']
          }
        }
      },
      // Только суперадминистраторы
      superAdmins: {
        where: { role: 'super_admin' }
      },
      // По роли
      byRole: (role) => ({
        where: { role }
      })
    }
  }
);

module.exports = User;