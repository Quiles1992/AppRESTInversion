import { Router } from 'express';
import { queryWithAI, previewQuery, getSchema, exportChartToPNG, downloadChart } from '../controllers/ai-query.controller.js';

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
 *   "generateNLSummary": true/false,
 *   "skipCache": false
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

/**
 * POST /api/v1/ai-query/export-chart
 * Exporta una gráfica a PNG
 *
 * Body:
 * {
 *   "chartData": {...Chart.js config...},
 *   "chartType": "candlestick" | "bar" | "line",
 *   "width": 1200,
 *   "height": 600
 * }
 */
router.post('/export-chart', exportChartToPNG);

/**
 * GET /api/v1/ai-query/chart-download/:filename
 * Descarga un archivo PNG de gráfica exportada
 */
router.get('/chart-download/:filename', downloadChart);

export default router;
