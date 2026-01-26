// src/config/seed.js
require('dotenv').config();
const sequelize = require('./sequelize');
const bcrypt = require('bcryptjs');

async function seedDatabase() {
  console.log('🌱 Начинаю сидинг базы данных...');
  
  try {
    // 1. Подключаемся к БД
    await sequelize.authenticate();
    console.log('✅ Подключение к БД установлено');
    
    // 2. Синхронизируем модели (создаем таблицы)
    await sequelize.sync({ alter: true });
    console.log('✅ Модели синхронизированы');
    
    // 3. Импортируем модели ПОСЛЕ синхронизации
    const { User, Application, StatusHistory } = require('../models');
    
    // 4. Проверяем, есть ли уже пользователи
    const userCount = await User.count();
    
    if (userCount > 0) {
      console.log('⚠️  В базе уже есть данные, пропускаем сидинг');
      return;
    }
    
    console.log('📝 Создаю тестовых пользователей...');
    
    // 5. СОЗДАЕМ КАЖДОГО ПОЛЬЗОВАТЕЛЯ ПО ОТДЕЛЬНОСТИ, чтобы видеть ошибки
    console.log('\n🔍 Пробуем создать админа...');
    try {
      const admin = await User.create({
        email: 'admin@example.com',
        password: 'admin123',
        full_name: 'Администратор Системы',
        phone: '+79991234567',
        company_name: 'WebDev Company',
        is_email_verified: true,
        role: 'admin'
      });
      console.log('✅ Админ создан');
      console.log('  ID:', admin.id);
      console.log('  Email:', admin.email);
      console.log('  Password_hash:', admin.password_hash ? 'есть' : 'нет');
    } catch (error) {
      console.error('❌ Ошибка создания админа:', error.message);
      console.error('Детали:', error.errors || error);
    }
    
    console.log('\n🔍 Пробуем создать менеджера...');
    try {
      const manager = await User.create({
        email: 'manager@example.com',
        password: 'manager123',
        full_name: 'Менеджер Проектов',
        phone: '+79998765432',
        company_name: 'WebDev Company',
        is_email_verified: true,
        role: 'manager'
      });
      console.log('✅ Менеджер создан');
      console.log('  ID:', manager.id);
      console.log('  Email:', manager.email);
    } catch (error) {
      console.error('❌ Ошибка создания менеджера:', error.message);
      console.error('Детали:', error.errors || error);
    }
    
    console.log('\n🔍 Пробуем создать клиента...');
    try {
      const client = await User.create({
        email: 'client@example.com',
        password: 'client123',
        full_name: 'Иван Иванов',
        phone: '+79161234567',
        company_name: 'ТехноКорп',
        is_email_verified: true,
        role: 'client'
      });
      console.log('✅ Клиент создан');
      console.log('  ID:', client.id);
      console.log('  Email:', client.email);
      
      // Получаем всех пользователей для создания заявок
      const admin = await User.findOne({ where: { email: 'admin@example.com' } });
      const manager = await User.findOne({ where: { email: 'manager@example.com' } });
      
      if (!admin || !manager || !client) {
        throw new Error('Не все пользователи созданы');
      }
      
      console.log('\n📋 Создаю тестовые заявки...');
      
      // 6. Создаем заявки по одной
      const app1 = await Application.create({
        user_id: client.id,
        title: 'Разработка корпоративного сайта',
        description: 'Нужен современный корпоративный сайт с каталогом продукции и системой заказов.',
        service_type: 'corporate_site',
        contact_full_name: 'Иван Иванов',
        contact_email: 'client@example.com',
        contact_phone: '+79161234567',
        company_name: 'ТехноКорп',
        budget_range: '100k_300k',
        status: 'in_review',
        priority: 'high',
        assigned_to: manager.id,
        submitted_at: new Date()
      });
      console.log('✅ Заявка 1 создана:', app1.title);
      
      const app2 = await Application.create({
        user_id: client.id,
        title: 'Лендинг для нового продукта',
        description: 'Одностраничный сайт для продвижения нового программного продукта.',
        service_type: 'landing_page',
        contact_full_name: 'Иван Иванов',
        contact_email: 'client@example.com',
        contact_phone: '+79161234567',
        company_name: 'ТехноКорп',
        budget_range: 'under_50k',
        status: 'in_progress',
        priority: 'normal',
        assigned_to: manager.id,
        submitted_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      });
      console.log('✅ Заявка 2 создана:', app2.title);
      
      // 7. Создаем историю статусов
      console.log('\n📜 Создаю историю статусов...');
      
      await StatusHistory.create({
        application_id: app1.id,
        old_status: null,
        new_status: 'draft',
        changed_by: client.id,
        comment: 'Заявка создана'
      });
      
      await StatusHistory.create({
        application_id: app1.id,
        old_status: 'draft',
        new_status: 'submitted',
        changed_by: client.id,
        comment: 'Заявка отправлена на рассмотрение'
      });
      
      await StatusHistory.create({
        application_id: app1.id,
        old_status: 'submitted',
        new_status: 'in_review',
        changed_by: manager.id,
        comment: 'Заявка взята в работу менеджером'
      });
      
      console.log('✅ История статусов создана');
      
      console.log('\n🎉 Сидинг завершен успешно!');
      console.log('\n👥 Тестовые пользователи:');
      console.log('Админ: admin@example.com / admin123');
      console.log('Менеджер: manager@example.com / manager123');
      console.log('Клиент: client@example.com / client123');
      
    } catch (error) {
      console.error('❌ Ошибка создания клиента или заявок:', error.message);
      console.error('Детали:', error.errors || error);
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка при сидинге:', error.message);
    console.error('Стек:', error.stack);
  }
}

// Если файл запущен напрямую
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('\n✅ Готово!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Сидинг завершился с ошибкой');
      process.exit(1);
    });
}

module.exports = seedDatabase;