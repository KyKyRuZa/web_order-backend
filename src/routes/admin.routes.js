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