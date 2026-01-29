const net = require('net');

function isValidIP(ip) {
  if (!ip || typeof ip !== 'string') return false;
  // Проверяем, является ли строка валидным IP-адресом
  return net.isIP(ip) === 4 || net.isIP(ip) === 6; // Только IPv4 или IPv6
}

module.exports = { isValidIP };