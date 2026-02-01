const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ApplicationFile } = require('../models');

// Создаем директорию для загрузки файлов, если её нет
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка хранилища multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Сохраняем файлы в основную директорию uploads
    // Перемещение в папку с названием заявки будет происходить в сервисе
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);

    // Проверяем и корректируем имя файла, если оно содержит неправильно закодированные символы
    let originalName = file.originalname;
    try {
      if (/[\u0080-\u00ff]/.test(originalName)) {
        originalName = Buffer.from(originalName, 'binary').toString('utf8');
      }
    } catch (error) {
      console.error('Error processing filename:', error);
    }

    // Сохраняем оригинальное имя в req для дальнейшего использования
    if (!req.filesInfo) req.filesInfo = {};
    req.filesInfo[file.fieldname] = { originalname: originalName };

    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Фильтр файлов
const fileFilter = (req, file, cb) => {
  // Проверяем MIME-тип файла
  if (!ApplicationFile.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Неподдерживаемый тип файла: ${file.mimetype}`), false);
  }

  // Проверяем расширение файла для дополнительной безопасности
  const allowedExtensions = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'application/zip': ['.zip'],
    'application/x-rar-compressed': ['.rar']
  };

  const fileExtension = path.extname(file.originalname).toLowerCase();
  const allowedExts = allowedExtensions[file.mimetype];

  if (!allowedExts || !allowedExts.includes(fileExtension)) {
    return cb(new Error(`Неподдерживаемое расширение файла: ${fileExtension} для типа ${file.mimetype}`), false);
  }

  // Проверяем размер файла
  // multer не предоставляет информацию о размере файла в fileFilter
  // но мы можем проверить это в контроллере
  cb(null, true);
};

// Ограничение размера файла
const maxSize = ApplicationFile.MAX_FILE_SIZE; // 10MB

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: maxSize
  }
});

// Middleware для загрузки одного файла
const uploadSingleFile = upload.single('file');

// Middleware для загрузки нескольких файлов
const uploadMultipleFiles = upload.array('files', 10); // максимум 10 файлов

module.exports = {
  uploadSingleFile,
  uploadMultipleFiles,
  // Middleware для проверки размера файла вручную
  validateFileSize: (req, res, next) => {
    if (req.file) {
      if (req.file.size > ApplicationFile.MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          message: `Файл превышает максимальный размер ${ApplicationFile.MAX_FILE_SIZE / (1024 * 1024)}MB`
        });
      }
    } else if (req.files) {
      for (const file of req.files) {
        if (file.size > ApplicationFile.MAX_FILE_SIZE) {
          return res.status(400).json({
            success: false,
            message: `Один из файлов превышает максимальный размер ${ApplicationFile.MAX_FILE_SIZE / (1024 * 1024)}MB`
          });
        }
      }
    }
    next();
  }
};