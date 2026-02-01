const { wrapController } = require('../utils/controller-wrapper.util');
const NotificationService = require('../services/notification.service');

class NotificationController {
  // Получение уведомлений пользователя
  static getNotifications = wrapController(async (req, res) => {
    const userId = req.user.id;
    const filters = req.query;

    const result = await NotificationService.getUserNotifications(userId, filters);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });
  });

  // Отметка уведомления как прочитанного
  static markAsRead = wrapController(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await NotificationService.markAsRead(id, userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json(result);
  });

  // Отметка всех уведомлений как прочитанных
  static markAllAsRead = wrapController(async (req, res) => {
    const userId = req.user.id;
    const filters = req.query;

    const result = await NotificationService.markAllAsRead(userId, filters);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json(result);
  });

  // Удаление уведомления
  static deleteNotification = wrapController(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await NotificationService.deleteNotification(id, userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json(result);
  });

  // Получение количества непрочитанных уведомлений
  static getUnreadCount = wrapController(async (req, res) => {
    const userId = req.user.id;

    const result = await NotificationService.getUnreadCount(userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json(result);
  });
}

module.exports = NotificationController;