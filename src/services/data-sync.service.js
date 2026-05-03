import axios from 'axios';
import config from '../config/config.js';
import { 
  calculateVolatility, 
  getBars, 
  getLatestPrice,
  calculateRSI,
  calculateMovingAverages,
  calculateSharpeRatio,
  getPreviousDayPerformance 
} from './alpaca-connector.service.js';
import { supabaseClient } from '../config/database.js';
import Fundamental from '../models/Fundamental.js';
import News from '../models/News.js';

/**
 * Data Sync Service
 * Obtiene datos de Alpaca y los sincroniza en MongoDB/Supabase
 * Gratis: 200 reqs/min, máx 500 históricos por symbol
 */

const SP500_SYMBOLS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'BRK.B', 'JNJ', 'V', 'WMT',
  'JPM', 'PG', 'XOM', 'CVX', 'KO', 'PEP', 'CSCO', 'ABT', 'COST', 'BA',
  // ... más símbolos se pueden agregar
];

const BATCH_SIZE = 20; // Procesar de 20 en 20 para no exceder límites

/**
 * Sincroniza fundamentals de un símbolo desde Alpaca
 * @param {string} symbol - Ticker
 * @param {string} dbServer - 'mongodb' o 'supabase'
 * @returns {object} - Datos sincronizados
 */
export const syncFundamentalData = async (symbol, dbServer = 'mongodb') => {
  try {
    console.log(`📊 Sincronizando fundamentals para ${symbol}...`);

    // Obtener datos de Alpaca
    const bars = await getBars(symbol, '1d', 30);
    const volatility = await calculateVolatility(symbol, 30);
    const latestPrice = await getLatestPrice(symbol);
    const rsi = await calculateRSI(bars);
    const performance = await getPreviousDayPerformance(symbol);

    if (!latestPrice) {
      console.warn(`⚠️ No data available for ${symbol}`);
      return null;
    }

    const fundamentalData = {
      symbol: symbol.toUpperCase(),
      price: latestPrice.price,
      bid: latestPrice.bid,
      ask: latestPrice.ask,
      volume_today: performance?.volume || 0,
      volatility: volatility?.volatility || 0,
      volatility_30d: volatility?.volatility || 0,
      rsi_14: rsi || 0,
      last_price_update: latestPrice.timestamp,
      
      // Cálculos técnicos
      ma_20: calculateMovingAverages(bars, 20)?.ma20 || 0,
      ma_50: calculateMovingAverages(bars, 50)?.ma50 || 0,
      performance_1d: performance?.pct_change || 0,
      
      // Metadata
      source: 'alpaca',
      captured_at: new Date(),
      last_synced_at: new Date(),
    };

    // Guardar según BD
    if (dbServer === 'supabase') {
      return await syncToSupabase('fundamentals', fundamentalData);
    } else {
      return await syncToMongoDB(symbol, fundamentalData);
    }
  } catch (error) {
    console.error(`❌ Error syncing fundamental data for ${symbol}:`, error.message);
    return null;
  }
};

/**
 * Sincroniza múltiples símbolos (batch)
 * @param {array} symbols - Lista de tickers
 * @param {string} dbServer - 'mongodb' o 'supabase'
 * @returns {object} - Resumen de sincronización {synced: N, failed: N}
 */
export const syncBatchFundamentals = async (symbols, dbServer = 'mongodb') => {
  console.log(`🔄 Sincronizando ${symbols.length} símbolos...`);
  
  const results = {
    synced: 0,
    failed: 0,
    symbols: [],
  };

  // Procesar en batches para no saturar API
  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);
    
    console.log(`📦 Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.join(', ')}`);
    
    await Promise.all(
      batch.map(async (symbol) => {
        const data = await syncFundamentalData(symbol, dbServer);
        if (data) {
          results.synced++;
          results.symbols.push({ symbol, status: 'success' });
        } else {
          results.failed++;
          results.symbols.push({ symbol, status: 'failed' });
        }
      })
    );
    
    // Delay entre batches para respetar rate limits
    if (i + BATCH_SIZE < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`✅ Sync completado: ${results.synced} exitosos, ${results.failed} fallidos`);
  return results;
};

/**
 * Sincroniza datos del S&P 500 completo
 * @param {string} dbServer - 'mongodb' o 'supabase'
 * @returns {object} - Resumen
 */
export const syncSP500 = async (dbServer = 'mongodb') => {
  console.log(`🏆 Iniciando sincronización del S&P 500...`);
  return await syncBatchFundamentals(SP500_SYMBOLS, dbServer);
};

