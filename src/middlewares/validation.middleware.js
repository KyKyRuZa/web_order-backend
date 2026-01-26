const { body, validationResult } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = {};
    errors.array().forEach(err => {
      if (!extractedErrors[err.path]) {
        extractedErrors[err.path] = [];
      }
      extractedErrors[err.path].push(err.msg);
    });

    res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors: extractedErrors
    });
  };
};

// Правила валидации
const registerValidation = validate([
  body('email')
    .trim()
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный формат email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Пароль обязателен')
    .isLength({ min: 6 }).withMessage('Пароль должен содержать минимум 6 символов'),
  
  body('fullName')
    .trim()
    .notEmpty().withMessage('ФИО обязательно')
    .isLength({ min: 2, max: 100 }).withMessage('ФИО должно содержать от 2 до 100 символов'),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9]\d{1,14}$/).withMessage('Некорректный формат номера телефона'),
  
  body('companyName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Название компании не должно превышать 100 символов')
]);

const loginValidation = validate([
  body('email')
    .trim()
    .notEmpty().withMessage('Email обязателен')
    .isEmail().withMessage('Некорректный формат email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Пароль обязателен')
]);

const updateProfileValidation = validate([
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('ФИО должно содержать от 2 до 100 символов'),
  
  body('phone')
    .optional()
    .matches(/^[\+]?[1-9]\d{1,14}$/).withMessage('Некорректный формат номера телефона'),
  
  body('companyName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Название компании не должно превышать 100 символов')
]);

const changePasswordValidation = validate([
  body('currentPassword')
    .notEmpty().withMessage('Текущий пароль обязателен'),

  body('newPassword')
    .notEmpty().withMessage('Новый пароль обязателен')
    .isLength({ min: 6 }).withMessage('Новый пароль должен содержать минимум 6 символов')
]);

const createApplicationValidation = validate([
  body('title')
    .trim()
    .notEmpty().withMessage('Название обязательно')
    .isLength({ min: 5, max: 200 }).withMessage('Название должно содержать от 5 до 200 символов'),
  
  body('description')
    .optional()
    .isLength({ max: 5000 }).withMessage('Описание не должно превышать 5000 символов'),
  
  body('serviceType')
    .notEmpty().withMessage('Тип услуги обязателен')
    .isIn(Object.values(require('../models').Application.SERVICE_TYPES))
    .withMessage('Некорректный тип услуги'),
  
  body('contactFullName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Контактное лицо должно содержать от 2 до 100 символов'),
  
  body('contactEmail')
    .optional()
    .trim()
    .isEmail().withMessage('Некорректный формат email'),
  
  body('contactPhone')
    .optional()
    .matches(/^[\+]?[1-9]\d{1,14}$/).withMessage('Некорректный формат номера телефона'),
  
  body('companyName')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Название компании не должно превышать 100 символов'),
  
  body('budgetRange')
    .optional()
    .isIn(Object.values(require('../models').Application.BUDGET_RANGES))
    .withMessage('Некорректный бюджетный диапазон')
]);

const updateApplicationStatusValidation = validate([
  body('status')
    .notEmpty().withMessage('Статус обязателен')
    .isIn(Object.values(require('../models').Application.STATUSES))
    .withMessage('Некорректный статус'),
  
  body('comment')
    .optional()
    .isLength({ max: 1000 }).withMessage('Комментарий не должен превышать 1000 символов')
]);

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  createApplicationValidation,
  updateApplicationStatusValidation,
  validate
};