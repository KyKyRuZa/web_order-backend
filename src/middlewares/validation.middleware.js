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
    .isLength({ min: 8 }).withMessage('Пароль должен содержать минимум 8 символов')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Пароль должен содержать хотя бы одну заглавную букву, одну строчную и одну цифру'),
  
  body('confirmPassword')
    .notEmpty().withMessage('Подтверждение пароля обязательно')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Пароли не совпадают'),
  
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

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation
};