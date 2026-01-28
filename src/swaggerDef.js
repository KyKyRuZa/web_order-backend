/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Аутентификация и управление пользователями
 */

/**
 * @swagger
 * tags:
 *   name: Applications
 *   description: Управление заявками
 */

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Административные функции
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - fullName
 *       properties:
 *         id:
 *           type: string
 *           description: Уникальный идентификатор пользователя
 *         email:
 *           type: string
 *           description: Email пользователя
 *         full_name:
 *           type: string
 *           description: Полное имя пользователя
 *         phone:
 *           type: string
 *           description: Телефон пользователя
 *         company_name:
 *           type: string
 *           description: Название компании
 *         role:
 *           type: string
 *           enum: [client, manager, admin]
 *           description: Роль пользователя
 *         is_email_verified:
 *           type: boolean
 *           description: Подтверждён ли email
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Дата создания
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Дата обновления
 *       example:
 *         id: 1
 *         email: user@example.com
 *         full_name: Иван Иванов
 *         phone: "+79991234567"
 *         company_name: ООО "Пример"
 *         role: client
 *         is_email_verified: true
 *         created_at: 2023-01-01T00:00:00.000Z
 *         updated_at: 2023-01-01T00:00:00.000Z
 * 
 *     Application:
 *       type: object
 *       required:
 *         - title
 *         - service_type
 *         - contact_full_name
 *         - contact_email
 *         - contact_phone
 *       properties:
 *         id:
 *           type: string
 *           description: Уникальный идентификатор заявки
 *         user_id:
 *           type: string
 *           description: ID пользователя, создавшего заявку
 *         title:
 *           type: string
 *           description: Название заявки
 *         description:
 *           type: string
 *           description: Описание заявки
 *         service_type:
 *           type: string
 *           enum: [landing, corporate, ecommerce, web_app, redesign, other]
 *           description: Тип услуги
 *         status:
 *           type: string
 *           enum: [draft, submitted, in_review, needs_info, estimated, approved, in_progress, completed, cancelled]
 *           description: Статус заявки
 *         contact_full_name:
 *           type: string
 *           description: Контактное лицо
 *         contact_email:
 *           type: string
 *           description: Контактный email
 *         contact_phone:
 *           type: string
 *           description: Контактный телефон
 *         company_name:
 *           type: string
 *           description: Название компании
 *         budget_range:
 *           type: string
 *           enum: [under_50k, from_50k_to_100k, from_100k_to_300k, from_300k_to_500k, negotiable]
 *           description: Бюджетный диапазон
 *         priority:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *           description: Приоритет
 *         assigned_to:
 *           type: string
 *           description: ID назначенного менеджера
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Дата создания
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Дата обновления
 *       example:
 *         id: 1
 *         user_id: 1
 *         title: Создание лендинга
 *         description: Необходимо создать лендинг для продвижения продукта
 *         service_type: landing
 *         status: submitted
 *         contact_full_name: Иван Иванов
 *         contact_email: user@example.com
 *         contact_phone: "+79991234567"
 *         company_name: ООО "Пример"
 *         budget_range: from_50k_to_100k
 *         priority: normal
 *         assigned_to: 2
 *         created_at: 2023-01-01T00:00:00.000Z
 *         updated_at: 2023-01-01T00:00:00.000Z
 * 
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           description: Email пользователя
 *         password:
 *           type: string
 *           description: Пароль пользователя
 *       example:
 *         email: user@example.com
 *         password: secret123
 * 
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - fullName
 *       properties:
 *         email:
 *           type: string
 *           description: Email пользователя
 *         password:
 *           type: string
 *           description: Пароль пользователя
 *         fullName:
 *           type: string
 *           description: Полное имя пользователя
 *         phone:
 *           type: string
 *           description: Телефон пользователя
 *         companyName:
 *           type: string
 *           description: Название компании
 *       example:
 *         email: user@example.com
 *         password: secret123
 *         fullName: Иван Иванов
 *         phone: "+79991234567"
 *         companyName: ООО "Пример"
 * 
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           description: Успешность запроса
 *         message:
 *           type: string
 *           description: Сообщение
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/User'
 *             tokens:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: Access токен
 *                 refreshToken:
 *                   type: string
 *                   description: Refresh токен
 *       example:
 *         success: true
 *         message: Вход выполнен успешно
 *         data:
 *           user:
 *             id: 1
 *             email: user@example.com
 *             full_name: Иван Иванов
 *             phone: "+79991234567"
 *             company_name: ООО "Пример"
 *             role: client
 *             is_email_verified: true
 *             created_at: 2023-01-01T00:00:00.000Z
 *             updated_at: 2023-01-01T00:00:00.000Z
 *           tokens:
 *             accessToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *             refreshToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'RelateLab API Documentation',
    version: '1.0.0',
    description: 'API документация для системы заказов веб-разработки RelateLab',
  },
  servers: [
    {
      url: 'http://localhost:5000/api',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

module.exports = swaggerDefinition;