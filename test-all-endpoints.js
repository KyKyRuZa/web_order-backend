#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Конфигурация
const CONFIG = {
  BASE_URL: 'http://localhost:5000/api',
  TEST_USERS: {
    admin: { email: 'admin@example.com', password: 'admin123' },
    manager: { email: 'manager@example.com', password: 'manager123' },
    client: { email: 'client@example.com', password: 'client123' }
  },
  OUTPUT_DIR: './test-results',
  DELAY_BETWEEN_TESTS: 500 // ms
};

// Результаты тестирования
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

// Утилиты
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍'
  }[type];
  
  console.log(`${prefix} [${timestamp}] ${message}`);
};

class APITester {
  constructor() {
    this.client = axios.create({
      baseURL: CONFIG.BASE_URL,
      timeout: 10000
    });
    
    this.tokens = {};
    this.userIds = {};
    this.applicationIds = [];
    this.createdUsers = [];
  }

  async runTest(name, testFn) {
    testResults.total++;
    const startTime = Date.now();
    
    try {
      log(`Запуск теста: ${name}`, 'info');
      await testFn();
      testResults.passed++;
      testResults.details.push({
        name,
        status: 'passed',
        duration: Date.now() - startTime
      });
      log(`Тест пройден: ${name}`, 'success');
    } catch (error) {
      testResults.failed++;
      testResults.details.push({
        name,
        status: 'failed',
        duration: Date.now() - startTime,
        error: error.message
      });
      log(`Тест не пройден: ${name} - ${error.message}`, 'error');
    }
    
    await sleep(CONFIG.DELAY_BETWEEN_TESTS);
  }

  // ==================== Аутентификация ====================

  async testHealthChecks() {
    // 1. Basic health check
    await this.runTest('GET /health', async () => {
      const response = await this.client.get('/health');
      if (response.data.success !== true) throw new Error('Health check failed');
    });

    // 2. Detailed health check
    await this.runTest('GET /health/detailed', async () => {
      const response = await this.client.get('/health/detailed');
      if (response.data.success !== true) throw new Error('Detailed health check failed');
    });

    // 3. Test database
    await this.runTest('GET /test-db', async () => {
      const response = await this.client.get('/test-db');
      if (response.data.success !== true) throw new Error('Database test failed');
    });

    // 4. API version
    await this.runTest('GET /version', async () => {
      const response = await this.client.get('/version');
      if (!response.data.data?.api?.name) throw new Error('Version endpoint failed');
    });
  }

  async testAuthentication() {
    // Регистрация нового пользователя
    await this.runTest('POST /auth/register - new user', async () => {
      const testEmail = `test_${Date.now()}@example.com`;
      const response = await this.client.post('/auth/register', {
        email: testEmail,
        password: 'Test123456',
        fullName: 'Тестовый Пользователь',
        phone: '+79990000001',
        companyName: 'Тестовая компания'
      });
      
      this.createdUsers.push(testEmail);
      
      if (!response.data.success) {
        throw new Error('Registration failed: ' + JSON.stringify(response.data));
      }
    });

    // Вход существующих пользователей
    for (const [role, credentials] of Object.entries(CONFIG.TEST_USERS)) {
      await this.runTest(`POST /auth/login - ${role}`, async () => {
        const response = await this.client.post('/auth/login', credentials);
        
        if (!response.data.success) {
          throw new Error(`Login failed for ${role}: ${response.data.message}`);
        }
        
        this.tokens[role] = response.data.data.tokens.accessToken;
        this.userIds[role] = response.data.data.user.id;
        
        log(`Токен получен для ${role}`, 'success');
      });
    }

    // Получение профиля для каждого пользователя
    for (const role of Object.keys(this.tokens)) {
      await this.runTest(`GET /auth/profile - ${role}`, async () => {
        const response = await this.client.get('/auth/profile', {
          headers: { Authorization: `Bearer ${this.tokens[role]}` }
        });
        
        if (!response.data.success) {
          throw new Error(`Profile fetch failed for ${role}`);
        }
      });
    }
  }

  async testPasswordOperations() {
    // Смена пароля
    await this.runTest('PUT /auth/change-password - client', async () => {
      const response = await this.client.put('/auth/change-password', {
        currentPassword: 'client123',
        newPassword: 'newclient123'
      }, {
        headers: { Authorization: `Bearer ${this.tokens.client}` }
      });
      
      if (!response.data.success) {
        throw new Error('Password change failed');
      }
      
      // Возвращаем старый пароль
      await this.client.put('/auth/change-password', {
        currentPassword: 'newclient123',
        newPassword: 'client123'
      }, {
        headers: { Authorization: `Bearer ${this.tokens.client}` }
      });
    });
  }