/**
 * Sincroniza a MongoDB
 * @param {string} symbol - Ticker
 * @param {object} data - Datos a guardar
 */
export const syncToMongoDB = async (symbol, data) => {
  try {
    const updated = await Fundamental.findOneAndUpdate(
      { symbol },
      data,
      { upsert: true, new: true }
    );
    console.log(`✅ MongoDB sync success: ${symbol}`);
    return updated;
  } catch (error) {
    console.error(`❌ MongoDB sync error for ${symbol}:`, error.message);
    return null;
  }
};

/**
 * Sincroniza a Supabase
 * @param {string} tableName - Nombre de tabla
 * @param {object} data - Datos a guardar
 */
export const syncToSupabase = async (tableName, data) => {
  try {
    const { data: result, error } = await supabaseClient
      .from(tableName)
      .upsert([data], { onConflict: 'symbol' });

    if (error) {
      throw error;
    }

    console.log(`✅ Supabase sync success: ${data.symbol}`);
    return result?.[0] || data;
  } catch (error) {
    console.error(`❌ Supabase sync error:`, error.message);
    return null;
  }
};

/**
 * Obtiene lista de símbolos de una fuente (Por ahora S&P 500)
 * En el futuro: NASDAQ, Russell 3000, etc.
 * @param {string} market - 'sp500', 'nasdaq', 'russell3000'
 * @returns {array} - Lista de símbolos
 */
export const getMarketSymbols = (market = 'sp500') => {
  const markets = {
    sp500: SP500_SYMBOLS,
    nasdaq: ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'AMZN'],
    tech: ['AAPL', 'MSFT', 'GOOGL', 'NVDA', 'TSLA', 'META', 'NFLX'],
  };
  return markets[market.toLowerCase()] || SP500_SYMBOLS;
};

/**
 * Sincroniza solo los símbolos que falta actualizar
 * (Últimos actualizados hace más de X minutos)
 * @param {number} minutesThreshold - Minutos sin actualizar
 * @param {string} dbServer - 'mongodb' o 'supabase'
 */
export const syncStaleData = async (minutesThreshold = 30, dbServer = 'mongodb') => {
  try {
    console.log(`🔄 Sincronizando datos desactualizados (>${minutesThreshold} min)...`);
    
    const cutoffTime = new Date(Date.now() - minutesThreshold * 60 * 1000);
    
    if (dbServer === 'supabase') {
      const { data: stale } = await supabaseClient
        .from('fundamentals')
        .select('symbol')
        .lt('last_synced_at', cutoffTime.toISOString())
        .limit(50);
      
      if (stale?.length > 0) {
        const symbols = stale.map(r => r.symbol);
        return await syncBatchFundamentals(symbols, dbServer);
      }
    } else {
      const stale = await Fundamental.find({
        last_synced_at: { $lt: cutoffTime },
      })
        .select('symbol')
        .limit(50);
      
      if (stale?.length > 0) {
        const symbols = stale.map(r => r.symbol);
        return await syncBatchFundamentals(symbols, dbServer);
      }
    }
    
    return { synced: 0, failed: 0 };
  } catch (error) {
    console.error('❌ Error syncing stale data:', error.message);
    return { synced: 0, failed: 0 };
  }
};

/**
 * Obtiene el estado de sincronización
 * Útil para dashboards
 * @param {string} dbServer - 'mongodb' o 'supabase'
 * @returns {object} - Stats de sincronización
 */
export const getSyncStats = async (dbServer = 'mongodb') => {
  try {
    if (dbServer === 'supabase') {
      const { data: all, count } = await supabaseClient
        .from('fundamentals')
        .select('*', { count: 'exact' });

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabaseClient
        .from('fundamentals')
        .select('*')
        .gte('last_synced_at', oneHourAgo);

      return {
        total_symbols: count,
        synced_last_hour: recent?.length || 0,
        stale_count: (count || 0) - (recent?.length || 0),
        last_sync: new Date(),
      };
    } else {
      const total = await Fundamental.countDocuments();
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recent = await Fundamental.countDocuments({
        last_synced_at: { $gte: oneHourAgo },
      });

      return {
        total_symbols: total,
        synced_last_hour: recent,
        stale_count: total - recent,
        last_sync: new Date(),
      };
    }
  } catch (error) {
    console.error('❌ Error getting sync stats:', error.message);
    return null;
  }
};

export default {
  syncFundamentalData,
  syncBatchFundamentals,
  syncSP500,
  syncToMongoDB,
  syncToSupabase,
  getMarketSymbols,
  syncStaleData,
  getSyncStats,
};
