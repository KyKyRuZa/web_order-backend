const User = require('./User');
const Application = require('./Application');
const ApplicationFile = require('./ApplicationFile');

// Установка связей
User.hasMany(Application, {
  foreignKey: 'user_id',
  as: 'applications',
  onDelete: 'CASCADE'
});

Application.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
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
  ApplicationFile
};