  // ==================== Заявки (Applications) ====================

  async testApplications() {
    // Получение всех заявок клиента
    await this.runTest('GET /applications - client', async () => {
      const response = await this.client.get('/applications', {
        headers: { Authorization: `Bearer ${this.tokens.client}` }
      });
      
      if (!response.data.success) {
        throw new Error('Failed to get applications');
      }
      
      // Сохраняем ID заявок для последующих тестов
      if (response.data.data.applications?.length > 0) {
        this.applicationIds = response.data.data.applications.map(app => app.id);
      }
    });

    // Создание новой заявки
    await this.runTest('POST /applications - create new', async () => {
      const response = await this.client.post('/applications', {
        title: 'Тестовая заявка от скрипта',
        description: 'Описание тестовой заявки',
        serviceType: 'corporate_site',
        contactFullName: 'Иван Иванов',
        contactEmail: 'client@example.com',
        contactPhone: '+79161234567',
        companyName: 'ТехноКорп',
        budgetRange: 'under_50k'
      }, {
        headers: { Authorization: `Bearer ${this.tokens.client}` }
      });
      
      if (!response.data.success) {
        throw new Error('Failed to create application');
      }
      
      const newAppId = response.data.data.application.id;
      this.applicationIds.push(newAppId);
      
      // Получение созданной заявки
      await this.runTest(`GET /applications/${newAppId} - get created`, async () => {
        const getResponse = await this.client.get(`/applications/${newAppId}`, {
          headers: { Authorization: `Bearer ${this.tokens.client}` }
        });
        
        if (!getResponse.data.success) {
          throw new Error('Failed to get created application');
        }
      });

      // Получение переходов статуса
      await this.runTest(`GET /applications/${newAppId}/transitions`, async () => {
        const response = await this.client.get(`/applications/${newAppId}/transitions`, {
          headers: { Authorization: `Bearer ${this.tokens.client}` }
        });
        
        if (!response.data.success) {
          throw new Error('Failed to get status transitions');
        }
      });

      // Отправка заявки
      await this.runTest(`POST /applications/${newAppId}/submit`, async () => {
        const response = await this.client.post(`/applications/${newAppId}/submit`, {}, {
          headers: { Authorization: `Bearer ${this.tokens.client}` }
        });
        
        if (!response.data.success) {
          throw new Error('Failed to submit application');
        }
      });

      // Удаление тестовой заявки
      await this.runTest(`DELETE /applications/${newAppId}`, async () => {
        const response = await this.client.delete(`/applications/${newAppId}`, {
          headers: { Authorization: `Bearer ${this.tokens.client}` }
        });
        
        if (!response.data.success) {
          throw new Error('Failed to delete application');
        }
        
        // Удаляем ID из списка
        this.applicationIds = this.applicationIds.filter(id => id !== newAppId);
      });
    });
  }

  // ==================== Админ-панель ====================

  async testAdminPanel() {
    // Получение всех заявок (для менеджера)
    await this.runTest('GET /admin/applications - manager', async () => {
      const response = await this.client.get('/admin/applications', {
        headers: { Authorization: `Bearer ${this.tokens.manager}` }
      });
      
      if (!response.data.success) {
        throw new Error('Manager failed to get applications');
      }
    });

    // Получение всех заявок (для админа)
    await this.runTest('GET /admin/applications - admin', async () => {
      const response = await this.client.get('/admin/applications', {
        headers: { Authorization: `Bearer ${this.tokens.admin}` }
      });
      
      if (!response.data.success) {
        throw new Error('Admin failed to get applications');
      }
    });

    // Получение деталей заявки (если есть заявки)
    if (this.applicationIds.length > 0) {
      const appId = this.applicationIds[0];
      
      await this.runTest(`GET /admin/applications/${appId}`, async () => {
        const response = await this.client.get(`/admin/applications/${appId}`, {
          headers: { Authorization: `Bearer ${this.tokens.manager}` }
        });
        
        if (!response.data.success) {
          throw new Error('Failed to get application details');
        }
      });

      // Изменение статуса заявки
      await this.runTest(`PUT /admin/applications/${appId}/status`, async () => {
        const response = await this.client.put(`/admin/applications/${appId}/status`, {
          status: 'in_review',
          comment: 'Статус изменен автоматическим тестом'
        }, {
          headers: { Authorization: `Bearer ${this.tokens.manager}` }
        });
        
        if (!response.data.success) {
          throw new Error('Failed to update application status');
        }
      });

      // Добавление внутренней заметки
      await this.runTest(`POST /admin/applications/${appId}/notes`, async () => {
        const response = await this.client.post(`/admin/applications/${appId}/notes`, {
          note: 'Тестовая заметка от автоматического теста'
        }, {
          headers: { Authorization: `Bearer ${this.tokens.manager}` }
        });
        
        if (!response.data.success) {
          throw new Error('Failed to add internal note');
        }
      });
    }

    // Статистика дашборда
    await this.runTest('GET /admin/stats/dashboard - manager', async () => {
      const response = await this.client.get('/admin/stats/dashboard', {
        headers: { Authorization: `Bearer ${this.tokens.manager}` }
      });
      
      if (!response.data.success) {
        throw new Error('Failed to get dashboard stats');
      }
    });

    await this.runTest('GET /admin/stats/dashboard - admin', async () => {
      const response = await this.client.get('/admin/stats/dashboard', {
        headers: { Authorization: `Bearer ${this.tokens.admin}` }
      });
      
      if (!response.data.success) {
        throw new Error('Failed to get dashboard stats (admin)');
      }
    });

    // Получение пользователей (только админ)
    await this.runTest('GET /admin/users', async () => {
      const response = await this.client.get('/admin/users', {
        headers: { Authorization: `Bearer ${this.tokens.admin}` }
      });
      
      if (!response.data.success) {
        throw new Error('Failed to get users list');
      }
    });

    // Статистика пользователя
    await this.runTest('GET /auth/stats - client', async () => {
      const response = await this.client.get('/auth/stats', {
        headers: { Authorization: `Bearer ${this.tokens.client}` }
      });
      
      if (!response.data.success) {
        throw new Error('Failed to get user stats');
      }
    });
  }

