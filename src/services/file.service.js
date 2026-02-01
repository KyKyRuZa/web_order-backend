const { ApplicationFile, User, Application, AuditLog } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

class FileService {
  // Загрузка файла к заявке
  static async uploadFile(applicationId, userId, userRole, file, additionalData = {}, req = null) {
    // Проверяем доступ к заявке
    let application;
    if (userRole === User.ROLES.CLIENT) {
      application = await Application.findOne({
        where: { id: applicationId, user_id: userId }
      });
    } else if (userRole === User.ROLES.MANAGER || userRole === User.ROLES.ADMIN || userRole === User.ROLES.SUPER_ADMIN) {
      // Менеджеры и админы могут загружать файлы к любым заявкам
      application = await Application.findByPk(applicationId);
    }

    if (!application) {
      return { error: 'Заявка не найдена или нет доступа' };
    }

    // Проверяем, был ли файл загружен
    if (!file) {
      return { error: 'Файл обязателен для загрузки' };
    }

    // Проверяем размер файла
    if (file.size > ApplicationFile.MAX_FILE_SIZE) {
      return { error: `Файл превышает максимальный размер ${ApplicationFile.MAX_FILE_SIZE / (1024 * 1024)}MB` };
    }

    // Проверяем MIME-тип
    if (!ApplicationFile.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return { error: `Неподдерживаемый тип файла: ${file.mimetype}` };
    }

    // Проверяем категорию файла
    const { category, description } = additionalData;
    if (category && !Object.values(ApplicationFile.FILE_CATEGORIES).includes(category)) {
      return { error: 'Некорректная категория файла' };
    }

    // Получаем название заявки для создания структуры папок
    const appName = application.title.replace(/[<>:"/\\|?*]/g, '_').substring(0, 100); // Ограничиваем длину и убираем недопустимые символы

    // Используем корректно обработанное имя файла из middleware, если оно доступно
    let originalFilename = file.originalname;

    // Проверяем, есть ли корректно обработанное имя в req
    if (req && req.filesInfo && req.filesInfo.file) {
      originalFilename = req.filesInfo.file.originalname || file.originalname;
    } else {
      // Декодируем оригинальное имя файла, если оно закодировано неправильно
      try {
        // Проверяем, не закодировано ли имя файла в неправильной кодировке
        if (/[\u0080-\u00ff]/.test(originalFilename)) {
          // Если имя содержит символы в диапазоне, характерном для неправильно декодированной кириллицы
          originalFilename = Buffer.from(originalFilename, 'binary').toString('utf8');
        }
      } catch (error) {
        console.error('Error decoding filename:', error);
      }
    }

    // Формируем новый путь для файла с использованием названия заявки
    const appDir = path.join(path.dirname(file.path), appName);
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }

    // Формируем путь к новому файлу с оригинальным именем
    const newFilePath = path.join(appDir, originalFilename);

    // Переименовываем файл
    fs.renameSync(file.path, newFilePath);

    // Сохраняем информацию о файле в базе данных
    const fileRecord = await ApplicationFile.create({
      application_id: application.id,
      uploaded_by: userId,
      filename: path.basename(newFilePath), // Только имя файла
      original_name: originalFilename, // Используем корректно декодированное имя
      mime_type: file.mimetype,
      size: file.size,
      storage_path: newFilePath, // Полный путь к файлу
      file_category: category || ApplicationFile.FILE_CATEGORIES.OTHER,
      description: description || null
    });

    // Записываем событие в аудит
    await AuditLog.logAction({
      action: AuditLog.ACTIONS.FILE_UPLOAD,
      userId: userId,
      targetEntity: 'application_file',
      targetId: fileRecord.id,
      newValue: fileRecord.toJSON(),
      ipAddress: (() => {
        const { isValidIP } = require('../utils/ip-validator.util');
        if (additionalData.ip && isValidIP(additionalData.ip)) return additionalData.ip;
        return null;
      })(),
      userAgent: additionalData.userAgent
    });

    return {
      success: true,
      message: 'Файл успешно загружен',
      data: {
        file: {
          id: fileRecord.id,
          filename: fileRecord.filename,
          original_name: fileRecord.original_name,
          mime_type: fileRecord.mime_type,
          size: fileRecord.size,
          size_formatted: fileRecord.sizeFormatted,
          file_category: fileRecord.file_category,
          description: fileRecord.description,
          uploaded_at: fileRecord.uploaded_at,
          is_image: fileRecord.isImage,
          is_document: fileRecord.isDocument
        }
      }
    };
  }

  // Получение файлов заявки
  static async getFiles(applicationId, userId, userRole) {
    let application = null;

    if (userRole === User.ROLES.CLIENT) {
      // Клиенты могут видеть только свои заявки
      application = await Application.findOne({
        where: { id: applicationId, user_id: userId }
      });
    } else if (userRole === User.ROLES.MANAGER) {
      // Менеджеры могут видеть файлы для заявок, к которым у них есть доступ
      application = await Application.findOne({
        where: { id: applicationId, assigned_to: userId }
      });

      // Если не нашли по основным критериям, предоставим менеджеру доступ ко всем заявкам
      if (!application) {
        application = await Application.findByPk(applicationId);
      }
    } else if (userRole === User.ROLES.ADMIN || userRole === User.ROLES.SUPER_ADMIN) {
      // Администраторы могут видеть файлы для всех заявок
      application = await Application.findByPk(applicationId);
    }

    if (!application) {
      return { error: 'Заявка не найдена или нет доступа' };
    }

    const files = await ApplicationFile.findAll({
      where: { application_id: applicationId },
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

    return {
      success: true,
      data: { files: filesWithDisplay }
    };
  }

  // Удаление файла
  static async deleteFile(fileId, userId, userRole, req) {
    // Сначала проверяем, принадлежит ли файл заявке, к которой у пользователя есть доступ
    let file;
    if (userRole === User.ROLES.CLIENT) {
      // Клиенты могут удалять файлы только из своих заявок
      file = await ApplicationFile.findOne({
        where: { id: fileId },
        include: [{
          model: Application,
          as: 'application',
          where: { user_id: userId },
          attributes: [] // Не включаем атрибуты приложения в результат, чтобы не перезаписать их
        }],
        attributes: { include: [[require('sequelize').col('application.user_id'), 'application_user_id']] }
      });

      if (!file) {
        return { error: 'Файл не найден или нет доступа' };
      }

      // Клиенты могут удалять только файлы, которые они загрузили
      if (file.uploaded_by !== userId) {
        return { error: 'Нет прав для удаления файла' };
      }
    } else if (userRole === User.ROLES.MANAGER) {
      // Менеджеры могут удалять файлы из любых заявок (в соответствии с документацией)
      file = await ApplicationFile.findByPk(fileId, {
        include: [{
          model: Application,
          as: 'application'
        }]
      });

      if (!file) {
        return { error: 'Файл не найден' };
      }
    } else if (userRole === User.ROLES.ADMIN || userRole === User.ROLES.SUPER_ADMIN) {
      // Администраторы могут удалять любые файлы
      file = await ApplicationFile.findByPk(fileId, {
        include: [{
          model: Application,
          as: 'application'
        }]
      });

      if (!file) {
        return { error: 'Файл не найден' };
      }
    }

    // Сохраняем данные для аудита перед удалением
    const fileData = { ...file.toJSON() };

    // Удаляем файл с диска перед удалением записи из базы
    if (file.storage_path && fs.existsSync(file.storage_path)) {
      try {
        fs.unlinkSync(file.storage_path);
      } catch (err) {
        console.error('Error deleting file from disk:', err);
        // Не прерываем операцию удаления из базы, даже если не удалось удалить файл с диска
      }
    }

    await file.destroy();

    // Записываем событие в аудит
    await AuditLog.logAction({
      action: AuditLog.ACTIONS.FILE_DELETE,
      userId: userId,
      targetEntity: 'application_file',
      targetId: file.id,
      oldValue: fileData,
      ipAddress: (() => {
        const { isValidIP } = require('../utils/ip-validator.util');
        if (isValidIP(req.ip)) return req.ip;
        if (isValidIP(req.connection?.remoteAddress)) return req.connection.remoteAddress;
        if (isValidIP(req.socket?.remoteAddress)) return req.socket.remoteAddress;
        return null;
      })(),
      userAgent: req.headers['user-agent']
    });

    return {
      success: true,
      message: 'Файл удален'
    };
  }

  // Получение файла по ID
  static async getFileById(fileId, userId, userRole) {
    const file = await ApplicationFile.findByPk(fileId, {
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'full_name', 'email']
        },
        {
          model: Application,
          as: 'application',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email']
          }]
        }
      ]
    });

    if (!file) {
      return { error: 'Файл не найден' };
    }

    // Проверяем доступ к файлу
    const application = file.application;
    let hasAccess = false;

    if (userRole === User.ROLES.ADMIN || userRole === User.ROLES.SUPER_ADMIN) {
      hasAccess = true;
    } else if (userRole === User.ROLES.MANAGER) {
      // Менеджер имеет доступ, если заявка назначена ему или он автор файла
      hasAccess = application.assigned_to === userId || file.uploaded_by === userId;
    } else if (userRole === User.ROLES.CLIENT) {
      // Клиент имеет доступ, если он автор заявки или автор файла
      hasAccess = application.user_id === userId || file.uploaded_by === userId;
    }

    if (!hasAccess) {
      return { error: 'Нет доступа к этому файлу' };
    }

    return {
      success: true,
      data: {
        file: {
          ...file.toJSON(),
          sizeFormatted: file.sizeFormatted,
          isImage: file.isImage,
          isDocument: file.isDocument
        }
      }
    };
  }

  // Проверка прав доступа к файлу
  static async hasAccessToFile(fileId, userId, userRole) {
    const file = await ApplicationFile.findByPk(fileId, {
      include: [{
        model: Application,
        as: 'application'
      }]
    });

    if (!file) {
      return false;
    }

    const application = file.application;
    let hasAccess = false;

    if (userRole === User.ROLES.ADMIN || userRole === User.ROLES.SUPER_ADMIN) {
      hasAccess = true;
    } else if (userRole === User.ROLES.MANAGER) {
      hasAccess = application.assigned_to === userId || file.uploaded_by === userId;
    } else if (userRole === User.ROLES.CLIENT) {
      hasAccess = application.user_id === userId || file.uploaded_by === userId;
    }

    return hasAccess;
  }

  // Получение статистики файлов
  static async getFilesStats(applicationId, userId, userRole) {
    let where = {};
    
    if (userRole === User.ROLES.CLIENT) {
      where = { '$application.user_id$': userId };
    } else if (userRole === User.ROLES.MANAGER) {
      where = { '$application.assigned_to$': userId };
    }

    if (applicationId) {
      where.application_id = applicationId;
    }

    const totalFiles = await ApplicationFile.count({ where });
    const totalSize = await ApplicationFile.sum('size', { where }) || 0;
    const filesByCategory = await ApplicationFile.findAll({
      attributes: ['file_category', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
      where,
      group: ['file_category']
    });

    return {
      success: true,
      data: {
        total_files: totalFiles,
        total_size: totalSize,
        total_size_formatted: FileService.formatFileSize(totalSize),
        by_category: filesByCategory.map(cat => ({
          category: cat.file_category,
          count: parseInt(cat.dataValues.count)
        }))
      }
    };
  }

  // Форматирование размера файла
  static formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${Math.round(size * 100) / 100} ${units[unitIndex]}`;
  }

  // Удаление файла с диска
  static async deleteFileFromDisk(filePath) {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        return true;
      } catch (error) {
        console.error('Error deleting file from disk:', error);
        return false;
      }
    }
    return true; // Файл уже удален или не существует
  }
}

module.exports = FileService;