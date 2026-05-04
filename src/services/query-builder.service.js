import boom from '@hapi/boom';
import { supabaseClient } from '../config/database';
import config from '../config/config';

/**
 * Query Builder Service
 * Convierte queries estructuradas → MongoDB o Supabase queries
 */

/**
 * Construye query para MongoDB
 * @param {object} parsedQuery - {entity, filters, fields, sort, limit, aggregation, fulltext, groupBy}
 * @param {Model} mongooseModel - Mongoose model
 * @returns {object} - Configuración de query
 */
export const buildMongoQuery = (parsedQuery, mongooseModel) => {
  const { 
    filters = {}, 
    fields = [], 
    sort = '-created_at', 
    limit = 50, 
    aggregation = null,
    fulltext = null,
    groupBy = null,
  } = parsedQuery;

  // ============================================
  // AGREGACIONES AVANZADAS (pipeline)
  // ============================================
  if (groupBy || aggregation?.advanced) {
    return buildAggregationPipeline(mongooseModel, {
      filters,
      fields,
      sort,
      limit,
      aggregation,
      groupBy,
      fulltext,
    });
  }

  // ============================================
  // QUERIES SIMPLES
  // ============================================
  let query = mongooseModel.find(filters);

  // Búsqueda full-text
  if (fulltext) {
    // Crear índice de texto si no existe
    if (mongooseModel.schema.indexes().every(idx => !idx[0].$text)) {
      mongooseModel.collection.createIndex({ headline: 'text', summary: 'text' });
    }
    query = mongooseModel.find({ $text: { $search: fulltext } });
  }

  // Seleccionar campos
  if (fields.length > 0) {
    query = query.select(fields.join(' '));
  }

  // Ordenamiento
  if (sort) {
    query = query.sort(sort);
  }

  // Límite
  if (limit && limit > 0) {
    query = query.limit(Math.min(limit, 500)); // Max 500
  }

  return { query, aggregation };
};

/**
 * Construye pipeline de agregación para MongoDB
 * @param {Model} mongooseModel - Mongoose model
 * @param {object} options - {filters, fields, sort, limit, aggregation, groupBy, fulltext}
 * @returns {object} - {query: aggregationPipeline, isAggregation: true}
 */
const buildAggregationPipeline = (mongooseModel, options) => {
  const { filters = {}, fields = [], sort = '-_id', limit = 50, aggregation = null, groupBy = null, fulltext = null } = options;

  const pipeline = [];

  // 1. Match (filtros)
  if (Object.keys(filters).length > 0) {
    pipeline.push({ $match: filters });
  }

  // 2. Full-text search
  if (fulltext) {
    pipeline.push({ 
      $match: { 
        $text: { $search: fulltext } 
      } 
    });
  }

  // 3. Group (si hay groupBy)
  if (groupBy) {
    const groupStage = {
      $group: {
        _id: `$${groupBy.field}`,
      },
    };

    // Agregar funciones de agregación
    if (aggregation?.type === 'avg') {
      groupStage.$group[`avg_${aggregation.field}`] = { $avg: `$${aggregation.field}` };
    }
    if (aggregation?.type === 'sum') {
      groupStage.$group[`sum_${aggregation.field}`] = { $sum: `$${aggregation.field}` };
    }
    if (aggregation?.type === 'max') {
      groupStage.$group[`max_${aggregation.field}`] = { $max: `$${aggregation.field}` };
    }
    if (aggregation?.type === 'min') {
      groupStage.$group[`min_${aggregation.field}`] = { $min: `$${aggregation.field}` };
    }
    groupStage.$group.count = { $sum: 1 };

    pipeline.push(groupStage);
  }

  // 4. Sort
  const sortObj = {};
  if (sort.startsWith('-')) {
    sortObj[sort.slice(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }
  pipeline.push({ $sort: sortObj });

  // 5. Limit
  if (limit && limit > 0) {
    pipeline.push({ $limit: Math.min(limit, 500) });
  }

  // 6. Project (campos a retornar)
  if (fields.length > 0) {
    const projectObj = { _id: 1 };
    fields.forEach(field => {
      projectObj[field] = 1;
    });
    pipeline.push({ $project: projectObj });
  }

  return {
    query: mongooseModel.aggregate(pipeline),
    aggregation,
    isAggregation: true,
  };
};

/**
 * Construye query para Supabase
 * @param {string} tableName - Nombre de tabla en Supabase
 * @param {object} parsedQuery - {entity, filters, fields, sort, limit}
 * @returns {object} - Builder de Supabase
 */
export const buildSupabaseQuery = (tableName, parsedQuery) => {
  const { filters = {}, fields = [], sort = 'created_at', limit = 50 } = parsedQuery;

  let query = supabaseClient
    .schema(config.SUPABASE_SCHEMA)
    .from(tableName);

  // Seleccionar campos
  if (fields.length > 0) {
    query = query.select(fields.join(','));
  } else {
    query = query.select('*');
  }

  // Aplicar filtros
  Object.entries(filters).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      // MongoDB operators: $lt, $gt, $lte, $gte, $eq, $ne
      if (value.$lt !== undefined) query = query.lt(key, value.$lt);
      if (value.$gt !== undefined) query = query.gt(key, value.$gt);
      if (value.$lte !== undefined) query = query.lte(key, value.$lte);
      if (value.$gte !== undefined) query = query.gte(key, value.$gte);
      if (value.$eq !== undefined) query = query.eq(key, value.$eq);
      if (value.$ne !== undefined) query = query.neq(key, value.$ne);
      if (value.$in !== undefined) query = query.in(key, value.$in);
    } else {
      // Comparación simple
      query = query.eq(key, value);
    }
  });

  // Ordenamiento
  const isDescending = sort.startsWith('-');
  const sortField = isDescending ? sort.slice(1) : sort;
  query = query.order(sortField, { ascending: !isDescending });

  // Límite
  if (limit && limit > 0) {
    query = query.limit(Math.min(limit, 500));
  }

  return query;
};

