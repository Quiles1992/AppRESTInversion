import { createClient } from 'redis';
import config from '../config/config.js';

/**
 * Cache Service - Optimizado para Redis Cloud
 */

let redisClient = null;
const localCache = new Map();

// Intentar conectar a Redis con esteroides
const initRedis = async () => {
  try {
    if (process.env.REDIS_URL) {
      // Usamos createClient directamente de la librería para evitar problemas de compatibilidad
      redisClient = createClient({
        url: process.env.REDIS_URL,
        // Quitamos tls: true porque causa el error de mismatch
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 5) return new Error('Reintentos de Redis agotados');
            return Math.min(retries * 100, 3000);
          }
        }
      });

      redisClient.on('error', (err) => {
        // Si hay error, marcamos como null para que el resto del código use el Map local
        if (redisClient) {
            console.warn('⚠️ Redis Cloud connection error, falling back to local cache:', err.message);
            redisClient = null;
        }
      });

      await redisClient.connect();
      console.log('✅ Redis Cloud conectado exitosamente');
    } else {
      console.warn('⚠️ No se encontró REDIS_URL en el .env');
    }
  } catch (error) {
    console.warn('⚠️ Falló la conexión a Redis, usando memoria local:', error.message);
    redisClient = null;
  }
};

initRedis().catch(err => console.error("Error en inicialización:", err));

/**
 * Obtiene valor del cache
 */
export const getCacheValue = async (key) => {
  try {
    if (redisClient && redisClient.isOpen) {
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
 */
export const setCacheValue = async (key, value, ttlSeconds = 3600) => {
  try {
    if (redisClient && redisClient.isOpen) {
      // Usamos set con opciones modernas
      await redisClient.set(key, JSON.stringify(value), {
        EX: ttlSeconds
      });
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
 */
export const deleteCacheValue = async (key) => {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.del(key);
    } else {
      localCache.delete(key);
    }
  } catch (error) {
    console.error('❌ Cache DELETE error:', error.message);
  }
};

/**
 * Limpia todo el cache
 */
export const flushCache = async () => {
  try {
    if (redisClient && redisClient.isOpen) {
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

export const generateCacheKey = (symbol, timeframe = 'current', type = 'quote') => {
  const date = new Date().toISOString().split('T')[0];
  return `alpaca:${symbol.toUpperCase()}:${timeframe}:${type}:${date}`;
};

export const cacheOrFetch = async (key, fetchFn, ttl = 3600) => {
  const cached = await getCacheValue(key);
  if (cached) return cached;

  const data = await fetchFn();
  if (data) await setCacheValue(key, data, ttl);
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