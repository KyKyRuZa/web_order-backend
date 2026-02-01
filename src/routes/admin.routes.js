// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireAdmin, requireManager, requireAdminOnly, notSelfAction } = require('../middlewares/role.middleware');
const {
  updateApplicationStatusValidation,
  validate
} = require('../middlewares/validation.middleware');

/**
 * @swagger
 * /admin/applications:
 *   get:
 *     summary: Получение списка заявок с фильтрацией
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Фильтр по статусу заявки
 *       - in: query
 *         name: service_type
 *         schema:
 *           type: string
 *         description: Фильтр по типу услуги
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Фильтр по приоритету
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: string
 *         description: Фильтр по назначенным менеджерам
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Количество элементов на странице
 *     responses:
 *       200:
 *         description: Список заявок
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
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /admin/applications/{id}:
 *   get:
 *     summary: Получение детальной информации о заявке
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заявки
 *     responses:
 *       200:
 *         description: Детальная информация о заявке
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
 *                     application:
 *                       $ref: '#/components/schemas/Application'
 *       404:
 *         description: Заявка не найдена
 */

/**
 * @swagger
 * /admin/applications/{id}/status:
 *   put:
 *     summary: Изменение статуса заявки
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заявки
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, submitted, in_review, approved, in_progress, completed, cancelled, rejected]
 *                 description: Новый статус заявки
 *               comment:
 *                 type: string
 *                 description: Комментарий к изменению статуса
 *     responses:
 *       200:
 *         description: Статус заявки успешно изменен
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
 *                   type: object
 *                   properties:
 *                     application:
 *                       $ref: '#/components/schemas/Application'
 *       400:
 *         description: Ошибка валидации
 *       404:
 *         description: Заявка не найдена
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Получение списка пользователей
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Фильтр по роли пользователя
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Фильтр по активности пользователя
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Номер страницы
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Количество элементов на странице
 *     responses:
 *       200:
 *         description: Список пользователей
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
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /admin/applications/{id}/reset-to-draft:
 *   post:
 *     summary: Возврат заявки в черновик
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заявки
 *     responses:
 *       200:
 *         description: Заявка успешно возвращена в черновик
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
 *                   type: object
 *                   properties:
 *                     application:
 *                       $ref: '#/components/schemas/Application'
 *       400:
 *         description: Ошибка валидации
 *       404:
 *         description: Заявка не найдена
 */

/**
 * @swagger
 * /admin/applications/{id}/assign:
 *   put:
 *     summary: Назначение менеджера на заявку
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заявки
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               manager_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID менеджера
 *                 example: 123e4567-e89b-12d3-a456-426614174002
 *     responses:
 *       200:
 *         description: Менеджер успешно назначен
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
 *                   type: object
 *                   properties:
 *                     application_id:
 *                       type: string
 *                     old_manager_id:
 *                       type: string
 *                     new_manager:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Ошибка валидации
 *       404:
 *         description: Заявка или менеджер не найдены
 */

/**
 * @swagger
 * /admin/applications/{id}/notes:
 *   post:
 *     summary: Добавление внутренней заметки к заявке
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заявки
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               note:
 *                 type: string
 *                 description: Содержание заметки
 *                 example: "Важное замечание по заявке"
 *     responses:
 *       201:
 *         description: Заметка успешно добавлена
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
 *                   type: object
 *                   properties:
 *                     note:
 *                       $ref: '#/components/schemas/Note'
 *       400:
 *         description: Ошибка валидации
 */

/**
 * @swagger
 * /admin/users/{id}/role:
 *   put:
 *     summary: Изменение роли пользователя
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [client, manager, admin, super_admin]
 *                 description: Новая роль пользователя
 *                 example: manager
 *     responses:
 *       200:
 *         description: Роль пользователя успешно изменена
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
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         full_name:
 *                           type: string
 *                         old_role:
 *                           type: string
 *                         new_role:
 *                           type: string
 *       400:
 *         description: Ошибка валидации
 *       404:
 *         description: Пользователь не найден
 */

/**
 * @swagger
 * /admin/stats/dashboard:
 *   get:
 *     summary: Получение статистики для дашборда
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика для дашборда
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
 */

// Все маршруты требуют аутентификации
router.use(authMiddleware);

// === Заявки ===

// Получение списка заявок с фильтрацией
router.get('/applications', requireManager, AdminController.getApplications);

// Получение детальной информации о заявке
router.get('/applications/:id', requireManager, AdminController.getApplicationDetails);

// Изменение статуса заявки
router.put('/applications/:id/status',
  requireManager,
  updateApplicationStatusValidation,
  AdminController.updateApplicationStatus
);

// Возврат заявки в черновик
router.post('/applications/:id/reset-to-draft', requireManager, AdminController.resetToDraft);

// Назначение менеджера на заявку
router.put('/applications/:id/assign', requireAdmin, AdminController.assignManager);

// Добавление внутренней заметки
router.post('/applications/:id/notes', requireManager, AdminController.addInternalNote);

// === Пользователи ===

// Получение списка пользователей
router.get('/users', requireManager, AdminController.getUsers);

// Изменение роли пользователя
router.put('/users/:id/role', requireAdmin, notSelfAction, AdminController.updateUserRole);

// === Статистика ===

// Получение статистики для дашборда
router.get('/stats/dashboard', requireManager, AdminController.getDashboardStats);

module.exports = router;