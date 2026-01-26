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
    // Создаем поддиректорию для каждой заявки
    const appId = req.params.id;
    const appDir = path.join(uploadDir, appId);
    
    if (!fs.existsSync(appDir)) {
      fs.mkdirSync(appDir, { recursive: true });
    }
    
    cb(null, appDir);
  },
  filename: function (req, file, cb) {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Фильтр файлов
const fileFilter = (req, file, cb) => {
  // Проверяем MIME-тип файла
  if (!ApplicationFile.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Неподдерживаемый тип файла: ${file.mimetype}`), false);
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