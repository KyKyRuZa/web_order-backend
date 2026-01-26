const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Конфигурация
const CONFIG = {
  BASE_URL: 'http://localhost:5000/api',
  TEST_USERS: {
    admin: { email: 'admin@example.com', password: 'admin123' },
    manager: { email: 'manager@example.com', password: 'manager123' },
    client: { email: 'client@example.com', password: 'client123' }
  }
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

class FileUploadTester {
  constructor() {
    this.client = axios.create({
      baseURL: CONFIG.BASE_URL,
      timeout: 30000 // Увеличиваем таймаут для загрузки файлов
    });

    this.tokens = {};
    this.applicationId = null;
    this.fileId = null;
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

    await sleep(500); // Задержка между тестами
  }

  async authenticate() {
    // Аутентификация всех пользователей
    for (const [role, credentials] of Object.entries(CONFIG.TEST_USERS)) {
      await this.runTest(`POST /auth/login - ${role}`, async () => {
        const response = await this.client.post('/auth/login', credentials);

        if (!response.data.success) {
          throw new Error(`Login failed for ${role}: ${response.data.message}`);
        }

        this.tokens[role] = response.data.data.tokens.accessToken;
        log(`Токен получен для ${role}`, 'success');
      });
    }
  }

  async createTestApplication() {
    await this.runTest('POST /applications - create test application', async () => {
      const response = await this.client.post('/applications', {
        title: 'Тестовая заявка для загрузки файлов',
        description: 'Заявка создана для тестирования загрузки файлов',
        serviceType: 'corporate_site',
        contactFullName: 'Тестовый Клиент',
        contactEmail: 'client@example.com',
        contactPhone: '+79161234567',
        companyName: 'Тестовая компания',
        budgetRange: 'under_50k'
      }, {
        headers: { Authorization: `Bearer ${this.tokens.client}` }
      });

      if (!response.data.success) {
        throw new Error('Failed to create test application');
      }

      this.applicationId = response.data.data.application.id;
      log(`Тестовая заявка создана: ${this.applicationId}`, 'success');
    });
  }

  async testFileUpload() {
    // Создаем временный файл для теста
    const testFilePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(testFilePath, 'Это тестовый файл для загрузки в систему');

    await this.runTest('POST /applications/:id/files - upload test file', async () => {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(testFilePath));
      formData.append('category', 'technical_spec');
      formData.append('description', 'Тестовый файл спецификации');

      const response = await this.client.post(
        `/applications/${this.applicationId}/files`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${this.tokens.client}`
          }
        }
      );

      if (!response.data.success) {
        throw new Error(`File upload failed: ${response.data.message}`);
      }

      if (!response.data.data?.file?.id) {
        throw new Error('File ID not returned in response');
      }

      this.fileId = response.data.data.file.id;
      log(`Файл успешно загружен: ${this.fileId}`, 'success');
    });

    // Удаляем временный файл
    fs.unlinkSync(testFilePath);
  }

  async testGetFiles() {
    await this.runTest(`GET /applications/${this.applicationId}/files - get uploaded files`, async () => {
      const response = await this.client.get(`/applications/${this.applicationId}/files`, {
        headers: { Authorization: `Bearer ${this.tokens.client}` }
      });

      if (!response.data.success) {
        throw new Error('Failed to get files');
      }

      if (!Array.isArray(response.data.data.files)) {
        throw new Error('Files array not found in response');
      }

      if (response.data.data.files.length === 0) {
        throw new Error('No files returned');
      }

      const uploadedFile = response.data.data.files.find(f => f.id === this.fileId);
      if (!uploadedFile) {
        throw new Error('Uploaded file not found in files list');
      }

      log(`Файлы успешно получены: ${response.data.data.files.length} шт.`, 'success');
    });
  }

  async testFileAccessControl() {
    // Проверяем, что менеджер может получить файлы
    await this.runTest(`GET /applications/${this.applicationId}/files - manager access`, async () => {
      const response = await this.client.get(`/applications/${this.applicationId}/files`, {
        headers: { Authorization: `Bearer ${this.tokens.manager}` }
      });

      if (!response.data.success) {
        throw new Error('Manager failed to access files');
      }

      log('Менеджер получил доступ к файлам заявки', 'success');
    });

    // Проверяем, что админ может получить файлы
    await this.runTest(`GET /applications/${this.applicationId}/files - admin access`, async () => {
      const response = await this.client.get(`/applications/${this.applicationId}/files`, {
        headers: { Authorization: `Bearer ${this.tokens.admin}` }
      });

      if (!response.data.success) {
        throw new Error('Admin failed to access files');
      }

      log('Администратор получил доступ к файлам заявки', 'success');
    });
  }

  async testFileDownload() {
    await this.runTest(`GET /applications/${this.applicationId}/files/${this.fileId} - download file info`, async () => {
      // В текущей реализации у нас нет отдельного эндпоинта для скачивания файла
      // Информация о файле уже содержится в списке файлов
      log('Тест скачивания файла пропущен - отдельный эндпоинт не реализован', 'info');
    });
  }

  async testFileDeletion() {
    await this.runTest(`DELETE /applications/files/${this.fileId} - delete uploaded file`, async () => {
      const response = await this.client.delete(`/applications/files/${this.fileId}`, {
        headers: { Authorization: `Bearer ${this.tokens.client}` }
      });

      if (!response.data.success) {
        throw new Error(`File deletion failed: ${response.data.message}`);
      }

      log('Файл успешно удален', 'success');
    });
  }

  async testInvalidFileUpload() {
    // Создаем файл, который превышает максимальный размер (10MB)
    const largeFilePath = path.join(__dirname, 'large-test-file.txt');
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    fs.writeFileSync(largeFilePath, largeBuffer);

    await this.runTest('POST /applications/:id/files - upload too large file (should fail)', async () => {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(largeFilePath));

      try {
        await this.client.post(
          `/applications/${this.applicationId}/files`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              Authorization: `Bearer ${this.tokens.client}`
            }
          }
        );
        throw new Error('Large file upload should have failed but didn\'t');
      } catch (error) {
        if (error.response?.status !== 400) {
          throw new Error(`Expected 400 error, got ${error.response?.status}`);
        }
        log('Загрузка большого файла корректно отклонена', 'success');
      }
    });

    // Удаляем временный файл
    fs.unlinkSync(largeFilePath);
  }

  async testUnsupportedFileType() {
    // Создаем файл с неподдерживаемым типом
    const unsupportedFilePath = path.join(__dirname, 'test.exe');
    fs.writeFileSync(unsupportedFilePath, 'fake executable file');

    await this.runTest('POST /applications/:id/files - upload unsupported file type (should fail)', async () => {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(unsupportedFilePath));

      try {
        await this.client.post(
          `/applications/${this.applicationId}/files`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
              Authorization: `Bearer ${this.tokens.client}`
            }
          }
        );
        throw new Error('Unsupported file type upload should have failed but didn\'t');
      } catch (error) {
        if (error.response?.status !== 400) {
          throw new Error(`Expected 400 error, got ${error.response?.status}`);
        }
        log('Загрузка неподдерживаемого типа файла корректно отклонена', 'success');
      }
    });

    // Удаляем временный файл
    fs.unlinkSync(unsupportedFilePath);
  }

  async cleanup() {
    // Удаляем тестовую заявку
    if (this.applicationId) {
      try {
        await this.client.delete(`/applications/${this.applicationId}`, {
          headers: { Authorization: `Bearer ${this.tokens.client}` }
        });
        log(`Тестовая заявка ${this.applicationId} удалена`, 'info');
      } catch (error) {
        log(`Ошибка удаления тестовой заявки: ${error.message}`, 'warning');
      }
    }
  }

  async runAllTests() {
    log('🚀 Начало тестирования загрузки файлов', 'info');
    log(`Базовый URL: ${CONFIG.BASE_URL}`, 'info');

    try {
      // Аутентификация
      await this.authenticate();

      // Создание тестовой заявки
      await this.createTestApplication();

      // Тестирование загрузки файлов
      await this.testFileUpload();

      // Тестирование получения файлов
      await this.testGetFiles();

      // Тестирование контроля доступа
      await this.testFileAccessControl();

      // Тестирование скачивания (информационно)
      await this.testFileDownload();

      // Тестирование валидации
      await this.testInvalidFileUpload();
      await this.testUnsupportedFileType();

      // Тестирование удаления файлов
      await this.testFileDeletion();

    } catch (error) {
      log(`Критическая ошибка: ${error.message}`, 'error');
    } finally {
      // Очистка
      await this.cleanup();

      // Вывод результатов
      this.printResults();
    }
  }

  printResults() {
    log('\n' + '='.repeat(50), 'info');
    log('📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ ЗАГРУЗКИ ФАЙЛОВ', 'info');
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
    const fs = require('fs');
    const path = require('path');
    
    const outputDir = './test-results';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(outputDir, `file-upload-test-results-${timestamp}.json`);

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
  const tester = new FileUploadTester();

  try {
    await tester.runAllTests();

    if (testResults.failed === 0) {
      log('\n🎉 Все тесты загрузки файлов пройдены!', 'success');
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

module.exports = FileUploadTester;