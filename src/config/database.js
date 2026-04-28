import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';
import config from './config';

// =============================================
// Cliente Supabase (singleton)
// =============================================
export const supabaseClient =
  config.SUPABASE_URL && config.SUPABASE_KEY
    ? createClient(config.SUPABASE_URL, config.SUPABASE_KEY)
    : null;

// =============================================
// Conexión MongoDB
// =============================================
const connectDatabase = async () => {
  try {
    const db = await mongoose.connect(config.CONNECTION_STRING, {
      dbName: config.DATABASE,
    });
    console.log(`✅ MongoDB conectado a: ${db.connection.name}`);
  } catch (error) {
    console.error('❌ Error MongoDB:', error.message);
  }

  if (supabaseClient) {
    console.log(`✅ Supabase configurado: ${config.SUPABASE_URL}`);
  } else {
    console.warn('⚠️  Supabase no configurado. Agrega SUPABASE_URL y SUPABASE_KEY al .env');
  }
};

export default connectDatabase;
