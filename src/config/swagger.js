const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RelateLab API Documentation',
      version: '1.0.0',
      description: 'Документация для API платформы RelateLab - системы управления заявками на веб-разработку',
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.relatelab.ru/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/models/*.js'], // файлы, содержащие аннотации JSDoc
};

const specs = swaggerJsdoc(options);

module.exports = specs;