const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/audit.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');

// Все маршруты требуют аутентификации
router.use(authMiddleware);

/**
 * @swagger
 * /audit/logs:
 *   get:
 *     summary: Получение логов аудита с фильтрацией
 *     tags: [Audit]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Фильтр по действию
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Фильтр по ID пользователя
 *       - in: query
 *         name: targetEntity
 *         schema:
 *           type: string
 *         description: Фильтр по сущности (application, user, note, etc.)
 *       - in: query
 *         name: targetId
 *         schema:
 *           type: string
 *         description: Фильтр по ID сущности
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Фильтр по дате начала
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Фильтр по дате окончания
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
 *         description: Список логов аудита
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
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 *                     pagination:
 *                       type: object
 *                       description: Информация о пагинации
 */

/**
 * @swagger
 * /audit/logs/{id}:
 *   get:
 *     summary: Получение конкретного лога аудита
 *     tags: [Audit]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID лога аудита
 *     responses:
 *       200:
 *         description: Лог аудита
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
 *                     log:
 *                       $ref: '#/components/schemas/AuditLog'
 */

/**
 * @swagger
 * /audit/users/{userId}:
 *   get:
 *     summary: Получение логов аудита для конкретного пользователя
 *     tags: [Audit]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID пользователя
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Фильтр по действию
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Фильтр по дате начала
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Фильтр по дате окончания
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
 *         description: Логи аудита пользователя
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
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 *                     pagination:
 *                       type: object
 *                       description: Информация о пагинации
 */

/**
 * @swagger
 * /audit/entities/{entity}/{entityId}:
 *   get:
 *     summary: Получение логов аудита для конкретной сущности
 *     tags: [Audit]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema:
 *           type: string
 *         description: Тип сущности (application, user, note, etc.)
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID сущности
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Фильтр по действию
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Фильтр по дате начала
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Фильтр по дате окончания
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
 *         description: Логи аудита сущности
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
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditLog'
 *                     pagination:
 *                       type: object
 *                       description: Информация о пагинации
 */

/**
 * @swagger
 * /audit/stats:
 *   get:
 *     summary: Получение статистики аудита
 *     tags: [Audit]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Статистика аудита
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
 *                     total_logs:
 *                       type: integer
 *                     top_actions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           action:
 *                             type: string
 *                           action_description:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     top_users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           user:
 *                             $ref: '#/components/schemas/User'
 *                           count:
 *                             type: integer
 *                     by_entities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           entity:
 *                             type: string
 *                           count:
 *                             type: integer
 */


// Получение логов аудита с фильтрацией
router.get('/logs', requireAdmin, AuditController.getLogs);

// Получение конкретного лога по ID
router.get('/logs/:id', requireAdmin, AuditController.getById);

// Получение логов для конкретного пользователя
router.get('/users/:userId', requireAdmin, AuditController.getByUser);

// Получение логов для конкретной сущности
router.get('/entities/:entity/:entityId', requireAdmin, AuditController.getByEntity);

// Получение статистики аудита
router.get('/stats', requireAdmin, AuditController.getStats);

module.exports = router;