const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Все маршруты требуют аутентификации
router.use(authMiddleware);

/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Получение уведомлений пользователя
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Фильтр по типу уведомления
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *         description: Фильтр по статусу прочтения
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
 *         description: Список уведомлений
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
 *                     notifications:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Notification'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /notifications/unread-count:
 *   get:
 *     summary: Получение количества непрочитанных уведомлений
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Количество непрочитанных уведомлений
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
 *                     unread_count:
 *                       type: integer
 */

/**
 * @swagger
 * /notifications/{id}/read:
 *   patch:
 *     summary: Отметка уведомления как прочитанного
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID уведомления
 *     responses:
 *       200:
 *         description: Уведомление отмечено как прочитанное
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
 * /notifications/mark-all-read:
 *   patch:
 *     summary: Отметка всех уведомлений как прочитанных
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Фильтр по типу уведомления
 *     responses:
 *       200:
 *         description: Все уведомления отмечены как прочитанные
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
 * /notifications/{id}:
 *   delete:
 *     summary: Удаление уведомления
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID уведомления
 *     responses:
 *       200:
 *         description: Уведомление удалено
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

// Получение уведомлений пользователя
router.get('/', NotificationController.getNotifications);

// Получение количества непрочитанных уведомлений
router.get('/unread-count', NotificationController.getUnreadCount);

// Отметка уведомления как прочитанного
router.patch('/:id/read', NotificationController.markAsRead);

// Отметка всех уведомлений как прочитанных
router.patch('/mark-all-read', NotificationController.markAllAsRead);

// Удаление уведомления
router.delete('/:id', NotificationController.deleteNotification);

module.exports = router;