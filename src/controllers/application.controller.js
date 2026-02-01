const { Application, ApplicationFile, User, AuditLog } = require('../models');
const { Op, col } = require('sequelize');
const fs = require('fs');
const { wrapController } = require('../utils/controller-wrapper.util');
const ApplicationService = require('../services/application.service');
const FileService = require('../services/file.service');

class ApplicationController {
  static getAll = wrapController(async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Используем оптимизированный сервис
    const filters = {
      status: req.query.status,
      service_type: req.query.service_type,
      priority: req.query.priority
    };

    const options = {
      userId,
      userRole,
      page: req.query.page,
      limit: req.query.limit,
      sortBy: req.query.sortBy || 'created_at',
      order: req.query.order || 'DESC',
      includeStats: true
    };

    const result = await ApplicationService.getApplications(filters, options);
    res.json(result);
  })

  static getById = wrapController(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await ApplicationService.getById(id, userId, userRole);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Заявка не найдена или у вас нет к ней доступа'
      });
    }

    res.json(result);
  })

  static create = wrapController(async (req, res) => {
    const userId = req.user.id;
    const {
      title,
      description,
      service_type,
      expected_budget  // Обновленное поле - теперь это число, а не ENUM
    } = req.body;

    // Валидация типа услуги
    if (service_type && !Object.values(Application.SERVICE_TYPES).includes(service_type)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный тип услуги'
      });
    }

    // Валидация ожидаемого бюджета (теперь это число)
    if (expected_budget !== undefined && (typeof expected_budget !== 'number' || expected_budget < 0)) {
      return res.status(400).json({
        success: false,
        message: 'Ожидаемый бюджет должен быть неотрицательным числом'
      });
    }

    const applicationData = {
      title,
      description,
      service_type,
      expected_budget
    };

    const application = await ApplicationService.create(userId, applicationData);

    // Записываем событие в аудит
    await AuditLog.logAction({
      action: AuditLog.ACTIONS.APPLICATION_CREATE,
      userId: userId,
      targetEntity: 'application',
      targetId: application.id,
      newValue: application.toJSON(),
      ipAddress: (() => {
        const { isValidIP } = require('../utils/ip-validator.util');
        if (isValidIP(req.ip)) return req.ip;
        if (isValidIP(req.connection?.remoteAddress)) return req.connection.remoteAddress;
        if (isValidIP(req.socket?.remoteAddress)) return req.socket.remoteAddress;
        return null;
      })(),
      userAgent: req.headers['user-agent']
    });

    // Добавляем display значения
    const applicationWithDisplay = {
      ...application.toJSON(),
      statusDisplay: application.statusDisplay,
      serviceTypeDisplay: application.serviceTypeDisplay
    };

    res.status(201).json({
      success: true,
      message: 'Заявка создана',
      data: { application: applicationWithDisplay }
    });
  })

  static async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      const updateData = req.body;

      const result = await ApplicationService.update(id, userId, userRole, updateData);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена или нельзя обновить'
        });
      }

      if (result.error) {
        return res.status(400).json({
          success: false,
          message: result.error
        });
      }

      // Записываем событие в аудит
      await AuditLog.logAction({
        action: AuditLog.ACTIONS.APPLICATION_UPDATE,
        userId: userId,
        targetEntity: 'application',
        targetId: result.id,
        oldValue: { ...result.toJSON() },
        newValue: { ...result.toJSON(), ...updateData },
        ipAddress: (() => {
          const { isValidIP } = require('../utils/ip-validator.util');
          if (isValidIP(req.ip)) return req.ip;
          if (isValidIP(req.connection?.remoteAddress)) return req.connection.remoteAddress;
          if (isValidIP(req.socket?.remoteAddress)) return req.socket.remoteAddress;
          return null;
        })(),
        userAgent: req.headers['user-agent']
      });

      // Обновляем display значения
      const applicationWithDisplay = {
        ...result.toJSON(),
        statusDisplay: result.statusDisplay,
        serviceTypeDisplay: result.serviceTypeDisplay
      };

      res.json({
        success: true,
        message: 'Заявка обновлена',
        data: { application: applicationWithDisplay }
      });
    } catch (error) {
      console.error('Update application error:', error);

      if (error.name === 'SequelizeValidationError') {
        const errors = error.errors.map(e => ({
          field: e.path,
          message: e.message
        }));

        return res.status(400).json({
          success: false,
          message: 'Ошибка валидации',
          errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Ошибка обновления заявки'
      });
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await ApplicationService.delete(id, userId, userRole);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена или нельзя удалить'
        });
      }

      if (result.error) {
        return res.status(403).json({
          success: false,
          message: result.error
        });
      }

      // Записываем событие в аудит
      await AuditLog.logAction({
        action: AuditLog.ACTIONS.APPLICATION_DELETE,
        userId: userId,
        targetEntity: 'application',
        targetId: result.id,
        oldValue: result.toJSON(),
        ipAddress: (() => {
          const { isValidIP } = require('../utils/ip-validator.util');
          if (isValidIP(req.ip)) return req.ip;
          if (isValidIP(req.connection?.remoteAddress)) return req.connection.remoteAddress;
          if (isValidIP(req.socket?.remoteAddress)) return req.socket.remoteAddress;
          return null;
        })(),
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: 'Заявка удалена'
      });
    } catch (error) {
      console.error('Delete application error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка удаления заявки'
      });
    }
  }

  static async submit(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await ApplicationService.submit(id, userId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Черновик не найден'
        });
      }

      if (result.error) {
        return res.status(400).json({
          success: false,
          message: result.error,
          missingFields: result.missingFields
        });
      }

      // Обновляем display значения
      const applicationWithDisplay = {
        ...result.toJSON(),
        statusDisplay: result.statusDisplay,
        serviceTypeDisplay: result.serviceTypeDisplay
      };

      res.json({
        success: true,
        message: 'Заявка отправлена на рассмотрение',
        data: { application: applicationWithDisplay }
      });
    } catch (error) {
      console.error('Submit application error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка отправки заявки'
      });
    }
  }

  static async uploadFile(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      const { category, description } = req.body;

      // Проверяем, был ли файл загружен
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Файл обязателен для загрузки'
        });
      }

      // Проверяем размер файла
      if (req.file.size > ApplicationFile.MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          message: `Файл превышает максимальный размер ${ApplicationFile.MAX_FILE_SIZE / (1024 * 1024)}MB`
        });
      }

      // Проверяем MIME-тип
      if (!ApplicationFile.ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `Неподдерживаемый тип файла: ${req.file.mimetype}`
        });
      }

      // Проверяем категорию файла
      if (category && !Object.values(ApplicationFile.FILE_CATEGORIES).includes(category)) {
        return res.status(400).json({
          success: false,
          message: 'Некорректная категория файла'
        });
      }

      // Используем сервис для загрузки файла
      const fileData = {
        category,
        description,
        ip: (() => {
          const { isValidIP } = require('../utils/ip-validator.util');
          if (isValidIP(req.ip)) return req.ip;
          if (isValidIP(req.connection?.remoteAddress)) return req.connection.remoteAddress;
          if (isValidIP(req.socket?.remoteAddress)) return req.socket.remoteAddress;
          return null;
        })(),
        userAgent: req.headers['user-agent']
      };

      const result = await FileService.uploadFile(id, userId, userRole, req.file, fileData, req);

      if (result.error) {
        return res.status(400).json({
          success: false,
          message: result.error
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Upload file error:', error);

      // Удаляем файл с диска, если произошла ошибка при сохранении в БД
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Error deleting uploaded file:', unlinkError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Ошибка загрузки файла'
      });
    }
  }

  static async getFiles(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await FileService.getFiles(id, userId, userRole);

      if (result.error) {
        return res.status(404).json({
          success: false,
          message: result.error
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Get files error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения файлов'
      });
    }
  }

  static async deleteFile(req, res) {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await FileService.deleteFile(fileId, userId, userRole, req);

      if (result.error) {
        return res.status(404).json({
          success: false,
          message: result.error
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка удаления файла'
      });
    }
  }

  static async getStatusTransitions(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const result = await ApplicationService.getStatusTransitions(id, userId, userRole);

      if (result.error) {
        return res.status(404).json({
          success: false,
          message: result.error
        });
      }

      res.json(result);
    } catch (error) {
      console.error('Get status transitions error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения доступных статусов'
      });
    }
  }
}

module.exports = ApplicationController;