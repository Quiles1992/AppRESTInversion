import boom from '@hapi/boom';
import config from '../config/config';
import { supabaseClient } from '../config/database';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT     = 500;

// Claves reservadas que NO son filtros de datos
const RESERVED_QUERY_KEYS = new Set(['page', 'limit', 'sort', 'DBServer']);

// Convierte un número, devuelve fallback si inválido
const parseNumber = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? fallback : parsed;
};

// Extrae solo los filtros de datos del query string
const normalizeFilters = (query = {}) =>
  Object.entries(query).reduce((filters, [key, value]) => {
    if (!RESERVED_QUERY_KEYS.has(key) && value !== undefined && value !== '') {
      filters[key] = value;
    }
    return filters;
  }, {});

// Decide qué BD usar según ?DBServer=mongodb|supabase
const resolveDbServer = (query = {}) => {
  const server = String(query.DBServer || 'mongodb').toLowerCase();
  return server === 'supabase' ? 'supabase' : 'mongodb';
};

// Verifica que Supabase esté configurado
const ensureSupabase = () => {
  if (!supabaseClient) {
    throw boom.failedDependency(
      'Supabase no esta configurado. Agrega SUPABASE_URL y SUPABASE_KEY al archivo .env.'
    );
  }
};

// Aplica filtros eq() a un query de Supabase
const applySupabaseFilters = (builder, filters) =>
  Object.entries(filters).reduce(
    (request, [key, value]) => request.eq(key, value),
    builder
  );

// Convierte 'sort' en { column, ascending } para Supabase
const parseSort = (sort = '-created_at') => {
  const isDescending = sort.startsWith('-');
  return {
    column:    isDescending ? sort.slice(1) : sort,
    ascending: !isDescending,
  };
};

// =============================================
// FACTORY — crea un servicio CRUD completo
// Params:
//   Model     — modelo Mongoose
//   tableName — nombre de tabla en Supabase
//   idColumn  — columna PK en Supabase (default: 'id')
// =============================================
const createCrudService = ({ Model, tableName, idColumn = 'id' }) => ({

  // GET ALL — con paginación, ordenamiento y filtros
  async findAll(query = {}) {
    const dbServer = resolveDbServer(query);
    const limit   = Math.min(parseNumber(query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const page    = parseNumber(query.page, 1);
    const skip    = (page - 1) * limit;
    const sort    = query.sort || '-created_at';
    const filters = normalizeFilters(query);

    if (dbServer === 'supabase') {
      ensureSupabase();
      const { column, ascending } = parseSort(sort);
      let request = supabaseClient
        .schema(config.SUPABASE_SCHEMA)
        .from(tableName)
        .select('*')
        .range(skip, skip + limit - 1)
        .order(column, { ascending });
      request = applySupabaseFilters(request, filters);
      const { data, error } = await request;
      if (error) throw boom.badImplementation(error.message);
      return data;
    }

    // MongoDB
    return Model.find(filters).sort(sort).skip(skip).limit(limit);
  },

  // GET BY ID
  async findById(id, query = {}) {
    const dbServer = resolveDbServer(query);

    if (dbServer === 'supabase') {
      ensureSupabase();
      const { data, error } = await supabaseClient
        .schema(config.SUPABASE_SCHEMA)
        .from(tableName)
        .select('*')
        .eq(idColumn, id)
        .maybeSingle();
      if (error) throw boom.badImplementation(error.message);
      if (!data)  throw boom.notFound(`${tableName} not found`);
      return data;
    }

    // MongoDB
    const document = await Model.findById(id);
    if (!document) throw boom.notFound(`${Model.modelName} not found`);
    return document;
  },

  // POST — crear registro
  async create(payload, query = {}) {
    const dbServer = resolveDbServer(query);

    if (dbServer === 'supabase') {
      ensureSupabase();
      // Campos embebidos de MongoDB que NO existen como columnas en Supabase
      // risk_config y broker_accounts son tablas separadas en Supabase
      const SUPABASE_EMBEDDED_FIELDS = ['risk_config', 'broker_accounts'];
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).filter(([key]) => !SUPABASE_EMBEDDED_FIELDS.includes(key))
      );
      const { data, error } = await supabaseClient
        .schema(config.SUPABASE_SCHEMA)
        .from(tableName)
        .insert([cleanPayload])
        .select('*')
        .single();
      if (error) throw boom.badImplementation(error.message);
      return data;
    }

    // MongoDB
    return Model.create(payload);
  },

  // PUT — actualizar registro
  async update(id, payload, query = {}) {
    const dbServer = resolveDbServer(query);

    if (dbServer === 'supabase') {
      ensureSupabase();
      const { data, error } = await supabaseClient
        .schema(config.SUPABASE_SCHEMA)
        .from(tableName)
        .update(payload)
        .eq(idColumn, id)
        .select('*')
        .maybeSingle();
      if (error) throw boom.badImplementation(error.message);
      if (!data)  throw boom.notFound(`${tableName} not found`);
      return data;
    }

    // MongoDB
    const document = await Model.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!document) throw boom.notFound(`${Model.modelName} not found`);
    return document;
  },

  // DELETE — eliminar registro
  async remove(id, query = {}) {
    const dbServer = resolveDbServer(query);

    if (dbServer === 'supabase') {
      ensureSupabase();
      const { data, error } = await supabaseClient
        .schema(config.SUPABASE_SCHEMA)
        .from(tableName)
        .delete()
        .eq(idColumn, id)
        .select('*')
        .maybeSingle();
      if (error) throw boom.badImplementation(error.message);
      if (!data)  throw boom.notFound(`${tableName} not found`);
      return data;
    }

    // MongoDB
    const document = await Model.findByIdAndDelete(id);
    if (!document) throw boom.notFound(`${Model.modelName} not found`);
    return document;
  },
});

export default createCrudService;
