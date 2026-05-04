import boom from '@hapi/boom';
import crypto from 'crypto';
import { interpretNLQuery, generateSummary, validateQuerySafety } from '../services/groq-client.service.js';
import {
  buildMongoQuery,
  buildSupabaseQuery,
  executeMongoQuery,
  executeSupabaseQuery,
  resolveMongooseModel,
  resolveSupabaseTable,
} from '../services/query-builder.service.js';
import { formatResponse } from '../services/analytics.service.js';
import { schemaContext, getAllowedFields } from '../utils/schema-mapper.js';
import { getLatestPrice, calculateVolatility } from '../services/alpaca-connector.service.js';
import { getCacheValue, setCacheValue } from '../services/cache.service.js';

/**
 * AI Query Controller
 * Orquesta el flujo: NL Query → Groq → QueryBuilder → Execute → Analytics
 */

/**
 * Genera hash SHA256 para usar como clave de caché
 * @param {string} query - Query del usuario
 * @param {string} dbServer - MongoDB o Supabase
 * @returns {string} - Hash SHA256
 */
const generateCacheKey = (query, dbServer) => {
  const input = `${query.toLowerCase()}:${dbServer}`;
  return crypto.createHash('sha256').update(input).digest('hex');
};

/**
 * POST /ai-query
 * Endpoint principal de consultas en lenguaje natural
 */
export const queryWithAI = async (req, res, next) => {
  try {
    const { query, dbServer = 'mongodb', includeAlpaca = false, includeCharts = false, skipCache = false } = req.body;

    // Validar input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw boom.badRequest('Query parameter is required and must be non-empty');
    }

    // ============================================
    // 1. CACHE: Buscar en caché
    // ============================================
    const cacheKey = generateCacheKey(query, dbServer);
    
    if (!skipCache) {
      console.log(`🔍 Buscando en caché: ${cacheKey.substring(0, 8)}...`);
      const cachedResult = await getCacheValue(cacheKey);
      
      if (cachedResult) {
        console.log(`⚡ HIT en caché! Retornando resultado cacheado`);
        cachedResult.fromCache = true;
        return res.json(cachedResult);
      }
    }
    
    console.log(`📝 Query recibida: "${query}"`);

    // ============================================
    // 2. INTERPRET: Groq transforma query natural → JSON estructurado
    // ============================================
    const parsedQuery = await interpretNLQuery(query, schemaContext);
    console.log(`🤖 Groq interpretó como:`, JSON.stringify(parsedQuery, null, 2));

    // ============================================
    // 3. RESOLVE: Determinar si es MongoDB o Supabase
    // ============================================
    const useSupabase = dbServer.toLowerCase() === 'supabase';

    // ============================================
    // 4. SECURITY: Validar campos permitidos
    // ============================================
    const allowedFields = getAllowedFields(parsedQuery.entity);
    if (!validateQuerySafety(parsedQuery, allowedFields)) {
      throw boom.badRequest('Query contains invalid fields or dangerous patterns');
    }

    // ============================================
    // 5. BUILD & EXECUTE: Construir y ejecutar query según BD
    // ============================================
    let data;

    if (useSupabase) {
      const tableName = resolveSupabaseTable(parsedQuery.entity);
      const supabaseQuery = buildSupabaseQuery(tableName, parsedQuery);
      data = await executeSupabaseQuery(supabaseQuery);
    } else {
      const modelName = resolveMongooseModel(parsedQuery.entity);
      const Model = require(`../models/${modelName}`).default;
      const queryConfig = buildMongoQuery(parsedQuery, Model);
      data = await executeMongoQuery(queryConfig.query, queryConfig.aggregation, queryConfig.isAggregation);
    }

    console.log(`✅ Ejecutada exitosamente. Resultados: ${Array.isArray(data) ? data.length : 1}`);

    // ============================================
    // 6. ENRICH: Agregar datos de Alpaca si se solicita
    // ============================================
    if (includeAlpaca && Array.isArray(data) && data.length > 0) {
      console.log(`🚀 Enriqueciendo con datos de Alpaca...`);
      data = await enrichWithAlpacaData(data, parsedQuery.entity);
    }

    // ============================================
    // 7. ANALYTICS: Generar resumen + gráficas
    // ============================================
    const response = formatResponse(data, query, includeCharts);

    // ============================================
    // 8. AI SUMMARY: Generar resumen en lenguaje natural (opcional, lento)
    // ============================================
    if (req.body.generateNLSummary) {
      try {
        response.naturalLanguageSummary = await generateSummary(
          Array.isArray(data) ? data.slice(0, 10) : data,
          query
        );
      } catch (err) {
        console.warn('⚠️ NL Summary generation failed:', err.message);
      }
    }

    // ============================================
    // 9. CACHE: Guardar resultado en caché (1 hora por defecto)
    // ============================================
    console.log(`💾 Guardando en caché: ${cacheKey.substring(0, 8)}...`);
    await setCacheValue(cacheKey, response, 3600); // 1 hora de TTL

    response.fromCache = false;
    res.json(response);
  } catch (error) {
    next(error);
  }
};

