const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');
const { wrapController } = require('../utils/controller-wrapper.util');
const AuditService = require('../services/audit.service');

class AuditController {
  // Получение логов аудита с фильтрацией
  static getLogs = wrapController(async (req, res) => {
    const {
      action,
      userId,
      targetEntity,
      targetId,
      dateFrom,
      dateTo,
      severity,
      page = 1,
      limit = 20
    } = req.query;

    const filters = {
      action,
      userId,
      targetEntity,
      targetId,
      dateFrom,
      dateTo,
      severity,
      page,
      limit
    };

    const result = await AuditService.getLogs(filters);

    res.json(result);
  });

  // Получение конкретного лога по ID
  static getById = wrapController(async (req, res) => {
    const { id } = req.params;

    const result = await AuditService.getLogById(id);

    if (result.error) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }

    res.json(result);
  });

  // Получение логов для конкретного пользователя
  static getByUser = wrapController(async (req, res) => {
    const { userId } = req.params;
    const { action, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    const filters = {
      action,
      dateFrom,
      dateTo,
      page,
      limit
    };

    const result = await AuditService.getLogsByUser(userId, filters);

    if (result.error) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }

    res.json(result);
  });

  // Получение логов для конкретной сущности
  static getByEntity = wrapController(async (req, res) => {
    const { entity, entityId } = req.params;
    const { action, dateFrom, dateTo, page = 1, limit = 20 } = req.query;

    const filters = {
      action,
      dateFrom,
      dateTo,
      page,
      limit
    };

    const result = await AuditService.getLogsByEntity(entity, entityId, filters);

    if (result.error) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }

    res.json(result);
  });

  // Получение статистики аудита
  static getStats = wrapController(async (req, res) => {
    const result = await AuditService.getStats();

    res.json(result);
  });

  // Получение последних действий пользователя
  static getRecentActions = wrapController(async (req, res) => {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    const result = await AuditService.getRecentActions(userId, limit);

    res.json(result);
  });

  // Получение логов за определенный период
  static getLogsByPeriod = wrapController(async (req, res) => {
    const { startDate, endDate } = req.query;
    const { action, targetEntity } = req.query;

    const filters = {
      action,
      targetEntity
    };

    const result = await AuditService.getLogsByPeriod(startDate, endDate, filters);

    res.json(result);
  });

  // Получение логов с определенным уровнем критичности
  static getLogsBySeverity = wrapController(async (req, res) => {
    const { severity } = req.params;
    const { action, userId, targetEntity, page = 1, limit = 20 } = req.query;

    const filters = {
      action,
      userId,
      targetEntity
    };

    const options = {
      page,
      limit
    };

    const result = await AuditService.getLogsBySeverity(severity, filters, options);

    res.json(result);
  });
}

module.exports = AuditController;