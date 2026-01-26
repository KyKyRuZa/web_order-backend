const winston = require('winston');
const path = require('path');

// Определяем уровни логирования
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Определяем цвета для каждого уровня
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// Добавляем цвета в winston
winston.addColors(colors);

// Формат логов
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Транспорты для логов
const transports = [
  // Консольный транспорт
  new winston.transports.Console(),
  
  // Файловый транспорт для ошибок
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // Файловый транспорт для всех логов
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Создаем логгер
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format,
  transports,
});

// Создаем stream для morgan
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;