  async cleanup() {
    // Очистка тестовых пользователей
    for (const email of this.createdUsers) {
      try {
        // Здесь можно добавить очистку если нужно
        log(`Тестовый пользователь ${email} создан, требует ручной очистки`, 'warning');
      } catch (error) {
        log(`Ошибка очистки пользователя ${email}: ${error.message}`, 'error');
      }
    }
  }

  async runAllTests() {
    log('🚀 Начало комплексного тестирования API', 'info');
    log(`Базовый URL: ${CONFIG.BASE_URL}`, 'info');
    
    try {
      // 1. Проверка здоровья
      log('\n=== 1. Проверка здоровья сервера ===', 'info');
      await this.testHealthChecks();
      
      // 2. Аутентификация
      log('\n=== 2. Тестирование аутентификации ===', 'info');
      await this.testAuthentication();
      
      // 3. Операции с паролями
      log('\n=== 3. Тестирование операций с паролями ===', 'info');
      await this.testPasswordOperations();
      
      // 4. Заявки
      log('\n=== 4. Тестирование заявок ===', 'info');
      await this.testApplications();
      
      // 5. Админ-панель
      log('\n=== 5. Тестирование админ-панели ===', 'info');
      await this.testAdminPanel();
      
    } catch (error) {
      log(`Критическая ошибка: ${error.message}`, 'error');
    } finally {
      // Вывод результатов
      this.printResults();
      
      // Очистка
      await this.cleanup();
    }
  }

  printResults() {
    log('\n' + '='.repeat(50), 'info');
    log('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ', 'info');
    log('='.repeat(50), 'info');
    
    console.log(`Всего тестов: ${testResults.total}`);
    console.log(`✅ Пройдено: ${testResults.passed}`);
    console.log(`❌ Не пройдено: ${testResults.failed}`);
    console.log(`📈 Успешность: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
    
    if (testResults.failed > 0) {
      log('\n📋 Детали неудачных тестов:', 'warning');
      testResults.details
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`  • ${test.name}: ${test.error}`);
        });
    }
    
    // Сохранение результатов в файл
    this.saveResultsToFile();
  }

  saveResultsToFile() {
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
      fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(CONFIG.OUTPUT_DIR, `test-results-${timestamp}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        successRate: ((testResults.passed / testResults.total) * 100).toFixed(1)
      },
      details: testResults.details,
      environment: {
        baseUrl: CONFIG.BASE_URL,
        nodeVersion: process.version
      }
    };
    
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    log(`Отчет сохранен: ${filename}`, 'success');
  }
}

// Запуск тестов
async function main() {
  const tester = new APITester();
  
  try {
    await tester.runAllTests();
    
    if (testResults.failed === 0) {
      log('\n🎉 ВСЕ ТЕСТЫ УСПЕШНО ПРОЙДЕНЫ!', 'success');
      process.exit(0);
    } else {
      log(`\n⚠️  Некоторые тесты не пройдены (${testResults.failed} из ${testResults.total})`, 'warning');
      process.exit(1);
    }
  } catch (error) {
    log(`\n💥 Критическая ошибка: ${error.message}`, 'error');
    process.exit(2);
  }
}

// Запуск если файл вызван напрямую
if (require.main === module) {
  main();
}

module.exports = { APITester };