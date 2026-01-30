const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/audit.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     AuditLog:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Уникальный идентификатор лога
 *           example: 123e4567-e89b-12d3-a456-426614174004
 *         action:
 *           type: string
 *           description: Выполненное действие
 *           example: application_create
 *         user_id:
 *           type: string
 *           format: uuid
 *           description: ID пользователя, совершившего действие
 *           example: 123e4567-e89b-12d3-a456-426614174001
 *         target_entity:
 *           type: string
 *           description: Сущность, к которой применяется действие
 *           example: application
 *         target_id:
 *           type: string
 *           format: uuid
 *           description: ID целевой сущности
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         old_value:
 *           type: object
 *           description: Старое значение (если применимо)
 *         new_value:
 *           type: object
 *           description: Новое значение (если применимо)
 *         ip_address:
 *           type: string
 *           description: IP-адрес пользователя
 *           example: 192.168.1.1
 *         user_agent:
 *           type: string
 *           description: User agent пользователя
 *           example: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Дата создания лога
 *           example: 2023-01-01T00:00:00.000Z
 */

/**
 * @swagger
 * /audit/logs:
 *   get:
 *     summary: Получение логов аудита с фильтрацией
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
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
 *         description: Фильтр по типу целевой сущности
 *       - in: query
 *         name: targetId
 *         schema:
 *           type: string
 *         description: Фильтр по ID целевой сущности
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Фильтр по дате начала
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Фильтр по дате окончания
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *         description: Фильтр по уровню критичности
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
 *                       $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /audit/logs/{id}:
 *   get:
 *     summary: Получение конкретного лога по ID
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID лога
 *     responses:
 *       200:
 *         description: Конкретный лог аудита
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
 *       404:
 *         description: Лог не найден
 */

/**
 * @swagger
 * /audit/users/{userId}:
 *   get:
 *     summary: Получение логов для конкретного пользователя
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
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
 *           format: date-time
 *         description: Фильтр по дате начала
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
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
 *         description: Логи для конкретного пользователя
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
 *                       $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /audit/entities/{entity}/{entityId}:
 *   get:
 *     summary: Получение логов для конкретной сущности
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema:
 *           type: string
 *         description: Тип сущности (application, user, note, file)
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
 *           format: date-time
 *         description: Фильтр по дате начала
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
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
 *         description: Логи для конкретной сущности
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
 *                       $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /audit/stats:
 *   get:
 *     summary: Получение статистики аудита
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
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


// Все маршруты требуют аутентификации
router.use(authMiddleware);

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