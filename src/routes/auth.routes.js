const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const UserController = require('../controllers/user.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation
} = require('../middlewares/validation.middleware');

// Публичные маршруты
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);
router.get('/verify-email/:token', AuthController.verifyEmail);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password/:token', AuthController.resetPassword);

// Защищенные маршруты (требуют аутентификации)
router.use(authMiddleware);

router.post('/logout', AuthController.logout);
router.get('/profile', AuthController.getProfile);
router.put('/profile', updateProfileValidation, UserController.updateProfile);
router.put('/change-password', changePasswordValidation, UserController.changePassword);
router.get('/applications', UserController.getMyApplications);
router.get('/stats', UserController.getStats);
router.delete('/deactivate', UserController.deactivateAccount);

module.exports = router;