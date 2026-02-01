const express = require('express');
const router = express.Router();
const NoteController = require('../controllers/note.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireManager } = require('../middlewares/role.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Note:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Уникальный идентификатор заметки
 *           example: 123e4567-e89b-12d3-a456-426614174003
 *         application_id:
 *           type: string
 *           format: uuid
 *           description: ID заявки, к которой относится заметка
 *           example: 123e4567-e89b-12d3-a456-426614174000
 *         author_id:
 *           type: string
 *           format: uuid
 *           description: ID автора заметки
 *           example: 123e4567-e89b-12d3-a456-426614174001
 *         content:
 *           type: string
 *           description: Содержание заметки
 *           example: "Необходимо уточнить требования к дизайну"
 *         note_type:
 *           type: string
 *           enum: [internal, comment, system, change_log]
 *           description: Тип заметки
 *           example: internal
 *         is_pinned:
 *           type: boolean
 *           description: Закреплена ли заметка
 *           example: false
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Дата создания заметки
 *           example: 2023-01-01T00:00:00.000Z
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Дата последнего обновления
 *           example: 2023-01-01T00:00:00.000Z
 */

/**
 * @swagger
 * /notes/applications/{applicationId}/notes:
 *   post:
 *     summary: Создание новой заметки к заявке
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
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
 *             properties:
 *               content:
 *                 type: string
 *                 description: Содержание заметки
 *                 example: "Необходимо уточнить требования к дизайну"
 *               note_type:
 *                 type: string
 *                 enum: [internal, comment, system, change_log]
 *                 description: Тип заметки
 *                 example: internal
 *               is_pinned:
 *                 type: boolean
 *                 description: Закрепить ли заметку
 *                 example: false
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
 *                       $ref: '#/components/schemas/Note'
 *       400:
 *         description: Ошибка валидации
 */

/**
 * @swagger
 * /notes/applications/{applicationId}/notes:
 *   get:
 *     summary: Получение всех заметок к заявке
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID заявки
 *       - in: query
 *         name: note_type
 *         schema:
 *           type: string
 *         description: Фильтр по типу заметки
 *       - in: query
 *         name: is_pinned
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
 *                         $ref: '#/components/schemas/Note'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */

/**
 * @swagger
 * /notes/{noteId}:
 *   get:
 *     summary: Получение заметки по ID
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
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
 *                       $ref: '#/components/schemas/Note'
 *       404:
 *         description: Заметка не найдена
 */

/**
 * @swagger
 * /notes/{noteId}:
 *   put:
 *     summary: Обновление заметки
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
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
 *             $ref: '#/components/schemas/Note'
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
 *                       $ref: '#/components/schemas/Note'
 *       400:
 *         description: Ошибка валидации
 *       404:
 *         description: Заметка не найдена
 */

/**
 * @swagger
 * /notes/{noteId}:
 *   delete:
 *     summary: Удаление заметки
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
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
 *       400:
 *         description: Ошибка валидации
 *       404:
 *         description: Заметка не найдена
 */

/**
 * @swagger
 * /notes/{noteId}/pin:
 *   post:
 *     summary: Закрепление/открепление заметки
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
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
 *                       $ref: '#/components/schemas/Note'
 *       400:
 *         description: Ошибка валидации
 *       404:
 *         description: Заметка не найдена
 */

// Все маршруты требуют аутентификации
router.use(authMiddleware);

// Создание новой заметки к заявке
router.post('/applications/:applicationId/notes', NoteController.create);

// Получение всех заметок к заявке
router.get('/applications/:applicationId/notes', NoteController.getByApplication);

// Получение заметки по ID
router.get('/:noteId', NoteController.getById);

// Обновление заметки
router.put('/:noteId', NoteController.update);

// Удаление заметки
router.delete('/:noteId', NoteController.delete);

// Закрепление/открепление заметки
router.post('/:noteId/pin', NoteController.togglePin);

module.exports = router;