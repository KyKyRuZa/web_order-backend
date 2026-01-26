const User = require('./User');
const Application = require('./Application');
const ApplicationFile = require('./ApplicationFile');
const StatusHistory = require('./StatusHistory');

User.hasMany(Application, {
  foreignKey: 'user_id',
  as: 'applications',
  onDelete: 'CASCADE'
});

Application.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

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

module.exports = {
  User,
  Application,
  ApplicationFile,
  StatusHistory
};