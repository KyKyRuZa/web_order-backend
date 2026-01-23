const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const UserController = require('../controllers/user.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation
} = require('../middlewares/validation.middleware');

// Публичные маршруты
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.get('/verify-email/:token', AuthController.verifyEmail);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password/:token', AuthController.resetPassword);

// Защищенные маршруты (требуют аутентификации)
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/profile', authMiddleware, AuthController.getProfile);
router.put('/profile', authMiddleware, updateProfileValidation, UserController.updateProfile);
router.put('/change-password', authMiddleware, UserController.changePassword);
router.get('/applications', authMiddleware, UserController.getMyApplications);
router.delete('/deactivate', authMiddleware, UserController.deactivateAccount);

module.exports = router;