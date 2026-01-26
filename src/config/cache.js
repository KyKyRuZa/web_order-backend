const NodeCache = require('node-cache');

// Создаем экземпляр кеша с настройками
const cache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL || 600), // 10 минут по умолчанию (в секундах)
  checkperiod: parseInt(process.env.CACHE_CHECK_PERIOD || 120), // Проверяем каждые 2 минуты
  useClones: false, // Не клонируем объекты при сохранении/извлечении
  errorOnMissing: false // Не вызываем ошибку при отсутствии ключа
});

// Метод для получения данных из кеша
const get = (key) => {
  const value = cache.get(key);
  if (value !== undefined) {
    console.log(`CACHE HIT: ${key}`);
  } else {
    console.log(`CACHE MISS: ${key}`);
  }
  return value;
};

// Метод для сохранения данных в кеше
const set = (key, value, ttl = parseInt(process.env.CACHE_TTL || 600)) => {
  const success = cache.set(key, value, ttl);
  if (success) {
    console.log(`CACHE SET: ${key} (TTL: ${ttl}s)`);
  }
  return success;
};

// Метод для удаления данных из кеша
const del = (key) => {
  const deleted = cache.del(key);
  if (deleted > 0) {
    console.log(`CACHE DEL: ${key}`);
  }
  return deleted;
};

// Метод для очистки всего кеша
const flush = () => {
  cache.flushAll();
  console.log('CACHE FLUSH: All cache cleared');
};

// Метод для получения информации о кеше
const getStats = () => {
  return cache.getStats();
};

module.exports = {
  cache,
  get,
  set,
  del,
  flush,
  getStats
};