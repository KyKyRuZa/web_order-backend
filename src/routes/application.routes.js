const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireClient } = require('../middlewares/role.middleware');
const ApplicationController = require('../controllers/application.controller');
const {
  createApplicationValidation,
  validate
} = require('../middlewares/validation.middleware');
const { uploadSingleFile, validateFileSize } = require('../middlewares/fileUpload.middleware');

/**
 * @swagger
 * tags:
 *   name: Applications
 *   description: Управление заявками
 */

/**
 * @swagger
 * /applications:
 *   get:
 *     summary: Получение списка заявок
 *     tags: [Applications]
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
 * /applications:
 *   post:
 *     summary: Создание новой заявки
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateApplicationRequest'
 *     responses:
 *       201:
 *         description: Заявка успешно создана
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
 */

/**
 * @swagger
 * /applications/{id}:
 *   get:
 *     summary: Получение заявки по ID
 *     tags: [Applications]
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
 *         description: Информация о заявке
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
 * /applications/{id}:
 *   put:
 *     summary: Обновление заявки
 *     tags: [Applications]
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
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateApplicationRequest'
 *     responses:
 *       200:
 *         description: Заявка успешно обновлена
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
 * /applications/{id}:
 *   delete:
 *     summary: Удаление заявки
 *     tags: [Applications]
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
 *         description: Заявка успешно удалена
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Заявка не найдена
 */

/**
 * @swagger
 * /applications/{id}/submit:
 *   post:
 *     summary: Отправка заявки на рассмотрение
 *     tags: [Applications]
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
 *         description: Заявка успешно отправлена
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
 * /applications/{id}/transitions:
 *   get:
 *     summary: Получение доступных переходов статуса для заявки
 *     tags: [Applications]
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
 *         description: Доступные переходы статуса
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
 *                     current_status:
 *                       type: string
 *                     current_status_display:
 *                       type: string
 *                     available_transitions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           value:
 *                             type: string
 *                           label:
 *                             type: string
 *       404:
 *         description: Заявка не найдена
 */

/**
 * @swagger
 * /applications/{id}/files:
 *   post:
 *     summary: Загрузка файла к заявке
 *     tags: [Applications]
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
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Файл для загрузки
 *               category:
 *                 type: string
 *                 enum: [technical_spec, design_reference, content, other]
 *                 description: Категория файла
 *               description:
 *                 type: string
 *                 description: Описание файла
 *     responses:
 *       200:
 *         description: Файл успешно загружен
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
 *                     file:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         filename:
 *                           type: string
 *                         original_name:
 *                           type: string
 *                         mime_type:
 *                           type: string
 *                         size:
 *                           type: integer
 *                         size_formatted:
 *                           type: string
 *                         file_category:
 *                           type: string
 *                         description:
 *                           type: string
 *                         uploaded_at:
 *                           type: string
 *                           format: date-time
 *                         is_image:
 *                           type: boolean
 *                         is_document:
 *                           type: boolean
 *       400:
 *         description: Ошибка валидации
 */

/**
 * @swagger
 * /applications/{id}/files:
 *   get:
 *     summary: Получение файлов заявки
 *     tags: [Applications]
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
 *         description: Список файлов заявки
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
 *                     files:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           original_name:
 *                             type: string
 *                           file_category:
 *                             type: string
 *                           uploaded_at:
 *                             type: string
 *                             format: date-time
 *                           size:
 *                             type: integer
 *                           mime_type:
 *                             type: string
 *                           uploader:
 *                             $ref: '#/components/schemas/User'
 */

/**
 * @swagger
 * /applications/files/{fileId}:
 *   delete:
 *     summary: Удаление файла заявки
 *     tags: [Applications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID файла
 *     responses:
 *       200:
 *         description: Файл успешно удален
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Файл не найден
 */


// Все маршруты требуют аутентификации
router.use(authMiddleware);

router.get('/', ApplicationController.getAll);
router.post('/', createApplicationValidation, ApplicationController.create);
router.get('/:id', ApplicationController.getById);
router.put('/:id', ApplicationController.update);
router.delete('/:id', ApplicationController.delete);
router.post('/:id/submit', ApplicationController.submit);

// Получение доступных переходов статуса
router.get('/:id/transitions', ApplicationController.getStatusTransitions);

// Файлы
router.post('/:id/files', uploadSingleFile, validateFileSize, ApplicationController.uploadFile);
router.get('/:id/files', ApplicationController.getFiles);
router.delete('/files/:fileId', ApplicationController.deleteFile);

module.exports = router;