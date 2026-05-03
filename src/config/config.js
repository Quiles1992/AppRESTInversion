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

  // =============================================
  // Groq AI Configuration
  // =============================================
  GROQ_API_KEY:   process.env.GROQ_API_KEY || '',
  GROQ_MODEL:     process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
  GROQ_TEMPERATURE: parseFloat(process.env.GROQ_TEMPERATURE) || 0.1,
  GROQ_MAX_TOKENS: parseInt(process.env.GROQ_MAX_TOKENS) || 1024,

  // =============================================
  // Alpaca Markets Configuration
  // =============================================
  ALPACA_API_KEY:   process.env.ALPACA_API_KEY || '',
  ALPACA_SECRET_KEY: process.env.ALPACA_SECRET_KEY || '',
  ALPACA_BASE_URL:  process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets',
  ALPACA_CACHE_MINUTES: parseInt(process.env.ALPACA_CACHE_MINUTES) || 60,

  // =============================================
  // AI Query Engine Configuration
  // =============================================
  AI_RATE_LIMIT: parseInt(process.env.AI_RATE_LIMIT) || 100,
  AI_CACHE_TTL: parseInt(process.env.AI_CACHE_TTL) || 3600,
};
