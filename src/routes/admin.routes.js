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

// Все маршруты требуют аутентификации
router.use(authMiddleware);

/**
 * @swagger
 * /admin/applications:
 *   get:
 *     summary: Получение списка заявок с фильтрацией
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Фильтр по статусу
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
 *         description: Фильтр по назначеному менеджеру
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Фильтр по дате начала
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Фильтр по дате окончания
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по ключевым словам
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
 *                       type: object
 *                       description: Информация о пагинации
 */

/**
 * @swagger
 * /admin/applications/{id}:
 *   get:
 *     summary: Получение детальной информации о заявке
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
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
 */

/**
 * @swagger
 * /admin/applications/{id}/status:
 *   put:
 *     summary: Изменение статуса заявки
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
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
 *                 enum: [draft, submitted, in_review, needs_info, estimated, approved, in_progress, completed, cancelled]
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
 *                     status_change:
 *                       type: object
 *                       description: Информация об изменении статуса
 */

/**
 * @swagger
 * /admin/applications/{id}/reset-to-draft:
 *   post:
 *     summary: Возврат заявки в черновик
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заявки
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Причина возврата в черновик
 *     responses:
 *       200:
 *         description: Заявка возвращена в статус черновика
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
 *                     status:
 *                       type: string
 */

/**
 * @swagger
 * /admin/applications/{id}/assign:
 *   put:
 *     summary: Назначение менеджера на заявку
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
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
 *                 description: ID менеджера
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
 *                     new_manager:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         full_name:
 *                           type: string
 *                         email:
 *                           type: string
 */

/**
 * @swagger
 * /admin/applications/{id}/notes:
 *   post:
 *     summary: Добавление внутренней заметки к заявке
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
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
 *                 description: Текст заметки
 *     responses:
 *       200:
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
 *                     application_id:
 *                       type: string
 *                     note:
 *                       type: string
 */

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Получение списка пользователей
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Фильтр по роли
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: string
 *         description: Фильтр по активности
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Фильтр по дате регистрации
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Фильтр по дате регистрации
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Поиск по ключевым словам
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
 *                       type: object
 *                       description: Информация о пагинации
 */

/**
 * @swagger
 * /admin/users/{id}/role:
 *   put:
 *     summary: Изменение роли пользователя
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
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
 *                 enum: [client, manager, admin]
 *                 description: Новая роль пользователя
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
 */

/**
 * @swagger
 * /admin/stats/dashboard:
 *   get:
 *     summary: Получение статистики для дашборда
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
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
 *                     overview:
 *                       type: object
 *                       description: Общая статистика
 *                     by_status:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Статистика по статусам
 *                     by_service:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Статистика по типам услуг
 *                     by_role:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Статистика по ролям
 *                     manager_load:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Нагрузка на менеджеров
 *                     recent_activity:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Последние действия
 */

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
router.get('/users', requireAdmin, AdminController.getUsers);

// Изменение роли пользователя
router.put('/users/:id/role', requireAdmin, notSelfAction, AdminController.updateUserRole);

// === Статистика ===

// Получение статистики для дашборда
router.get('/stats/dashboard', requireManager, AdminController.getDashboardStats);

// === Дополнительные endpoint'ы ===

// Получение доступных переходов статуса для заявки (перенесено в ApplicationController)
// router.get('/applications/:id/transitions', requireManager, AdminController.getStatusTransitions);

// Экспорт заявок (заглушка)
router.get('/applications/export', requireManager, (req, res) => {
  res.json({
    success: true,
    message: 'Экспорт заявок (функционал в разработке)'
  });
});

// Массовые действия с заявками (заглушка)
router.post('/applications/bulk-action', requireManager, (req, res) => {
  res.json({
    success: true,
    message: 'Массовые действия (функционал в разработке)'
  });
});

// Просмотр логов системы (заглушка)
router.get('/system/logs', requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: 'Логи системы (функционал в разработке)'
  });
});

module.exports = router;