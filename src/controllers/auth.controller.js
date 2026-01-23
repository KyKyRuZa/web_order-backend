const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('../models');
const JWTService = require('../services/jwt.service');
const EmailService = require('../services/email.service');
const logger = require('../config/logger');

class AuthController {
    static async register(req, res) {
    try {
        const { email, password, fullName, phone, companyName } = req.body;

        // Проверяем, существует ли пользователь
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
        return res.status(400).json({
            success: false,
            message: 'Пользователь с таким email уже существует'
        });
        }

        // Создаем токен для верификации
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');

        // В режиме разработки сразу подтверждаем email
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        // Создаем пользователя
        const user = await User.create({
        email,
        password_hash: password,
        full_name: fullName,
        phone,
        company_name: companyName,
        email_verification_token: isDevelopment ? null : emailVerificationToken,
        is_email_verified: isDevelopment, // В разработке сразу подтвержден
        role: 'client'
        });

        // Отправляем email для верификации только в production
        if (!isDevelopment) {
        await EmailService.sendVerificationEmail(email, emailVerificationToken);
        }

        // Отправляем приветственное письмо
        await EmailService.sendWelcomeEmail(email, fullName);

        // Создаем JWT токен
        const accessToken = JWTService.generateAccessToken(user);
        const refreshToken = JWTService.generateRefreshToken(user);

        // Убираем чувствительные данные
        const userResponse = user.toJSON();

        const message = isDevelopment 
        ? 'Регистрация успешна. Email автоматически подтвержден (режим разработки).'
        : 'Регистрация успешна. Проверьте email для подтверждения.';

        res.status(201).json({
        success: true,
        message,
        data: {
            user: userResponse,
            tokens: {
            accessToken,
            refreshToken
            }
        }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
        success: false,
        message: 'Ошибка при регистрации',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
    }

  static async login(req, res) {
    try {
      const { email, password } = req.body;

      // Находим пользователя с ВКЛЮЧЕНИЕМ password_hash
      const user = await User.findOne({ 
        where: { email },
        attributes: { include: ['password_hash'] } // Явно включаем password_hash
      });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Неверный email или пароль'
        });
      }

      console.log('User found for login:', {
        id: user.id,
        email: user.email,
        hasPasswordHash: !!user.password_hash
      });

      // Проверяем пароль
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Неверный email или пароль'
        });
      }

      // Проверяем, подтвержден ли email
      if (!user.is_email_verified) {
        return res.status(403).json({
          success: false,
          message: 'Email не подтвержден. Проверьте вашу почту.'
        });
      }

      // Проверяем, активен ли пользователь
      if (user.deleted_at) {
        return res.status(403).json({
          success: false,
          message: 'Аккаунт деактивирован'
        });
      }

      // Обновляем время последнего входа
      user.last_login_at = new Date();
      await user.save();

      // Создаем токены
      const accessToken = JWTService.generateAccessToken(user);
      const refreshToken = JWTService.generateRefreshToken(user);

      // Убираем чувствительные данные для ответа
      const userResponse = user.toJSON();

      res.json({
        success: true,
        message: 'Вход выполнен успешно',
        data: {
          user: userResponse,
          tokens: {
            accessToken,
            refreshToken
          }
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при входе',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }


  static async logout(req, res) {
    try {
      // В реальном приложении здесь можно добавить токен в blacklist
      res.json({
        success: true,
        message: 'Выход выполнен успешно'
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка при выходе'
      });
    }
  }

  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token обязателен'
        });
      }

      const decoded = JWTService.verifyRefreshToken(refreshToken);
      
      if (!decoded || decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          message: 'Недействительный refresh token'
        });
      }

      // Находим пользователя
      const user = await User.findByPk(decoded.id);
      
      if (!user || user.deleted_at) {
        return res.status(404).json({
          success: false,
          message: 'Пользователь не найден'
        });
      }

      // Генерируем новые токены
      const newAccessToken = JWTService.generateAccessToken(user);
      const newRefreshToken = JWTService.generateRefreshToken(user);

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка обновления токена'
      });
    }
  }

  static async verifyEmail(req, res) {
    try {
      const { token } = req.params;

      const user = await User.findOne({
        where: { email_verification_token: token }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Недействительный токен верификации'
        });
      }

      // Обновляем пользователя
      user.is_email_verified = true;
      user.email_verification_token = null;
      await user.save();

      res.json({
        success: true,
        message: 'Email успешно подтвержден'
      });
    } catch (error) {
      console.error('Verify email error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка подтверждения email'
      });
    }
  }

  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ where: { email } });
      
      if (!user) {
        // Для безопасности не сообщаем, что пользователь не найден
        return res.json({
          success: true,
          message: 'Если email существует, на него отправлена инструкция по сбросу пароля'
        });
      }

      // Генерируем токен для сброса пароля
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 час

      user.reset_password_token = resetToken;
      user.reset_password_expires = resetTokenExpires;
      await user.save();

      // Отправляем email
      await EmailService.sendPasswordResetEmail(email, resetToken);

      res.json({
        success: true,
        message: 'Если email существует, на него отправлена инструкция по сбросу пароля'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка восстановления пароля'
      });
    }
  }

  static async resetPassword(req, res) {
    try {
      const { token } = req.params;
      const { password } = req.body;

      const user = await User.findOne({
        where: {
          reset_password_token: token,
          reset_password_expires: { [require('sequelize').Op.gt]: new Date() }
        }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Недействительный или просроченный токен'
        });
      }

      // Обновляем пароль
      user.password_hash = password; // Хэширование в хуке модели
      user.reset_password_token = null;
      user.reset_password_expires = null;
      await user.save();

      res.json({
        success: true,
        message: 'Пароль успешно изменен'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка сброса пароля'
      });
    }
  }

  static async getProfile(req, res) {
    try {
      // Пользователь уже добавлен в req в middleware
      res.json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения профиля'
      });
    }
  }
}

module.exports = AuthController;