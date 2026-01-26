const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Простой скрипт для отладки загрузки файлов
async function debugUpload() {
  try {
    // Сначала залогинимся
    console.log('1. Логинимся как клиент...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'client@example.com',
      password: 'client123'
    });

    const token = loginResponse.data.data.tokens.accessToken;
    console.log('Токен получен:', token.substring(0, 20) + '...');

    // Создадим тестовую заявку
    console.log('\n2. Создаем тестовую заявку...');
    const appResponse = await axios.post('http://localhost:5000/api/applications', {
      title: 'Тестовая заявка для отладки',
      description: 'Заявка создана для отладки загрузки файлов',
      serviceType: 'corporate_site',
      contactFullName: 'Иван Иванов',
      contactEmail: 'client@example.com',
      contactPhone: '+79161234567',
      companyName: 'Тестовая компания',
      budgetRange: 'under_50k'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const appId = appResponse.data.data.application.id;
    console.log('Заявка создана:', appId);

    // Создаем временный файл
    console.log('\n3. Создаем временный файл...');
    const filePath = './debug-test-file.txt';
    fs.writeFileSync(filePath, 'Это тестовый файл для отладки загрузки файлов');

    // Пытаемся загрузить файл
    console.log('\n4. Загружаем файл...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('category', 'technical_spec');
    formData.append('description', 'Тестовый файл для отладки');

    try {
      const uploadResponse = await axios.post(
        `http://localhost:5000/api/applications/${appId}/files`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Ответ от сервера:', JSON.stringify(uploadResponse.data, null, 2));
    } catch (uploadError) {
      console.error('Ошибка загрузки файла:', uploadError.response?.data || uploadError.message);
      console.error('Статус:', uploadError.response?.status);
      console.error('Заголовки ошибки:', uploadError.response?.headers);
    }

    // Удаляем временный файл
    fs.unlinkSync(filePath);

    // Удаляем тестовую заявку
    console.log('\n5. Удаляем тестовую заявку...');
    await axios.delete(`http://localhost:5000/api/applications/${appId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Тестовая заявка удалена');

  } catch (error) {
    console.error('Ошибка в скрипте отладки:', error.message);
    if (error.response) {
      console.error('Статус:', error.response.status);
      console.error('Данные:', error.response.data);
    }
  }
}

debugUpload();