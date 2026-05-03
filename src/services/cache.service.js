import Redis from 'redis';
import config from '../config/config.js';

/**
 * Cache Service
 * Gestiona caché en Redis para reducir llamadas a Alpaca
 * Sin Redis, usa memoria local (simula con Map)
 */

let redisClient = null;
const localCache = new Map();

// Intentar conectar a Redis
const initRedis = async () => {
  try {
    if (process.env.REDIS_URL) {
      redisClient = Redis.createClient({
        url: process.env.REDIS_URL,
      });
      
      redisClient.on('error', (err) => {
        console.warn('⚠️ Redis connection error, falling back to local cache:', err.message);
        redisClient = null;
      });
      
      await redisClient.connect();
      console.log('✅ Redis connected');
    }
  } catch (error) {
    console.warn('⚠️ Redis not available, using local in-memory cache');
    redisClient = null;
  }
};

initRedis().catch(console.error);

/**
 * Obtiene valor del cache
 * @param {string} key - Clave de cache
 * @returns {any} - Valor cacheado o null
 */
export const getCacheValue = async (key) => {
  try {
    if (redisClient) {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } else {
      const cached = localCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
      localCache.delete(key);
      return null;
    }
  } catch (error) {
    console.error('❌ Cache GET error:', error.message);
    return null;
  }
};

/**
 * Guarda valor en cache
 * @param {string} key - Clave de cache
 * @param {any} value - Valor a cachear
 * @param {number} ttlSeconds - Time to live en segundos (default: 3600 = 1 hora)
 */
export const setCacheValue = async (key, value, ttlSeconds = 3600) => {
  try {
    if (redisClient) {
      await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    } else {
      localCache.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    }
  } catch (error) {
    console.error('❌ Cache SET error:', error.message);
  }
};

/**
 * Elimina valor del cache
 * @param {string} key - Clave de cache
 */
export const deleteCacheValue = async (key) => {
  try {
    if (redisClient) {
      await redisClient.del(key);
    } else {
      localCache.delete(key);
    }
  } catch (error) {
    console.error('❌ Cache DELETE error:', error.message);
  }
};

/**
 * Limpia todo el cache (CUIDADO: destructivo)
 */
export const flushCache = async () => {
  try {
    if (redisClient) {
      await redisClient.flushDb();
      console.log('✅ Redis cache flushed');
    } else {
      localCache.clear();
      console.log('✅ Local cache cleared');
    }
  } catch (error) {
    console.error('❌ Cache FLUSH error:', error.message);
  }
};

/**
 * Genera una clave de cache estandarizada
 * Formato: "symbol:timeframe:type:date"
 * @param {string} symbol - Símbolo (ej: "AAPL")
 * @param {string} timeframe - Marco temporal (ej: "1d", "1h")
 * @param {string} type - Tipo de dato (ej: "bars", "quote", "volatility")
 * @returns {string} - Clave formateada
 */
export const generateCacheKey = (symbol, timeframe = 'current', type = 'quote') => {
  const date = new Date().toISOString().split('T')[0];
  return `alpaca:${symbol.toUpperCase()}:${timeframe}:${type}:${date}`;
};

/**
 * Obtiene cacheado o ejecuta función
 * Patrón: cache-aside (si no existe, ejecuta y cachea)
 * @param {string} key - Clave de cache
 * @param {Function} fetchFn - Función que obtiene el dato
 * @param {number} ttl - TTL en segundos
 * @returns {any} - Dato cacheado o fresco
 */
export const cacheOrFetch = async (key, fetchFn, ttl = 3600) => {
  // Intentar obtener del cache
  const cached = await getCacheValue(key);
  if (cached) {
    console.log(`✅ Cache HIT: ${key}`);
    return cached;
  }

  // No está en cache, ejecutar función
  console.log(`❌ Cache MISS: ${key}, fetching...`);
  const data = await fetchFn();

  // Guardar en cache
  if (data) {
    await setCacheValue(key, data, ttl);
  }

  return data;
};

export default {
  getCacheValue,
  setCacheValue,
  deleteCacheValue,
  flushCache,
  generateCacheKey,
  cacheOrFetch,
};
