const { Application, ApplicationFile, User } = require('../models');

class ApplicationController {
  static async getAll(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      
      let where = {};
      
      // Клиенты видят только свои заявки
      if (userRole === 'client') {
        where.user_id = userId;
      }
      // Менеджеры и админы могут фильтровать
      else {
        const { userId: filterUserId, status, serviceType } = req.query;
        if (filterUserId) where.user_id = filterUserId;
        if (status) where.status = status;
        if (serviceType) where.service_type = serviceType;
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

      res.json({
        success: true,
        data: { applications }
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
      if (userRole === 'client') {
        where.user_id = userId;
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
            attributes: ['id', 'original_name', 'file_category', 'uploaded_at', 'size']
          }
        ]
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена'
        });
      }

      res.json({
        success: true,
        data: { application }
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
        status: 'draft'
      };

      const application = await Application.create(applicationData);

      res.status(201).json({
        success: true,
        message: 'Заявка создана',
        data: { application }
      });
    } catch (error) {
      console.error('Create application error:', error);
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
      if (userRole === 'client') {
        where.user_id = userId;
        where.status = 'draft';
      }

      const application = await Application.findOne({ where });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Заявка не найдена или нельзя обновить'
        });
      }

      await application.update(updateData);

      res.json({
        success: true,
        message: 'Заявка обновлена',
        data: { application }
      });
    } catch (error) {
      console.error('Update application error:', error);
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
      if (userRole === 'client') {
        where.user_id = userId;
        where.status = 'draft';
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
          status: 'draft'
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
          missingFields
        });
      }

      // Изменяем статус на "отправлено"
      await application.update({ status: 'submitted' });

      res.json({
        success: true,
        message: 'Заявка отправлена на рассмотрение',
        data: { application }
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

      // В реальном приложении здесь будет multer middleware
      // Для теста просто логируем
      console.log('File upload request for application:', id);
      
      res.json({
        success: true,
        message: 'Файл загружен (заглушка)'
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

      const where = { application_id: id };
      
      // Клиенты могут видеть файлы только своих заявок
      if (userRole === 'client') {
        const application = await Application.findOne({
          where: { id, user_id: userId }
        });
        
        if (!application) {
          return res.status(404).json({
            success: false,
            message: 'Заявка не найдена'
          });
        }
      }

      const files = await ApplicationFile.findAll({
        where,
        order: [['uploaded_at', 'DESC']]
      });

      res.json({
        success: true,
        data: { files }
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
      if (userRole === 'client') {
        if (file.application.user_id !== userId || file.uploaded_by !== userId) {
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
}

module.exports = ApplicationController;