const User = require('./User');
const Application = require('./Application');
const ApplicationFile = require('./ApplicationFile');
const ApplicationNote = require('./ApplicationNote');
const StatusHistory = require('./StatusHistory');
const AuditLog = require('./AuditLog');
const Notification = require('./Notification');

// Отношения пользователей и заявок
User.hasMany(Application, {
  foreignKey: 'user_id',
  as: 'applications',
  onDelete: 'CASCADE'
});

Application.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Отношения истории статусов
StatusHistory.belongsTo(Application, {
  foreignKey: 'application_id',
  as: 'application'
});

StatusHistory.belongsTo(User, {
  foreignKey: 'changed_by',
  as: 'changer'
});

Application.hasMany(StatusHistory, {
  foreignKey: 'application_id',
  as: 'status_history',
  onDelete: 'CASCADE'
});

// Отношения файлов заявок
Application.hasMany(ApplicationFile, {
  foreignKey: 'application_id',
  as: 'files',
  onDelete: 'CASCADE'
});

ApplicationFile.belongsTo(Application, {
  foreignKey: 'application_id',
  as: 'application'
});

ApplicationFile.belongsTo(User, {
  foreignKey: 'uploaded_by',
  as: 'uploader'
});

User.hasMany(ApplicationFile, {
  foreignKey: 'uploaded_by',
  as: 'uploaded_files'
});

// Назначение менеджера
Application.belongsTo(User, {
  foreignKey: 'assigned_to',
  as: 'assignee'
});

User.hasMany(Application, {
  foreignKey: 'assigned_to',
  as: 'assigned_applications'
});

// Отношения для заметок к заявкам
Application.hasMany(ApplicationNote, {
  foreignKey: 'application_id',
  as: 'notes',
  onDelete: 'CASCADE'
});

ApplicationNote.belongsTo(Application, {
  foreignKey: 'application_id',
  as: 'application'
});

ApplicationNote.belongsTo(User, {
  foreignKey: 'author_id',
  as: 'author'
});

User.hasMany(ApplicationNote, {
  foreignKey: 'author_id',
  as: 'authored_notes'
});

// Отношения для аудита
AuditLog.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

User.hasMany(AuditLog, {
  foreignKey: 'user_id',
  as: 'auditLogs'
});

// Отношения для уведомлений
User.hasMany(Notification, {
  foreignKey: 'user_id',
  as: 'notifications',
  onDelete: 'CASCADE'
});

Notification.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

module.exports = {
  User,
  Application,
  ApplicationFile,
  ApplicationNote,
  StatusHistory,
  AuditLog,
  Notification
};