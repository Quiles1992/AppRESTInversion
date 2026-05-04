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
    // AQUI ESTABA EL ERROR: Cambiado al formato correcto de Groq/OpenAI
    const chatCompletion = await groq.chat.completions.create({
      model: config.GROQ_MODEL || 'llama3-8b-8192', // Fallback por si falta en .env
      max_tokens: config.GROQ_MAX_TOKENS ? parseInt(config.GROQ_MAX_TOKENS) : 1024,
      temperature: config.GROQ_TEMPERATURE ? parseFloat(config.GROQ_TEMPERATURE) : 0,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Convert this query to structured JSON:\n"${query}"`,
        },
      ],
    });

    // AQUI ESTABA EL OTRO ERROR: Extrayendo la respuesta al estilo Groq
    const responseText = chatCompletion.choices[0]?.message?.content || '';
    
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
 */
export const generateSummary = async (data, query) => {
  const groq = getGroqClient();

  try {
    // También arreglado aquí para generar el resumen
    const chatCompletion = await groq.chat.completions.create({
      model: config.GROQ_MODEL || 'llama3-8b-8192',
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

    return chatCompletion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('❌ Groq summary error:', error.message);
    return 'Summary generation failed';
  }
};

/**
 * Valida si una query es segura (anti-injection)
 */
export const validateQuerySafety = (parsedQuery, allowedFields = []) => {
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