const { Application, ApplicationFile, User } = require('../models');
const { Op } = require('sequelize');

class ApplicationController {
  static async getAll(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      let where = {};

      // Клиенты видят только свои заявки
      if (userRole === User.ROLES.CLIENT) {
        where.user_id = userId;
      }
      // Менеджеры и админы могут фильтровать
      else {
        const { userId: filterUserId, status, serviceType } = req.query;
        if (filterUserId) where.user_id = filterUserId;
        if (status) where.status = status;
        if (serviceType) where.service_type = serviceType;

        // Менеджеры видят только назначенные им заявки
        if (userRole === User.ROLES.MANAGER) {
          where.assigned_to = userId;
        }
      }

      const applications = await Application.findAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email', 'phone']
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'full_name', 'email']
          }
        ],
        order: [['created_at', 'DESC']]
      });

      // Добавляем display значения
      const applicationsWithDisplay = applications.map(app => ({
        ...app.toJSON(),
        statusDisplay: app.statusDisplay,
        serviceTypeDisplay: app.serviceTypeDisplay,
        isActive: app.isActive,
        isEditable: app.isEditable
      }));

      res.json({
        success: true,
        data: { applications: applicationsWithDisplay }
      });
    } catch (error) {
      console.error('Get applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения заявок'
      });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const where = { id };

      // Клиенты могут видеть только свои заявки
      if (userRole === User.ROLES.CLIENT) {
        where.user_id = userId;
      }
      // Менеджеры видят только назначенные им заявки
      else if (userRole === User.ROLES.MANAGER) {
        where[Op.or] = [
          { assigned_to: userId },
          { user_id: userId } // Менеджер может видеть свои собственные заявки как клиент
        ];
      }

      const application = await Application.findOne({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email', 'phone']
          },
          {
            model: User,
            as: 'assignee',
            attributes: ['id', 'full_name', 'email']
          },
          {
            model: ApplicationFile,
            as: 'files',
            attributes: ['id', 'original_name', 'file_category', 'uploaded_at', 'size', 'mime_type', 'description']
          }
        ]
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена или у вас нет к ней доступа'
        });
      }

      // Добавляем display значения
      const applicationWithDisplay = {
        ...application.toJSON(),
        statusDisplay: application.statusDisplay,
        serviceTypeDisplay: application.serviceTypeDisplay,
        isActive: application.isActive,
        isEditable: application.isEditable
      };

      // Форматируем размеры файлов
      applicationWithDisplay.files = applicationWithDisplay.files.map(file => ({
        ...file,
        sizeFormatted: ApplicationFile.prototype.sizeFormatted.call({ size: file.size }),
        isImage: file.mime_type.startsWith('image/'),
        isDocument: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.mime_type)
      }));

      res.json({
        success: true,
        data: { application: applicationWithDisplay }
      });
    } catch (error) {
      console.error('Get application error:', error);
      res.status(500).json({
        success: false,
        message: 'Ошибка получения заявки'
      });
    }
  }

  static async create(req, res) {
    try {
      const userId = req.user.id;
      const {
        title,
        description,
        serviceType,
        contactFullName,
        contactEmail,
        contactPhone,
        companyName,
        budgetRange
      } = req.body;

      // Валидация типа услуги
      if (serviceType && !Object.values(Application.SERVICE_TYPES).includes(serviceType)) {
        return res.status(400).json({
          success: false,
          message: 'Некорректный тип услуги'
        });
      }

      // Валидация бюджетного диапазона
      if (budgetRange && !Object.values(Application.BUDGET_RANGES).includes(budgetRange)) {
        return res.status(400).json({
          success: false,
          message: 'Некорректный бюджетный диапазон'
        });
      }

      // Используем данные пользователя, если не указаны отдельно
      const applicationData = {
        user_id: userId,
        title,
        description,
        service_type: serviceType,
        contact_full_name: contactFullName || req.user.full_name,
        contact_email: contactEmail || req.user.email,
        contact_phone: contactPhone || req.user.phone,
        company_name: companyName || req.user.company_name,
        budget_range: budgetRange,
        status: Application.STATUSES.DRAFT
      };

      const application = await Application.create(applicationData);

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
    } catch (error) {
      console.error('Create application error:', error);

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
        message: 'Ошибка создания заявки'
      });
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      const updateData = req.body;

      const where = { id };

      // Клиенты могут обновлять только свои черновики
      if (userRole === User.ROLES.CLIENT) {
        where.user_id = userId;
        where.status = Application.STATUSES.DRAFT;
      }
      // Менеджеры могут обновлять назначенные им заявки
      else if (userRole === User.ROLES.MANAGER) {
        where.assigned_to = userId;
        // Менеджеры не могут менять статус на черновик
        if (updateData.status === Application.STATUSES.DRAFT) {
          delete updateData.status;
        }
      }

      const application = await Application.findOne({ where });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена или нельзя обновить'
        });
      }

      // Проверяем возможность редактирования
      if (userRole === User.ROLES.CLIENT && !application.isEditable) {
        return res.status(400).json({
          success: false,
          message: 'Заявка не может быть отредактирована в текущем статусе'
        });
      }

      await application.update(updateData);

      // Обновляем display значения
      const applicationWithDisplay = {
        ...application.toJSON(),
        statusDisplay: application.statusDisplay,
        serviceTypeDisplay: application.serviceTypeDisplay
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

      const where = { id };

      // Клиенты могут удалять только свои черновики
      if (userRole === User.ROLES.CLIENT) {
        where.user_id = userId;
        where.status = Application.STATUSES.DRAFT;
      }
      // Админы могут удалять любые заявки
      else if (userRole !== User.ROLES.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Недостаточно прав для удаления заявки'
        });
      }

      const application = await Application.findOne({ where });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена или нельзя удалить'
        });
      }

      await application.destroy();

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

      const application = await Application.findOne({
        where: {
          id,
          user_id: userId,
          status: Application.STATUSES.DRAFT
        }
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Черновик не найден'
        });
      }

      // Проверяем обязательные поля
      const requiredFields = ['title', 'service_type', 'contact_full_name', 'contact_email', 'contact_phone'];
      const missingFields = requiredFields.filter(field => !application[field]);

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Заполните обязательные поля',
          missingFields: missingFields.map(field => {
            const fieldNames = {
              title: 'Название',
              service_type: 'Тип услуги',
              contact_full_name: 'Контактное лицо',
              contact_email: 'Контактный email',
              contact_phone: 'Контактный телефон'
            };
            return fieldNames[field] || field;
          })
        });
      }

      // Изменяем статус на "отправлено"
      await application.update({
        status: Application.STATUSES.SUBMITTED,
        submitted_at: new Date()
      });

      // Обновляем display значения
      const applicationWithDisplay = {
        ...application.toJSON(),
        statusDisplay: application.statusDisplay,
        serviceTypeDisplay: application.serviceTypeDisplay
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

      // Проверяем доступ к заявке
      const where = { id };
      if (userRole === User.ROLES.CLIENT) {
        where.user_id = userId;
      } else if (userRole === User.ROLES.MANAGER) {
        where.assigned_to = userId;
      }

      const application = await Application.findOne({ where });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена или нет доступа'
        });
      }

      // В реальном приложении здесь будет multer middleware
      // Для примера возвращаем заглушку

      res.json({
        success: true,
        message: 'Файл загружен (заглушка)',
        data: {
          application_id: id,
          uploaded_by: userId,
          uploaded_at: new Date()
        }
      });
    } catch (error) {
      console.error('Upload file error:', error);
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

      // Проверяем доступ к заявке
      const where = { id };
      if (userRole === User.ROLES.CLIENT) {
        where.user_id = userId;
      } else if (userRole === User.ROLES.MANAGER) {
        where.assigned_to = userId;
      }

      const application = await Application.findOne({ where });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена или нет доступа'
        });
      }

      const files = await ApplicationFile.findAll({
        where: { application_id: id },
        order: [['uploaded_at', 'DESC']],
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'full_name', 'email']
        }]
      });

      // Форматируем размеры файлов
      const filesWithDisplay = files.map(file => ({
        ...file.toJSON(),
        sizeFormatted: file.sizeFormatted,
        isImage: file.isImage,
        isDocument: file.isDocument
      }));

      res.json({
        success: true,
        data: { files: filesWithDisplay }
      });
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

      const file = await ApplicationFile.findByPk(fileId, {
        include: [{
          model: Application,
          as: 'application'
        }]
      });

      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'Файл не найден'
        });
      }

      // Проверяем права
      if (userRole === User.ROLES.CLIENT) {
        if (file.application.user_id !== userId || file.uploaded_by !== userId) {
          return res.status(403).json({
            success: false,
            message: 'Нет прав для удаления файла'
          });
        }
      }
      // Менеджеры могут удалять файлы из назначенных им заявок
      else if (userRole === User.ROLES.MANAGER) {
        if (file.application.assigned_to !== userId) {
          return res.status(403).json({
            success: false,
            message: 'Нет прав для удаления файла'
          });
        }
      }

      await file.destroy();

      res.json({
        success: true,
        message: 'Файл удален'
      });
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

      const where = { id };
      if (userRole === User.ROLES.CLIENT) {
        where.user_id = userId;
      } else if (userRole === User.ROLES.MANAGER) {
        where.assigned_to = userId;
      }

      const application = await Application.findOne({ where });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена'
        });
      }

      const transitions = Application.getStatusTransitions(application.status);

      res.json({
        success: true,
        data: {
          current_status: application.status,
          current_status_display: application.statusDisplay,
          available_transitions: transitions.map(status => ({
            value: status,
            label: Application.STATUSES_DISPLAY[status] || status
          }))
        }
      });
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