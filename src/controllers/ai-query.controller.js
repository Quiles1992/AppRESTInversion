import boom from '@hapi/boom';
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

/**
 * AI Query Controller
 * Orquesta el flujo: NL Query → Groq → QueryBuilder → Execute → Analytics
 */

/**
 * POST /ai-query
 * Endpoint principal de consultas en lenguaje natural
 */
export const queryWithAI = async (req, res, next) => {
  try {
    const { query, dbServer = 'mongodb', includeAlpaca = false, includeCharts = false } = req.body;

    // Validar input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw boom.badRequest('Query parameter is required and must be non-empty');
    }

    // 1. INTERPRET: Groq transforma query natural → JSON estructurado
    console.log(`📝 Query recibida: "${query}"`);
    const parsedQuery = await interpretNLQuery(query, schemaContext);
    console.log(`🤖 Groq interpretó como:`, JSON.stringify(parsedQuery, null, 2));

    // 2. RESOLVE: Determinar si es MongoDB o Supabase
    const useSupabase = dbServer.toLowerCase() === 'supabase';

    // 3. SECURITY: Validar campos permitidos
    const allowedFields = getAllowedFields(parsedQuery.entity);
    if (!validateQuerySafety(parsedQuery, allowedFields)) {
      throw boom.badRequest('Query contains invalid fields or dangerous patterns');
    }

    // 4. BUILD & EXECUTE: Construir y ejecutar query según BD
    let data;

    if (useSupabase) {
      const tableName = resolveSupabaseTable(parsedQuery.entity);
      const supabaseQuery = buildSupabaseQuery(tableName, parsedQuery);
      data = await executeSupabaseQuery(supabaseQuery);
    } else {
      const modelName = resolveMongooseModel(parsedQuery.entity);
      const Model = require(`../models/${modelName}`).default;
      const { query: mongoQuery, aggregation } = buildMongoQuery(parsedQuery, Model);
      data = await executeMongoQuery(mongoQuery, aggregation);
    }

    console.log(`✅ Ejecutada exitosamente. Resultados: ${Array.isArray(data) ? data.length : 1}`);

    // 5. ENRICH: Agregar datos de Alpaca si se solicita
    if (includeAlpaca && Array.isArray(data) && data.length > 0) {
      console.log(`🚀 Enriqueciendo con datos de Alpaca...`);
      data = await enrichWithAlpacaData(data, parsedQuery.entity);
    }

    // 6. ANALYTICS: Generar resumen + gráficas
    const response = formatResponse(data, query, includeCharts);

    // 7. AI SUMMARY: Generar resumen en lenguaje natural (opcional, lento)
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

export default {
  queryWithAI,
  previewQuery,
  getSchema,
};
