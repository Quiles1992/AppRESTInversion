import { Router } from 'express';
import { queryWithAI, previewQuery, getSchema } from '../controllers/ai-query.controller.js';

const router = Router();

/**
 * POST /api/v1/ai-query
 * Principal endpoint: consulta en lenguaje natural
 *
 * Body:
 * {
 *   "query": "Dame empresas con volatilidad baja",
 *   "dbServer": "mongodb" | "supabase",
 *   "includeAlpaca": true/false,
 *   "includeCharts": true/false,
 *   "generateNLSummary": true/false
 * }
 */
router.post('/', queryWithAI);

/**
 * POST /api/v1/ai-query/preview
 * Preview: ver la query interpretada sin ejecutarla
 * Útil para debugging, validación
 *
 * Body:
 * {
 *   "query": "Dame empresas con volatilidad baja"
 * }
 */
router.post('/preview', previewQuery);

/**
 * GET /api/v1/ai-query/schema
 * Obtener el schema disponible
 * Para client-side auto-complete, validation, help
 */
router.get('/schema', getSchema);

export default router;