/**
 * Ejecuta query en MongoDB
 */
export const executeMongoQuery = async (mongoQuery, aggregation = null, isAggregation = false) => {
  let data;

  // Si es agregación (pipeline), ejecutar diferente
  if (isAggregation) {
    data = await mongoQuery.exec(); // Para agregaciones
  } else {
    data = await mongoQuery.exec(); // Para queries simples
  }

  // Aplicar agregaciones post-query (solo si no es pipeline)
  if (aggregation && !isAggregation) {
    data = applyAggregation(data, aggregation);
  }

  return data;
};

/**
 * Ejecuta query en Supabase
 */
export const executeSupabaseQuery = async (supabaseQuery) => {
  const { data, error } = await supabaseQuery;

  if (error) {
    throw boom.badData(`Supabase query error: ${error.message}`);
  }

  return data || [];
};

/**
 * Aplica agregaciones en memoria (para datos pequeños)
 */
const applyAggregation = (data, aggregation) => {
  if (!aggregation || !data || data.length === 0) return data;

  const { type, field } = aggregation;
  const values = data.map(d => d[field]).filter(v => v !== undefined && v !== null && typeof v === 'number');

  if (values.length === 0) return data;

  switch (type) {
    case 'avg':
      return {
        type: 'avg',
        field,
        value: parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(4)),
        count: values.length,
        data,
      };
    case 'sum':
      return {
        type: 'sum',
        field,
        value: parseFloat(values.reduce((a, b) => a + b, 0).toFixed(4)),
        count: values.length,
        data,
      };
    case 'max':
      return {
        type: 'max',
        field,
        value: Math.max(...values),
        count: values.length,
        data,
      };
    case 'min':
      return {
        type: 'min',
        field,
        value: Math.min(...values),
        count: values.length,
        data,
      };
    case 'count':
      return {
        type: 'count',
        value: values.length,
        data,
      };
    case 'stddev':
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      return {
        type: 'stddev',
        field,
        value: parseFloat(stdDev.toFixed(4)),
        count: values.length,
        mean: parseFloat(mean.toFixed(4)),
        data,
      };
    default:
      return data;
  }
};

/**
 * Resuelve entity name → MongoDB Model
 */
export const resolveMongooseModel = (entityName) => {
  // Mapeo de entidades a modelos
  const modelMap = {
    Fundamental: 'Fundamental',
    Position: 'Position',
    Order: 'Order',
    Strategy: 'Strategy',
    News: 'News',
    OptionChain: 'OptionChain',
    ClosedTrade: 'ClosedTrade',
    User: 'User',
    SignalEvent: 'SignalEvent',
    EventCalendar: 'EventCalendar',
    AlertLog: 'AlertLog',
    BrokerAccount: 'BrokerAccount',
  };

  if (!modelMap[entityName]) {
    throw boom.notFound(`Entity ${entityName} not found`);
  }

  return modelMap[entityName];
};

/**
 * Resuelve entity name → Supabase table
 */
export const resolveSupabaseTable = (entityName) => {
  const tableMap = {
    Fundamental: 'fundamentals',
    Position: 'positions',
    Order: 'orders',
    Strategy: 'strategies',
    News: 'news',
    OptionChain: 'option_chains',
    ClosedTrade: 'closed_trades',
    User: 'users',
    SignalEvent: 'signal_events',
    EventCalendar: 'event_calendars',
    AlertLog: 'alert_logs',
    BrokerAccount: 'broker_accounts',
  };

  if (!tableMap[entityName]) {
    throw boom.notFound(`Table for entity ${entityName} not found in Supabase`);
  }

  return tableMap[entityName];
};

export default {
  buildMongoQuery,
  buildSupabaseQuery,
  executeMongoQuery,
  executeSupabaseQuery,
  resolveMongooseModel,
  resolveSupabaseTable,
};
