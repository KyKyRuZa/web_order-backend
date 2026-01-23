const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware');
const ApplicationController = require('../controllers/application.controller');

// Все маршруты требуют аутентификации
router.use(authMiddleware);

// Основные CRUD операции
router.get('/', ApplicationController.getAll);
router.post('/', ApplicationController.create);
router.get('/:id', ApplicationController.getById);
router.put('/:id', ApplicationController.update);
router.delete('/:id', ApplicationController.delete);
router.post('/:id/submit', ApplicationController.submit);

// Файлы
router.post('/:id/files', ApplicationController.uploadFile);
router.get('/:id/files', ApplicationController.getFiles);
router.delete('/files/:fileId', ApplicationController.deleteFile);

module.exports = router;