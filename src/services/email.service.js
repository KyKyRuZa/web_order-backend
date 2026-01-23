const logger = require('../config/logger');

class EmailService {
  static async sendWelcomeEmail(email, fullName) {
    // В реальном приложении здесь будет отправка через Nodemailer/SendGrid
    logger.info(`📧 Отправлено приветственное письмо на ${email} для ${fullName}`);
    
    return {
      to: email,
      subject: 'Добро пожаловать в WebDev Orders!',
      message: `Привет, ${fullName}! Спасибо за регистрацию.`
    };
  }

  static async sendVerificationEmail(email, token) {
    const verificationLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email/${token}`;
    
    logger.info(`📧 Отправлено письмо для верификации на ${email}`);
    logger.info(`🔗 Ссылка верификации: ${verificationLink}`);
    
    return {
      to: email,
      subject: 'Подтвердите ваш email',
      message: `Пожалуйста, подтвердите ваш email: ${verificationLink}`
    };
  }

  static async sendPasswordResetEmail(email, token) {
    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${token}`;
    
    logger.info(`📧 Отправлено письмо для сброса пароля на ${email}`);
    
    return {
      to: email,
      subject: 'Сброс пароля',
      message: `Для сброса пароля перейдите по ссылке: ${resetLink}`
    };
  }
}

module.exports = EmailService;