const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const UserController = require('../controllers/user.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation
} = require('../middlewares/validation.middleware');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Регистрация нового пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Пользователь успешно зарегистрирован
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Ошибка валидации или пользователь уже существует
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Вход пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Успешный вход
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Неверный email или пароль
 *       403:
 *         description: Email не подтвержден или аккаунт деактивирован
 */

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Обновление токена
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh токен
 *             required:
 *               - refreshToken
 *     responses:
 *       200:
 *         description: Токены успешно обновлены
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       400:
 *         description: Refresh token обязателен
 *       401:
 *         description: Недействительный refresh token
 */

/**
 * @swagger
 * /auth/verify-email/{token}:
 *   get:
 *     summary: Подтверждение email
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Токен подтверждения email
 *     responses:
 *       200:
 *         description: Email успешно подтвержден
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Недействительный токен верификации
 */

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Восстановление пароля
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email пользователя
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: Инструкция по сбросу пароля отправлена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /auth/reset-password/{token}:
 *   post:
 *     summary: Сброс пароля
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Токен сброса пароля
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: Новый пароль
 *             required:
 *               - password
 *     responses:
 *       200:
 *         description: Пароль успешно изменен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Недействительный или просроченный токен
 */

// Публичные маршруты
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.get('/verify-email/:token', AuthController.verifyEmail);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password/:token', AuthController.resetPassword);

// Защищенные маршруты (требуют аутентификации)
router.use(authMiddleware);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Выход пользователя
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Успешный выход
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Получение профиля пользователя
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Профиль пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Обновление профиля пользователя
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 description: Полное имя
 *               phone:
 *                 type: string
 *                 description: Телефон
 *               company_name:
 *                 type: string
 *                 description: Название компании
 *     responses:
 *       200:
 *         description: Профиль успешно обновлен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: Изменение пароля
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Текущий пароль
 *               newPassword:
 *                 type: string
 *                 description: Новый пароль
 *             required:
 *               - currentPassword
 *               - newPassword
 *     responses:
 *       200:
 *         description: Пароль успешно изменен
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

/**
 * @swagger
 * /auth/applications:
 *   get:
 *     summary: Получение заявок пользователя
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Список заявок пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     applications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Application'
 */

/**
 * @swagger
 * /auth/stats:
 *   get:
 *     summary: Получение статистики пользователя
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика пользователя
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       description: Статистика пользователя
 */

/**
 * @swagger
 * /auth/deactivate:
 *   post:
 *     summary: Деактивация аккаунта
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Аккаунт успешно деактивирован
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */

router.post('/logout', AuthController.logout);
router.get('/profile', AuthController.getProfile);
router.put('/profile', updateProfileValidation, UserController.updateProfile);
router.put('/change-password', changePasswordValidation, UserController.changePassword);
router.get('/applications', UserController.getMyApplications);
router.get('/stats', UserController.getStats);
router.post('/deactivate', UserController.deactivateAccount);

module.exports = router;