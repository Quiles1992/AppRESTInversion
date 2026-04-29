import boom from '@hapi/boom';

// Maneja errores de Mongoose (validación, cast, duplicados)
export const ormErrorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: true, message: messages.join(', ') });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: true, message: `ID inválido: ${err.value}` });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'campo';
    return res.status(409).json({ error: true, message: `Duplicado en ${field}` });
  }
  next(err);
};

// Maneja errores de @hapi/boom
export const boomErrorHandler = (err, req, res, next) => {
  if (err.isBoom) {
    const { statusCode, payload } = err.output;
    return res.status(statusCode).json({ error: true, message: payload.message });
  }
  next(err);
};

// Manejador genérico de errores 500
export const errorHandler = (err, req, res, _next) => {
  console.error('❌ Error no manejado:', err);
  res.status(500).json({ error: true, message: 'Error interno del servidor' });
};
