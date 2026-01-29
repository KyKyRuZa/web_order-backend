const express = require('express');
const router = express.Router();
const NoteController = require('../controllers/note.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireManager } = require('../middlewares/role.middleware');

// Все маршруты требуют аутентификации
router.use(authMiddleware);

/**
 * @swagger
 * /applications/{applicationId}/notes:
 *   post:
 *     summary: Создание новой заметки к заявке
 *     tags: [Notes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
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
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Содержание заметки
 *                 maxLength: 5000
 *               noteType:
 *                 type: string
 *                 enum: [internal, comment, system, change_log]
 *                 description: Тип заметки
 *               isPinned:
 *                 type: boolean
 *                 description: Закреплена ли заметка
 *     responses:
 *       201:
 *         description: Заметка успешно создана
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
 *                       $ref: '#/components/schemas/ApplicationNote'
 */

/**
 * @swagger
 * /applications/{applicationId}/notes:
 *   get:
 *     summary: Получение всех заметок к заявке
 *     tags: [Notes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заявки
 *       - in: query
 *         name: noteType
 *         schema:
 *           type: string
 *           enum: [internal, comment, system, change_log]
 *         description: Фильтр по типу заметки
 *       - in: query
 *         name: isPinned
 *         schema:
 *           type: boolean
 *         description: Фильтр по статусу закрепления
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
 *         description: Список заметок
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
 *                     notes:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ApplicationNote'
 *                     pagination:
 *                       type: object
 *                       description: Информация о пагинации
 */

/**
 * @swagger
 * /notes/{noteId}:
 *   get:
 *     summary: Получение заметки по ID
 *     tags: [Notes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заметки
 *     responses:
 *       200:
 *         description: Информация о заметке
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
 *                     note:
 *                       $ref: '#/components/schemas/ApplicationNote'
 */

/**
 * @swagger
 * /notes/{noteId}:
 *   put:
 *     summary: Обновление заметки
 *     tags: [Notes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заметки
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Содержание заметки
 *                 maxLength: 5000
 *               noteType:
 *                 type: string
 *                 enum: [internal, comment, system, change_log]
 *                 description: Тип заметки
 *               isPinned:
 *                 type: boolean
 *                 description: Закреплена ли заметка
 *     responses:
 *       200:
 *         description: Заметка успешно обновлена
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
 *                       $ref: '#/components/schemas/ApplicationNote'
 */

/**
 * @swagger
 * /notes/{noteId}:
 *   delete:
 *     summary: Удаление заметки
 *     tags: [Notes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заметки
 *     responses:
 *       200:
 *         description: Заметка успешно удалена
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
 * /notes/{noteId}/pin:
 *   post:
 *     summary: Закрепление/открепление заметки
 *     tags: [Notes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: noteId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заметки
 *     responses:
 *       200:
 *         description: Статус закрепления изменен
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
 *                       $ref: '#/components/schemas/ApplicationNote'
 */


// Создание новой заметки к заявке
router.post('/applications/:applicationId/notes', NoteController.create);

// Получение всех заметок к заявке
router.get('/applications/:applicationId/notes', NoteController.getByApplication);

// Получение заметки по ID
router.get('/notes/:noteId', NoteController.getById);

// Обновление заметки
router.put('/notes/:noteId', NoteController.update);

// Удаление заметки
router.delete('/notes/:noteId', NoteController.delete);

// Закрепление/открепление заметки
router.post('/notes/:noteId/pin', NoteController.togglePin);

module.exports = router;