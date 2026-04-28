import dotenv from 'dotenv';
dotenv.config();

const buildConnectionString = () => {
  const connectionString =
    process.env.CONNECTION_STRING || 'mongodb://127.0.0.1:27017/';
  const password = process.env.DB_PASSWORD || '';
  if (connectionString.includes('<db_password>')) {
    return connectionString.replace('<db_password>', encodeURIComponent(password));
  }
  return connectionString;
};

export default {
  HOST:           process.env.HOST       || 'localhost',
  PORT:           process.env.PORT       || 3020,
  API_URL:        process.env.API_URL    || '/api/v1',
  APP_NAME:       process.env.APP_NAME   || 'apprestInversionsApi',
  CONNECTION_STRING: buildConnectionString(),
  DATABASE:       process.env.DATABASE   || 'InversionDB',
  DB_USER:        process.env.DB_USER    || '',
  DB_PASSWORD:    process.env.DB_PASSWORD|| '',
  SUPABASE_URL:   process.env.SUPABASE_URL  || '',
  SUPABASE_KEY:   process.env.SUPABASE_KEY  || '',
  SUPABASE_SCHEMA:process.env.SUPABASE_SCHEMA || 'public',
};
