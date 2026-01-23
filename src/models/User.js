const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');
const bcrypt = require('bcryptjs');

class User extends Model {
  async validatePassword(password) {
    return await bcrypt.compare(password, this.password_hash);
  }

  toJSON() {
    const values = Object.assign({}, this.get());
    delete values.password_hash;
    delete values.reset_password_token;
    delete values.reset_password_expires;
    delete values.email_verification_token;
    return values;
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
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
      beforeCreate: async (user) => {
        if (user.password_hash) {
          const salt = await bcrypt.genSalt(10);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password_hash')) {
          const salt = await bcrypt.genSalt(10);
          user.password_hash = await bcrypt.hash(user.password_hash, salt);
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