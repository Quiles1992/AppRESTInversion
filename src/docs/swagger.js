import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUiExpress from 'swagger-ui-express';
import config from '../config/config';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'apprestInversionsApi API',
      version:     '1.0.0',
      description: 'Documentacion base para la API RESTful apprestInversionsApi.',
    },
    servers: [
      {
        url:         `http://${config.HOST}:${config.PORT}${config.API_URL}`,
        description: 'Servidor local',
      },
    ],
    components: {
      parameters: {
        DBServer: {
          in:          'query',
          name:        'DBServer',
          schema:      { type: 'string', enum: ['mongodb', 'supabase'], default: 'mongodb' },
          description: 'Motor de base de datos a utilizar',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
export const swaggerUi   = swaggerUiExpress;