/**
 * Enriquece datos con información de Alpaca (precios, volatilidad)
 */
const enrichWithAlpacaData = async (data, entityType) => {
  // Solo enriquecer si la entidad tiene 'symbol'
  const hasSymbols = data.some(item => item.symbol);

  if (!hasSymbols) {
    return data;
  }

  try {
    // Enriquecer top 5 items con precios de Alpaca
    const topItems = data.slice(0, 5);

    const enriched = await Promise.all(
      topItems.map(async item => {
        try {
          const priceData = await getLatestPrice(item.symbol);
          const volatilityData = await calculateVolatility(item.symbol, 30);

          return {
            ...item,
            alpaca: {
              latestPrice: priceData,
              volatility: volatilityData,
            },
          };
        } catch (err) {
          console.warn(`⚠️ Alpaca enrichment failed for ${item.symbol}`);
          return item;
        }
      })
    );

    return [...enriched, ...data.slice(5)];
  } catch (error) {
    console.warn('⚠️ Alpaca enrichment batch failed:', error.message);
    return data;
  }
};

/**
 * POST /ai-query/preview
 * Endpoint para ver la query interpretada SIN ejecutarla
 * Útil para debugging y debugging
 */
export const previewQuery = async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw boom.badRequest('Query parameter is required');
    }

    console.log(`🔍 Preview query: "${query}"`);
    const parsedQuery = await interpretNLQuery(query, schemaContext);

    // Validar seguridad
    const allowedFields = getAllowedFields(parsedQuery.entity);
    const isSafe = validateQuerySafety(parsedQuery, allowedFields);

    res.json({
      success: true,
      originalQuery: query,
      parsedQuery,
      security: {
        isSafe,
        allowedFields,
      },
      mongoModel: resolveMongooseModel(parsedQuery.entity),
      supabaseTable: resolveSupabaseTable(parsedQuery.entity),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /ai-query/schema
 * Endpoint para obtener el schema disponible
 * Cliente puede usarlo para auto-complete, validation, etc
 */
export const getSchema = async (_req, res) => {
  res.json({
    success: true,
    schema: schemaContext,
    supportedEntities: [
      'Fundamental',
      'Position',
      'Order',
      'News',
      'OptionChain',
      'Strategy',
      'ClosedTrade',
      'AlertLog',
      'RiskConfig',
    ],
  });
};

/**
 * POST /ai-query/export-chart
 * Exporta una gráfica a PNG
 */
export const exportChartToPNG = async (req, res, next) => {
  try {
    const { chartData, chartType = 'candlestick', width = 1200, height = 600 } = req.body;

    if (!chartData) {
      throw boom.badRequest('chartData is required');
    }

    // Importar dinámicamente el servicio
    const { exportCandlestickToPNG, exportBarChartToPNG } = await import('../services/chart-export.service.js');

    let result;

    if (chartType === 'candlestick') {
      result = await exportCandlestickToPNG(chartData, width, height);
    } else if (chartType === 'bar') {
      result = await exportBarChartToPNG(chartData, width, height);
    } else {
      throw boom.badRequest(`Unsupported chart type: ${chartType}`);
    }

    res.json({
      success: true,
      chartType,
      export: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /ai-query/chart-download/:filename
 * Descarga un archivo PNG exportado
 */
export const downloadChart = async (req, res, next) => {
  try {
    const { filename } = req.params;

    if (!filename || !/^[a-z0-9\-]+\.png$/.test(filename)) {
      throw boom.badRequest('Invalid filename');
    }

    // Importar dinámicamente
    const { downloadChart: downloadChartService } = await import('../services/chart-export.service.js');

    const result = downloadChartService(filename);

    res.set('Content-Type', result.mimeType);
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result.buffer);
  } catch (error) {
    next(error);
  }
};

export default {
  queryWithAI,
  previewQuery,
  getSchema,
  exportChartToPNG,
  downloadChart,
};
