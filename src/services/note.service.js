const { ApplicationNote, User, Application, AuditLog } = require('../models');
const { Op } = require('sequelize');

class NoteService {
  // Создание новой заметки
  static async createNote(applicationId, userId, userRole, noteData) {
    // Проверяем, существует ли заявка и есть ли к ней доступ
    let application;
    if (userRole === User.ROLES.CLIENT) {
      // Клиенты могут добавлять заметки только к своим заявкам
      application = await Application.findOne({
        where: { id: applicationId, user_id: userId }
      });
    } else if (userRole === User.ROLES.MANAGER || userRole === User.ROLES.ADMIN || userRole === User.ROLES.SUPER_ADMIN) {
      // Менеджеры и админы могут добавлять заметки к любым заявкам
      application = await Application.findByPk(applicationId);
    }

    if (!application) {
      return { error: 'Заявка не найдена или у вас нет к ней доступа' };
    }

    // Валидация типа заметки
    if (noteData.noteType && !Object.values(ApplicationNote.NOTE_TYPES).includes(noteData.noteType)) {
      return { error: 'Некорректный тип заметки' };
    }

    // Создаем заметку
    const note = await ApplicationNote.create({
      application_id: applicationId,
      author_id: userId,
      content: noteData.content,
      note_type: noteData.noteType || ApplicationNote.NOTE_TYPES.INTERNAL,
      is_pinned: Boolean(noteData.isPinned)
    });

    // Записываем событие в аудит
    await AuditLog.logAction({
      action: AuditLog.ACTIONS.NOTE_CREATE,
      userId: userId,
      targetEntity: 'application_note',
      targetId: note.id,
      newValue: note.toJSON(),
      ipAddress: (() => {
        const { isValidIP } = require('../utils/ip-validator.util');
        if (noteData.ip && isValidIP(noteData.ip)) return noteData.ip;
        return null;
      })(),
      userAgent: noteData.userAgent
    });

    // Включаем информацию об авторе в ответ
    const noteWithAuthor = await ApplicationNote.findByPk(note.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'full_name', 'email']
      }]
    });

    return {
      success: true,
      message: 'Заметка успешно создана',
      data: { note: noteWithAuthor.toDisplayFormat() }
    };
  }

  // Получение всех заметок для заявки
  static async getNotesByApplication(applicationId, userId, userRole, filters = {}) {
    const { noteType, isPinned, page = 1, limit = 20 } = filters;

    // Проверяем доступ к заявке
    let application;
    if (userRole === User.ROLES.CLIENT) {
      // Клиенты могут видеть заметки только к своим заявкам
      application = await Application.findOne({
        where: { id: applicationId, user_id: userId }
      });
    } else if (userRole === User.ROLES.MANAGER || userRole === User.ROLES.ADMIN || userRole === User.ROLES.SUPER_ADMIN) {
      // Менеджеры и админы могут видеть заметки к любым заявкам
      application = await Application.findByPk(applicationId);
    }

    if (!application) {
      return { error: 'Заявка не найдена или у вас нет к ней доступа' };
    }

    // Фильтры для поиска заметок
    const where = { application_id: applicationId };

    if (noteType) {
      where.note_type = noteType;
    }

    if (isPinned !== undefined) {
      where.is_pinned = isPinned === 'true';
    }

    // Пагинация
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: notes } = await ApplicationNote.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['created_at', 'DESC']],
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'full_name', 'email']
      }]
    });

    // Преобразуем заметки в формат отображения
    const notesWithDisplay = notes.map(note => note.toDisplayFormat());

    return {
      success: true,
      data: {
        notes: notesWithDisplay,
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
  }

  // Получение заметки по ID
  static async getNoteById(noteId, userId, userRole) {
    // Находим заметку с информацией о заявке
    const note = await ApplicationNote.findByPk(noteId, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'full_name', 'email']
        },
        {
          model: Application,
          as: 'application',
          include: [{
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email']
          }]
        }
      ]
    });

    if (!note) {
      return { error: 'Заметка не найдена' };
    }

    // Проверяем доступ к заявке, к которой относится заметка
    const application = note.application;
    let hasAccess = false;

    if (userRole === User.ROLES.ADMIN || userRole === User.ROLES.SUPER_ADMIN) {
      hasAccess = true;
    } else if (userRole === User.ROLES.MANAGER) {
      // Менеджер имеет доступ, если заявка назначена ему или он автор заметки
      hasAccess = application.assigned_to === userId || note.author_id === userId;
    } else if (userRole === User.ROLES.CLIENT) {
      // Клиент имеет доступ, если он автор заявки или автор заметки
      hasAccess = application.user_id === userId || note.author_id === userId;
    }

    if (!hasAccess) {
      return { error: 'Нет доступа к этой заметке' };
    }

    return {
      success: true,
      data: { note: note.toDisplayFormat() }
    };
  }

  // Обновление заметки
  static async updateNote(noteId, userId, updateData) {
    // Находим заметку
    const note = await ApplicationNote.findByPk(noteId, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'role']
      }]
    });

    if (!note) {
      return { error: 'Заметка не найдена' };
    }

    // Проверяем права на редактирование
    // Автор может редактировать свои заметки
    // Администраторы могут редактировать любые заметки
    const isOwner = note.author_id === userId;
    const isManagerOrAdmin = note.author.role === User.ROLES.MANAGER || 
                             note.author.role === User.ROLES.ADMIN || 
                             note.author.role === User.ROLES.SUPER_ADMIN;

    if (!isOwner && !isManagerOrAdmin) {
      return { error: 'Нет прав для редактирования этой заметки' };
    }

    // Валидация типа заметки
    if (updateData.noteType && !Object.values(ApplicationNote.NOTE_TYPES).includes(updateData.noteType)) {
      return { error: 'Некорректный тип заметки' };
    }

    // Сохраняем старые значения для аудита
    const oldValues = { ...note.toJSON() };

    // Обновляем заметку
    const updatePayload = {};
    if (updateData.content !== undefined) updatePayload.content = updateData.content;
    if (updateData.noteType !== undefined) updatePayload.note_type = updateData.noteType;
    if (updateData.isPinned !== undefined) updatePayload.is_pinned = Boolean(updateData.isPinned);

    await note.update(updatePayload);

    // Записываем событие в аудит
    await AuditLog.logAction({
      action: AuditLog.ACTIONS.NOTE_UPDATE,
      userId: userId,
      targetEntity: 'application_note',
      targetId: note.id,
      oldValue: oldValues,
      newValue: { ...oldValues, ...updatePayload },
      ipAddress: (() => {
        const { isValidIP } = require('../utils/ip-validator.util');
        if (updateData.ip && isValidIP(updateData.ip)) return updateData.ip;
        return null;
      })(),
      userAgent: updateData.userAgent
    });

    // Возвращаем обновленную заметку
    const updatedNote = await ApplicationNote.findByPk(noteId, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'full_name', 'email']
      }]
    });

    return {
      success: true,
      message: 'Заметка успешно обновлена',
      data: { note: updatedNote.toDisplayFormat() }
    };
  }

  // Удаление заметки
  static async deleteNote(noteId, userId, userRole) {
    // Находим заметку
    const note = await ApplicationNote.findByPk(noteId, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'role']
      }]
    });

    if (!note) {
      return { error: 'Заметка не найдена' };
    }

    // Проверяем права на удаление
    // Автор может удалить свою заметку
    // Администраторы могут удалить любую заметку
    const isOwner = note.author_id === userId;
    const isAdmin = userRole === User.ROLES.ADMIN || userRole === User.ROLES.SUPER_ADMIN;

    if (!isOwner && !isAdmin) {
      return { error: 'Нет прав для удаления этой заметки' };
    }

    // Сохраняем данные для аудита перед удалением
    const noteData = { ...note.toJSON() };

    await note.destroy();

    // Записываем событие в аудит
    await AuditLog.logAction({
      action: AuditLog.ACTIONS.NOTE_DELETE,
      userId: userId,
      targetEntity: 'application_note',
      targetId: note.id,
      oldValue: noteData,
      ipAddress: (() => {
        const { isValidIP } = require('../utils/ip-validator.util');
        if (noteData.ip && isValidIP(noteData.ip)) return noteData.ip;
        return null;
      })(),
      userAgent: noteData.userAgent
    });

    return {
      success: true,
      message: 'Заметка успешно удалена'
    };
  }

  // Закрепление/открепление заметки
  static async togglePin(noteId, userId, userRole) {
    // Находим заметку
    const note = await ApplicationNote.findByPk(noteId);

    if (!note) {
      return { error: 'Заметка не найдена' };
    }

    // Проверяем права
    const isOwner = note.author_id === userId;
    const isManagerOrAdmin = userRole === User.ROLES.MANAGER || 
                             userRole === User.ROLES.ADMIN || 
                             userRole === User.ROLES.SUPER_ADMIN;

    if (!isOwner && !isManagerOrAdmin) {
      return { error: 'Нет прав для изменения статуса закрепления' };
    }

    // Сохраняем старые значения для аудита
    const oldValues = { ...note.toJSON() };

    // Переключаем статус закрепления
    await note.update({ is_pinned: !note.is_pinned });

    // Записываем событие в аудит
    await AuditLog.logAction({
      action: AuditLog.ACTIONS.NOTE_PIN_TOGGLE,
      userId: userId,
      targetEntity: 'application_note',
      targetId: note.id,
      oldValue: oldValues,
      newValue: { ...oldValues, is_pinned: !oldValues.is_pinned },
      ipAddress: (() => {
        const { isValidIP } = require('../utils/ip-validator.util');
        if (updateData.ip && isValidIP(updateData.ip)) return updateData.ip;
        return null;
      })(),
      userAgent: updateData.userAgent
    });

    return {
      success: true,
      message: `Заметка ${note.is_pinned ? 'закреплена' : 'откреплена'}`,
      data: { note: note.toDisplayFormat() }
    };
  }

  // Получение статистики заметок
  static async getNotesStats(applicationId, userId, userRole) {
    let where = {};
    
    if (userRole === User.ROLES.CLIENT) {
      where = { '$application.user_id$': userId };
    } else if (userRole === User.ROLES.MANAGER) {
      where = { '$application.assigned_to$': userId };
    }

    if (applicationId) {
      where.application_id = applicationId;
    }

    const totalNotes = await ApplicationNote.count({ where });
    const notesByType = await ApplicationNote.findAll({
      attributes: ['note_type', [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']],
      where,
      group: ['note_type']
    });
    const pinnedNotes = await ApplicationNote.count({
      where: { ...where, is_pinned: true }
    });

    return {
      success: true,
      data: {
        total_notes: totalNotes,
        pinned_notes: pinnedNotes,
        by_type: notesByType.map(type => ({
          type: type.note_type,
          count: parseInt(type.dataValues.count)
        }))
      }
    };
  }

  // Проверка прав доступа к заметке
  static async hasAccessToNote(noteId, userId, userRole) {
    const note = await ApplicationNote.findByPk(noteId, {
      include: [{
        model: Application,
        as: 'application'
      }]
    });

    if (!note) {
      return false;
    }

    const application = note.application;
    let hasAccess = false;

    if (userRole === User.ROLES.ADMIN || userRole === User.ROLES.SUPER_ADMIN) {
      hasAccess = true;
    } else if (userRole === User.ROLES.MANAGER) {
      // Менеджер имеет доступ, если заявка назначена ему или он автор заметки
      hasAccess = application.assigned_to === userId || note.author_id === userId;
    } else if (userRole === User.ROLES.CLIENT) {
      // Клиент имеет доступ, если он автор заявки или автор заметки
      hasAccess = application.user_id === userId || note.author_id === userId;
    }

    return hasAccess;
  }
}

module.exports = NoteService;