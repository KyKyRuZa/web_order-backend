const { ApplicationNote, User, Application, AuditLog } = require('../models');
const { Op } = require('sequelize');
const { wrapController } = require('../utils/controller-wrapper.util');
const NoteService = require('../services/note.service');

class NoteController {
  // Создание новой заметки
  static create = wrapController(async (req, res) => {
    const { applicationId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { content, noteType, isPinned } = req.body;

    // Подготовим данные для создания заметки
    const noteData = {
      content,
      noteType,
      isPinned,
      ip: (() => {
        const { isValidIP } = require('../utils/ip-validator.util');
        if (isValidIP(req.ip)) return req.ip;
        if (isValidIP(req.connection?.remoteAddress)) return req.connection.remoteAddress;
        if (isValidIP(req.socket?.remoteAddress)) return req.socket.remoteAddress;
        return null;
      })(),
      userAgent: req.headers['user-agent']
    };

    const result = await NoteService.createNote(applicationId, userId, userRole, noteData);

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.status(201).json(result);
  })

  // Получение всех заметок для заявки
  static getByApplication = wrapController(async (req, res) => {
    const { applicationId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { noteType, isPinned, page = 1, limit = 20 } = req.query;

    const filters = {
      noteType,
      isPinned,
      page,
      limit
    };

    const result = await NoteService.getNotesByApplication(applicationId, userId, userRole, filters);

    if (result.error) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }

    res.json(result);
  })

  // Обновление заметки
  static update = wrapController(async (req, res) => {
    const { noteId } = req.params;
    const userId = req.user.id;
    const { content, noteType, isPinned } = req.body;

    const updateData = {
      content,
      noteType,
      isPinned,
      ip: (() => {
        const { isValidIP } = require('../utils/ip-validator.util');
        if (isValidIP(req.ip)) return req.ip;
        if (isValidIP(req.connection?.remoteAddress)) return req.connection.remoteAddress;
        if (isValidIP(req.socket?.remoteAddress)) return req.socket.remoteAddress;
        return null;
      })(),
      userAgent: req.headers['user-agent']
    };

    const result = await NoteService.updateNote(noteId, userId, updateData);

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json(result);
  })

  // Удаление заметки
  static delete = wrapController(async (req, res) => {
    const { noteId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await NoteService.deleteNote(noteId, userId, userRole);

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json(result);
  })

  // Получение одной заметки по ID
  static getById = wrapController(async (req, res) => {
    const { noteId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await NoteService.getNoteById(noteId, userId, userRole);

    if (result.error) {
      return res.status(404).json({
        success: false,
        message: result.error
      });
    }

    res.json(result);
  })

  // Закрепление/открепление заметки
  static togglePin = wrapController(async (req, res) => {
    const { noteId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const updateData = {
      ip: (() => {
        const { isValidIP } = require('../utils/ip-validator.util');
        if (isValidIP(req.ip)) return req.ip;
        if (isValidIP(req.connection?.remoteAddress)) return req.connection.remoteAddress;
        if (isValidIP(req.socket?.remoteAddress)) return req.socket.remoteAddress;
        return null;
      })(),
      userAgent: req.headers['user-agent']
    };

    const result = await NoteService.togglePin(noteId, userId, userRole, updateData);

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json(result);
  })

  // Получение статистики заметок
  static getStats = wrapController(async (req, res) => {
    const { applicationId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const result = await NoteService.getNotesStats(applicationId, userId, userRole);

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error
      });
    }

    res.json(result);
  })
}

module.exports = NoteController;