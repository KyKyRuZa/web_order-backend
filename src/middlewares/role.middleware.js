const { User } = require('../models');

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Требуется авторизация'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав. Требуемая роль: ' + roles.join(', ')
      });
    }
    
    next();
  };
};

// Специальные middleware для разных ролей
const requireAdmin = requireRole([User.ROLES.ADMIN, User.ROLES.SUPER_ADMIN]);
const requireManager = requireRole([
  User.ROLES.MANAGER,
  User.ROLES.ADMIN,
  User.ROLES.SUPER_ADMIN
]);
const requireClient = requireRole([User.ROLES.CLIENT]);
const requireAdminOnly = requireRole([User.ROLES.ADMIN, User.ROLES.SUPER_ADMIN]); // Только админ или суперадмин
const requireSuperAdmin = requireRole([User.ROLES.SUPER_ADMIN]);

// Проверка, что пользователь не редактирует сам себя
const notSelfAction = (req, res, next) => {
  const targetId = req.params.id;
  const userId = req.user.id;
  
  if (targetId === userId) {
    return res.status(400).json({
      success: false,
      message: 'Нельзя выполнять действие над самим собой'
    });
  }
  
  next();
};

// Проверка, что пользователь имеет доступ к заявке
const checkApplicationAccess = (req, res, next) => {
  const applicationId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;
  
  // Проверяем доступ в контроллере
  next();
};

module.exports = {
  requireRole,
  requireAdmin,
  requireManager,
  requireClient,
  requireAdminOnly,
  requireSuperAdmin,
  notSelfAction,
  checkApplicationAccess
};