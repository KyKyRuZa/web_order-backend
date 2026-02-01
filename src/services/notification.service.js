const { Notification, User, Application } = require('../models');
const { Op } = require('sequelize');

class NotificationService {
  // Создание уведомления
  static async createNotification(userId, type, message, metadata = {}) {
    try {
      const notification = await Notification.create({
        user_id: userId,
        type,
        message,
        metadata
      });

      return {
        success: true,
        data: notification
      };
    } catch (error) {
      console.error('Create notification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Получение уведомлений пользователя
  static async getUserNotifications(userId, filters = {}) {
    try {
      const { type, isRead, page = 1, limit = 20 } = filters;

      const where = { user_id: userId };

      if (type) {
        where.type = type;
      }

      if (isRead !== undefined) {
        where.is_read = isRead === 'true' || isRead === true;
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows: notifications } = await Notification.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']]
      });

      return {
        success: true,
        data: {
          notifications: notifications.map(n => n.displayInfo),
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: Math.ceil(count / limit),
            has_next: offset + parseInt(limit) < count,
            has_prev: offset > 0
          }
        }
      };
    } catch (error) {
      console.error('Get user notifications error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Отметка уведомления как прочитанного
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, user_id: userId }
      });

      if (!notification) {
        return {
          success: false,
          error: 'Уведомление не найдено или нет доступа'
        };
      }

      await notification.update({ is_read: true });

      return {
        success: true,
        message: 'Уведомление отмечено как прочитанное'
      };
    } catch (error) {
      console.error('Mark notification as read error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Отметка всех уведомлений пользователя как прочитанных
  static async markAllAsRead(userId, filters = {}) {
    try {
      const where = { user_id: userId };

      if (filters.type) {
        where.type = filters.type;
      }

      await Notification.update(
        { is_read: true },
        { where: { ...where, is_read: false } }
      );

      return {
        success: true,
        message: 'Все уведомления отмечены как прочитанные'
      };
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Удаление уведомления
  static async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, user_id: userId }
      });

      if (!notification) {
        return {
          success: false,
          error: 'Уведомление не найдено или нет доступа'
        };
      }

      await notification.destroy();

      return {
        success: true,
        message: 'Уведомление удалено'
      };
    } catch (error) {
      console.error('Delete notification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Создание уведомления о смене статуса
  static async createStatusChangeNotification(application, changedByUser, oldStatus, newStatus) {
    try {
      // Находим владельца заявки
      const owner = await User.findByPk(application.user_id);

      if (!owner) {
        return { success: false, error: 'Владелец заявки не найден' };
      }

      // Формируем сообщение
      const message = `Менеджер ${changedByUser.full_name} изменил статус вашей заявки "${application.title}" с "${oldStatus}" на "${newStatus}"`;

      // Создаем уведомление
      const result = await NotificationService.createNotification(
        owner.id,
        Notification.TYPES.STATUS_CHANGED,
        message,
        {
          application_id: application.id,
          application_title: application.title,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by: changedByUser.full_name,
          changed_by_id: changedByUser.id
        }
      );

      return result;
    } catch (error) {
      console.error('Create status change notification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Создание уведомления о добавлении заметки
  static async createNoteAddedNotification(application, noteAuthor, noteContent) {
    try {
      // Находим владельца заявки
      const owner = await User.findByPk(application.user_id);

      if (!owner) {
        return { success: false, error: 'Владелец заявки не найден' };
      }

      // Формируем сообщение
      const message = `Менеджер ${noteAuthor.full_name} добавил заметку к вашей заявке "${application.title}"`;

      // Создаем уведомление
      const result = await NotificationService.createNotification(
        owner.id,
        Notification.TYPES.NOTE_ADDED,
        message,
        {
          application_id: application.id,
          application_title: application.title,
          note_author: noteAuthor.full_name,
          note_author_id: noteAuthor.id,
          note_content: noteContent.substring(0, 100) + (noteContent.length > 100 ? '...' : '') // Обрезаем для уведомления
        }
      );

      return result;
    } catch (error) {
      console.error('Create note added notification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Получение количества непрочитанных уведомлений
  static async getUnreadCount(userId) {
    try {
      const count = await Notification.count({
        where: {
          user_id: userId,
          is_read: false
        }
      });

      return {
        success: true,
        data: { unread_count: count }
      };
    } catch (error) {
      console.error('Get unread notifications count error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = NotificationService;