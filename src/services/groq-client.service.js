import Groq from 'groq-sdk';
import config from '../config/config';

/**
 * Groq Client Service
 * Wrapper singleton para Groq API
 * Transforma queries en lenguaje natural → JSON estructurado
 */

let groqInstance = null;

const getGroqClient = () => {
  if (!groqInstance) {
    if (!config.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY no configurado en .env');
    }
    groqInstance = new Groq({ apiKey: config.GROQ_API_KEY });
  }
  return groqInstance;
};

/**
 * Interpreta una query en lenguaje natural
 * @param {string} query - Query del usuario: "Dame empresas con volatilidad baja"
 * @param {string} schemaContext - Schema de BD disponible (JSON stringified)
 * @returns {object} - {entity, filters, fields, sort, limit, aggregation}
 */
export const interpretNLQuery = async (query, schemaContext) => {
  const groq = getGroqClient();

  const systemPrompt = `You are an expert at converting natural language queries into structured JSON for financial database queries.

Available database schema:
${schemaContext}

IMPORTANT RULES:
1. Always respond with ONLY valid JSON (no markdown, no extra text)
2. Use lowercase field names
3. For filters: use MongoDB operators like {field: {$lt: value}}
4. For date ranges: use {field: {$gte: startDate, $lte: endDate}}
5. If user asks for "top 10", use {limit: 10, sort: "-field"}
6. Support aggregations: {aggregation: "avg", field: "pe_ratio"}
7. For Spanish queries, translate automatically to field names

Response format MUST be:
{
  "entity": "ModelName",
  "filters": {...},
  "fields": ["field1", "field2"],
  "sort": "fieldname or -fieldname",
  "limit": number,
  "aggregation": null or {type: "avg|sum|count", field: "name"}
}`;

  try {
    const message = await groq.messages.create({
      model: config.GROQ_MODEL,
      max_tokens: config.GROQ_MAX_TOKENS,
      temperature: config.GROQ_TEMPERATURE,
      messages: [
        {
          role: 'user',
          content: `Convert this query to structured JSON:\n"${query}"`,
        },
      ],
      system: systemPrompt,
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // Limpiar respuesta (a veces Groq agrega markdown)
    const cleanedText = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const structuredQuery = JSON.parse(cleanedText);
    return structuredQuery;
  } catch (error) {
    console.error('❌ Groq interpretation error:', error.message);
    throw new Error(`AI interpretation failed: ${error.message}`);
  }
};

/**
 * Genera un resumen analítico de datos
 * @param {array} data - Array de resultados
 * @param {string} query - Query original del usuario
 * @returns {string} - Resumen en lenguaje natural
 */
export const generateSummary = async (data, query) => {
  const groq = getGroqClient();

  try {
    const message = await groq.messages.create({
      model: config.GROQ_MODEL,
      max_tokens: 500,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `Generate a brief financial summary (Spanish) for this data:\n\nQuery: "${query}"\n\nData: ${JSON.stringify(
            data.slice(0, 10)
          )}\n\nBe concise and highlight key insights.`,
        },
      ],
    });

    return message.content[0].type === 'text' ? message.content[0].text : '';
  } catch (error) {
    console.error('❌ Groq summary error:', error.message);
    return 'Summary generation failed';
  }
};

/**
 * Valida si una query es segura (anti-injection)
 * @param {object} parsedQuery - Query parseada por Groq
 * @param {array} allowedFields - Campos permitidos por entidad
 * @returns {boolean}
 */
export const validateQuerySafety = (parsedQuery, allowedFields = []) => {
  // Validar que los campos están en whitelist
  if (allowedFields.length > 0) {
    const queryFields = [
      ...Object.keys(parsedQuery.filters || {}),
      ...(parsedQuery.fields || []),
      ...(parsedQuery.aggregation ? [parsedQuery.aggregation.field] : []),
    ];

    const invalidFields = queryFields.filter(f => !allowedFields.includes(f));
    if (invalidFields.length > 0) {
      return false;
    }
  }

  // No permitir comandos peligrosos
  const dangerousPatterns = ['$where', '$function', 'eval', 'constructor'];
  const queryStr = JSON.stringify(parsedQuery);
  if (dangerousPatterns.some(p => queryStr.includes(p))) {
    return false;
  }

  return true;
};

export default {
  getGroqClient,
  interpretNLQuery,
  generateSummary,
  validateQuerySafety,
};
