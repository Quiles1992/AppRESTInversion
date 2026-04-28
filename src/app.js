import express from 'express';
import morgan  from 'morgan';
import cors    from 'cors';

import config    from './config/config';
import routerApi from './routes/index';
import { swaggerUi, swaggerSpec } from './docs/swagger';
import { boomErrorHandler, errorHandler, ormErrorHandler } from './middlewares/error.handler';

const app = express();

// Puerto
app.set('port', config.PORT);

// Middlewares generales
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const api = config.API_URL;

// Ruta raíz informativa
app.get(`${api}`, (_req, res) => {
  res.send(`
    <h1>RESTful running in root</h1>
    <p>${config.APP_NAME}: <b><a href="${api}/api-docs">${api}/api-docs</a></b> for more information.</p>
    <h3>Endpoints disponibles:</h3>
    <ul>
      <li>GET/POST        ${api}/users</li>
      <li>GET/POST        ${api}/strategies</li>
      <li>GET/POST        ${api}/signal-events</li>
      <li>GET/POST        ${api}/orders</li>
      <li>GET/POST        ${api}/positions</li>
      <li>GET/POST        ${api}/closed-trades</li>
      <li>GET/POST        ${api}/alert-log</li>
      <li>GET/POST        ${api}/news</li>
      <li>GET/POST        ${api}/event-calendar</li>
      <li>GET/POST        ${api}/fundamentals</li>
      <li>GET/POST        ${api}/option-chain</li>
      <li>GET/POST        ${api}/broker-accounts</li>
      <li>GET/POST        ${api}/risk-config</li>
    </ul>
    <p>Agrega <b>?DBServer=supabase</b> para usar Supabase en lugar de MongoDB.</p>
  `);
});

// Registro de rutas de la API
app.use(`${api}`, routerApi);

// Swagger UI
app.use(`${api}/api-docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middlewares de manejo de errores (orden importante)
app.use(ormErrorHandler);
app.use(boomErrorHandler);
app.use(errorHandler);

export default app;
