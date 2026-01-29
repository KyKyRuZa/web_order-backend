const { AuditLog, User } = require('../models');
const { Op } = require('sequelize');

class AuditService {
  // Получение логов аудита с фильтрацией
  static async getLogs(filters = {}, options = {}) {
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
    } = filters;

    const {
      sortBy = 'created_at',
      order = 'DESC'
    } = options;

    const where = {};

    // Фильтрация по действию
    if (action) {
      where.action = action;
    }

    // Фильтрация по пользователю
    if (userId) {
      where.user_id = userId;
    }

    // Фильтрация по сущности
    if (targetEntity) {
      where.target_entity = targetEntity;
    }

    // Фильтрация по ID сущности
    if (targetId) {
      where.target_id = targetId;
    }

    // Фильтрация по дате
    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) {
        where.created_at[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where.created_at[Op.lte] = new Date(dateTo);
      }
    }

    // Пагинация
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, order.toUpperCase()]],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'email', 'role']
      }]
    });

    // Преобразуем логи в формат отображения
    const logsWithDisplay = logs.map(log => log.toDisplayFormat());

    return {
      success: true,
      data: {
        logs: logsWithDisplay,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit),
          has_next: offset + parseInt(limit) < count,
          has_prev: offset > 0
        }
      }
    };
  }

  // Получение конкретного лога по ID
  static async getLogById(id) {
    const log = await AuditLog.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'email', 'role']
      }]
    });

    if (!log) {
      return { error: 'Лог аудита не найден' };
    }

    return {
      success: true,
      data: { log: log.toDisplayFormat() }
    };
  }

  // Получение логов для конкретного пользователя
  static async getLogsByUser(userId, filters = {}, options = {}) {
    const { action, dateFrom, dateTo, page = 1, limit = 20 } = filters;
    const { sortBy = 'created_at', order = 'DESC' } = options;

    const where = { user_id: userId };

    if (action) {
      where.action = action;
    }

    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) {
        where.created_at[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where.created_at[Op.lte] = new Date(dateTo);
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, order.toUpperCase()]],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'email', 'role']
      }]
    });

    const logsWithDisplay = logs.map(log => log.toDisplayFormat());

    return {
      success: true,
      data: {
        logs: logsWithDisplay,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit),
          has_next: offset + parseInt(limit) < count,
          has_prev: offset > 0
        }
      }
    };
  }

  // Получение логов для конкретной сущности
  static async getLogsByEntity(entity, entityId, filters = {}, options = {}) {
    const { action, dateFrom, dateTo, page = 1, limit = 20 } = filters;
    const { sortBy = 'created_at', order = 'DESC' } = options;

    const where = {
      target_entity: entity,
      target_id: entityId
    };

    if (action) {
      where.action = action;
    }

    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) {
        where.created_at[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where.created_at[Op.lte] = new Date(dateTo);
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, order.toUpperCase()]],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'email', 'role']
      }]
    });

    const logsWithDisplay = logs.map(log => log.toDisplayFormat());

    return {
      success: true,
      data: {
        logs: logsWithDisplay,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit),
          has_next: offset + parseInt(limit) < count,
          has_prev: offset > 0
        }
      }
    };
  }

  // Получение статистики аудита
  static async getStats() {
    // Общее количество логов
    const totalLogs = await AuditLog.count();

    // Количество логов по действиям
    const actionsCount = await AuditLog.findAll({
      attributes: [
        'action',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['action'],
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']],
      limit: 10
    });

    // Количество логов по пользователям
    const usersCount = await AuditLog.findAll({
      attributes: [
        'user_id',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      where: { user_id: { [Op.ne]: null } },
      group: ['user_id'],
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']],
      limit: 10,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'email', 'role']
      }]
    });

    // Количество логов по сущностям
    const entitiesCount = await AuditLog.findAll({
      attributes: [
        'target_entity',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['target_entity'],
      order: [[require('sequelize').fn('COUNT', require('sequelize').col('id')), 'DESC']]
    });

    return {
      success: true,
      data: {
        total_logs: totalLogs,
        top_actions: actionsCount.map(item => ({
          action: item.action,
          action_description: item.actionDescription || item.action,
          count: parseInt(item.dataValues.count)
        })),
        top_users: usersCount.map(item => ({
          user: item.user ? {
            id: item.user.id,
            full_name: item.user.full_name,
            email: item.user.email,
            role: item.user.role
          } : null,
          count: parseInt(item.dataValues.count)
        })),
        by_entities: entitiesCount.map(item => ({
          entity: item.target_entity,
          count: parseInt(item.dataValues.count)
        }))
      }
    };
  }

  // Создание записи аудита
  static async createLog(action, userId, targetEntity, targetId, oldValue, newValue, req) {
    return await AuditLog.create({
      action,
      user_id: userId,
      target_entity: targetEntity,
      target_id: targetId,
      old_value: oldValue,
      new_value: newValue,
      ip_address: (() => {
        const { isValidIP } = require('../utils/ip-validator.util');
        if (isValidIP(req.ip)) return req.ip;
        if (isValidIP(req.connection?.remoteAddress)) return req.connection.remoteAddress;
        if (isValidIP(req.socket?.remoteAddress)) return req.socket.remoteAddress;
        return null;
      })(),
      user_agent: req.headers['user-agent'],
      metadata: req.metadata || {}
    });
  }

  // Получение последних действий пользователя
  static async getRecentActions(userId, limit = 10) {
    const logs = await AuditLog.findAll({
      where: { user_id: userId },
      limit: limit,
      order: [['created_at', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'email', 'role']
      }]
    });

    return {
      success: true,
      data: {
        logs: logs.map(log => log.toDisplayFormat())
      }
    };
  }

  // Получение логов за определенный период
  static async getLogsByPeriod(startDate, endDate, filters = {}) {
    const where = {
      created_at: {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      }
    };

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.targetEntity) {
      where.target_entity = filters.targetEntity;
    }

    const logs = await AuditLog.findAll({
      where,
      order: [['created_at', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'email', 'role']
      }]
    });

    return {
      success: true,
      data: {
        logs: logs.map(log => log.toDisplayFormat()),
        period: {
          start: startDate,
          end: endDate,
          count: logs.length
        }
      }
    };
  }

  // Получение логов с определенным уровнем критичности
  static async getLogsBySeverity(severity, filters = {}, options = {}) {
    const { page = 1, limit = 20 } = options;
    const { action, userId, targetEntity } = filters;

    const where = {};

    if (action) {
      where.action = action;
    }

    if (userId) {
      where.user_id = userId;
    }

    if (targetEntity) {
      where.target_entity = targetEntity;
    }

    // Фильтрация по уровню критичности
    const criticalActions = [
      AuditLog.ACTIONS.USER_DELETE,
      AuditLog.ACTIONS.USER_ROLE_CHANGE,
      AuditLog.ACTIONS.USER_DEACTIVATE,
      AuditLog.ACTIONS.NOTE_DELETE,
      AuditLog.ACTIONS.APPLICATION_DELETE,
      AuditLog.ACTIONS.SYSTEM_CONFIG_UPDATE
    ];

    const highActions = [
      AuditLog.ACTIONS.APPLICATION_STATUS_CHANGE,
      AuditLog.ACTIONS.APPLICATION_ASSIGN,
      AuditLog.ACTIONS.NOTE_UPDATE,
      AuditLog.ACTIONS.PASSWORD_CHANGE
    ];

    switch (severity) {
      case AuditLog.SEVERITY_LEVELS.CRITICAL:
        where.action = { [Op.in]: criticalActions };
        break;
      case AuditLog.SEVERITY_LEVELS.HIGH:
        where.action = { [Op.in]: [...highActions, ...criticalActions] };
        break;
      case AuditLog.SEVERITY_LEVELS.MEDIUM:
        // Все действия, кроме низких
        where.action = { [Op.notIn]: [...highActions, ...criticalActions] };
        break;
      case AuditLog.SEVERITY_LEVELS.LOW:
        // Только низкие действия
        where.action = { [Op.notIn]: [...highActions, ...criticalActions] };
        break;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'full_name', 'email', 'role']
      }]
    });

    return {
      success: true,
      data: {
        logs: logs.map(log => log.toDisplayFormat()),
        severity: severity,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit),
          has_next: offset + parseInt(limit) < count,
          has_prev: offset > 0
        }
      }
    };
  }
}

module.exports = AuditService;