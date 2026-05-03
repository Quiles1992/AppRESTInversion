import boom from '@hapi/boom';
import { supabaseClient } from '../config/database';
import config from '../config/config';

/**
 * Query Builder Service
 * Convierte queries estructuradas → MongoDB o Supabase queries
 */

/**
 * Construye query para MongoDB
 * @param {object} parsedQuery - {entity, filters, fields, sort, limit, aggregation}
 * @param {Model} mongooseModel - Mongoose model
 * @returns {object} - Configuración de query
 */
export const buildMongoQuery = (parsedQuery, mongooseModel) => {
  const { filters = {}, fields = [], sort = '-created_at', limit = 50, aggregation = null } = parsedQuery;

  let query = mongooseModel.find(filters);

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
export const executeMongoQuery = async (mongoQuery, aggregation = null) => {
  let data = await mongoQuery.exec();

  // Aplicar agregaciones post-query
  if (aggregation) {
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
  const values = data.map(d => d[field]).filter(v => v !== undefined && v !== null);

  switch (type) {
    case 'avg':
      return {
        type: 'avg',
        field,
        value: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length,
      };
    case 'sum':
      return {
        type: 'sum',
        field,
        value: values.reduce((a, b) => a + b, 0),
        count: values.length,
      };
    case 'max':
      return {
        type: 'max',
        field,
        value: Math.max(...values),
        count: values.length,
      };
    case 'min':
      return {
        type: 'min',
        field,
        value: Math.min(...values),
        count: values.length,
      };
    case 'count':
      return {
        type: 'count',
        value: values.length,
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
