import cron from 'node-cron';
import {
  syncSP500,
  syncStaleData,
  getSyncStats,
  syncBatchFundamentals,
} from './data-sync.service.js';
import config from '../config/config.js';

/**
 * Scheduler Service
 * Ejecuta jobs programados para sincronizar datos de Alpaca
 * Mantiene los datos frescos sin exceder límites gratis
 */

const jobs = new Map();

/**
 * Inicia el scheduler de sincronización
 * @param {string} dbServer - 'mongodb' o 'supabase'
 */
export const startScheduler = (dbServer = 'mongodb') => {
  console.log('🚀 Iniciando Scheduler de Sincronización...');

  // ===============================================
  // 1. Sync S&P 500 cada 4 horas
  // ===============================================
  const sp500Job = cron.schedule('0 */4 * * *', async () => {
    console.log('⏰ [CRON] Sincronizando S&P 500 completo...');
    try {
      const result = await syncSP500(dbServer);
      console.log(`📊 S&P 500 Sync Result:`, result);
    } catch (error) {
      console.error('❌ S&P 500 sync error:', error.message);
    }
  });

  jobs.set('sp500-daily', sp500Job);

  // ===============================================
  // 2. Sync datos desactualizados cada 30 minutos
  // ===============================================
  const staleJob = cron.schedule('*/30 * * * *', async () => {
    console.log('⏰ [CRON] Sincronizando datos desactualizados...');
    try {
      const result = await syncStaleData(30, dbServer);
      console.log(`🔄 Stale Data Sync Result:`, result);
    } catch (error) {
      console.error('❌ Stale data sync error:', error.message);
    }
  });

  jobs.set('stale-refresh', staleJob);

  // ===============================================
  // 3. Sync símbolos TOP trending cada 2 horas
  // ===============================================
  const trendingJob = cron.schedule('0 */2 * * *', async () => {
    console.log('⏰ [CRON] Sincronizando símbolos trending...');
    try {
      // Top 20 más volatiles/activos
      const topSymbols = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'AMZN',
                          'META', 'NFLX', 'AVGO', 'ANET', 'ASML', 'CDNS',
                          'CRWD', 'CRM', 'DDOG', 'FANG', 'UBER', 'SPOT'];
      const result = await syncBatchFundamentals(topSymbols, dbServer);
      console.log(`🔥 Trending Symbols Sync Result:`, result);
    } catch (error) {
      console.error('❌ Trending sync error:', error.message);
    }
  });

  jobs.set('trending-refresh', trendingJob);

  // ===============================================
  // 4. Reporte de stats cada 6 horas
  // ===============================================
  const statsJob = cron.schedule('0 */6 * * *', async () => {
    console.log('⏰ [CRON] Generando reporte de sincronización...');
    try {
      const stats = await getSyncStats(dbServer);
      console.log('📈 Sync Stats:', stats);
    } catch (error) {
      console.error('❌ Stats error:', error.message);
    }
  });

  jobs.set('stats-report', statsJob);

  // ===============================================
  // 5. Sync ligero cada 15 minutos (top 10)
  // ===============================================
  const lightJob = cron.schedule('*/15 * * * *', async () => {
    console.log('⏰ [CRON] Sincronización ligera (TOP 10)...');
    try {
      const top10 = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'AMZN', 'META', 'BRK.B', 'JNJ', 'V'];
      const result = await syncBatchFundamentals(top10, dbServer);
      console.log(`⚡ Light Sync Result:`, result);
    } catch (error) {
      console.error('❌ Light sync error:', error.message);
    }
  });

  jobs.set('light-refresh', lightJob);

  console.log('✅ Scheduler iniciado con 5 jobs activos');
};

/**
 * Detiene todos los jobs
 */
export const stopScheduler = () => {
  console.log('🛑 Deteniendo Scheduler...');
  jobs.forEach((job, name) => {
    job.stop();
    console.log(`  ✓ Job detenido: ${name}`);
  });
  jobs.clear();
  console.log('✅ Scheduler detenido');
};

/**
 * Obtiene la lista de jobs activos
 * @returns {array} - Nombres de jobs
 */
export const getActiveJobs = () => {
  return Array.from(jobs.keys());
};

/**
 * Ejecuta un job manualmente
 * @param {string} jobName - Nombre del job
 * @param {string} dbServer - 'mongodb' o 'supabase'
 */
export const triggerJob = async (jobName, dbServer = 'mongodb') => {
  console.log(`🚀 Ejecutando job manual: ${jobName}`);

  try {
    switch (jobName) {
      case 'sp500-daily':
        return await syncSP500(dbServer);

      case 'stale-refresh':
        return await syncStaleData(30, dbServer);

      case 'trending-refresh':
        const topSymbols = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'AMZN',
                            'META', 'NFLX', 'AVGO', 'ANET', 'ASML', 'CDNS',
                            'CRWD', 'CRM', 'DDOG', 'FANG', 'UBER', 'SPOT'];
        return await syncBatchFundamentals(topSymbols, dbServer);

      case 'stats-report':
        return await getSyncStats(dbServer);

      case 'light-refresh':
        const top10 = ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'AMZN', 'META', 'BRK.B', 'JNJ', 'V'];
        return await syncBatchFundamentals(top10, dbServer);

      default:
        return { error: `Job ${jobName} not found` };
    }
  } catch (error) {
    return { error: error.message };
  }
};

/**
 * Sincronización manual ad-hoc para símbolos específicos
 * @param {array} symbols - Lista de símbolos
 * @param {string} dbServer - 'mongodb' o 'supabase'
 */
export const syncCustomSymbols = async (symbols, dbServer = 'mongodb') => {
  console.log(`🔄 Sincronizando símbolos personalizados: ${symbols.join(', ')}`);
  return await syncBatchFundamentals(symbols, dbServer);
};

/**
 * Configura job personalizado
 * Ej: "0 */3 * * *" = cada 3 horas
 * Ej: "*/15 * * * *" = cada 15 minutos
 * 
 * @param {string} jobName - Nombre único del job
 * @param {string} cronExpression - Expresión cron
 * @param {Function} callback - Función a ejecutar
 */
export const addCustomJob = (jobName, cronExpression, callback) => {
  if (jobs.has(jobName)) {
    console.warn(`⚠️ Job ${jobName} ya existe, reemplazando...`);
    jobs.get(jobName).stop();
  }

  const job = cron.schedule(cronExpression, callback);
  jobs.set(jobName, job);
  console.log(`✅ Job agregado: ${jobName} con patrón "${cronExpression}"`);
};

/**
 * Elimina un job personalizado
 * @param {string} jobName - Nombre del job
 */
export const removeCustomJob = (jobName) => {
  if (jobs.has(jobName)) {
    jobs.get(jobName).stop();
    jobs.delete(jobName);
    console.log(`✅ Job removido: ${jobName}`);
    return true;
  }
  return false;
};

export default {
  startScheduler,
  stopScheduler,
  getActiveJobs,
  triggerJob,
  syncCustomSymbols,
  addCustomJob,
  removeCustomJob,
};
