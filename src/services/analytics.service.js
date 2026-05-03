/**
 * Analytics Service
 * Genera resúmenes, estadísticas y gráficas a partir de datos
 */

/**
 * Calcula estadísticas básicas de un array numérico
 */
const calculateStats = (values) => {
  if (!values || values.length === 0) {
    return { count: 0, sum: 0, avg: 0, min: 0, max: 0, stdDev: 0 };
  }

  const count = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / count;
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[count - 1];

  // Desviación estándar
  const variance = values.reduce((a, v) => a + Math.pow(v - avg, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  return {
    count,
    sum: parseFloat(sum.toFixed(2)),
    avg: parseFloat(avg.toFixed(2)),
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2)),
    median: parseFloat(sorted[Math.floor(count / 2)].toFixed(2)),
  };
};

/**
 * Genera gráfica tipo "bar"
 * @param {string} title - Título de la gráfica
 * @param {array} data - Array de {label, value}
 * @returns {object} - Estructura para Chart.js
 */
export const generateBarChart = (title, data) => {
  return {
    type: 'bar',
    title,
    data: {
      labels: data.map(d => d.label),
      datasets: [
        {
          label: title,
          data: data.map(d => d.value),
          backgroundColor: '#3B82F6',
          borderColor: '#1E40AF',
          borderWidth: 1,
        },
      ],
    },
  };
};

/**
 * Genera gráfica tipo "line"
 */
export const generateLineChart = (title, data) => {
  return {
    type: 'line',
    title,
    data: {
      labels: data.map(d => d.label),
      datasets: [
        {
          label: title,
          data: data.map(d => d.value),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    },
  };
};

/**
 * Genera gráfica tipo "scatter"
 */
export const generateScatterChart = (title, data) => {
  return {
    type: 'scatter',
    title,
    data: {
      datasets: [
        {
          label: title,
          data: data.map(d => ({ x: d.x, y: d.y })),
          backgroundColor: '#F59E0B',
          borderColor: '#D97706',
          pointRadius: 5,
        },
      ],
    },
  };
};

/**
 * Genera gráfica tipo "pie"
 */
export const generatePieChart = (title, data) => {
  const colors = [
    '#FF6384',
    '#36A2EB',
    '#FFCE56',
    '#4BC0C0',
    '#9966FF',
    '#FF9F40',
  ];

  return {
    type: 'pie',
    title,
    data: {
      labels: data.map(d => d.label),
      datasets: [
        {
          data: data.map(d => d.value),
          backgroundColor: colors.slice(0, data.length),
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    },
  };
};

/**
 * Analiza array de objetos financieros
 * @param {array} items - Array con datos
 * @param {string} valueField - Campo para extraer valores
 * @returns {object} - Análisis completo
 */
export const analyzeFinancialData = (items, valueField = 'price') => {
  if (!items || items.length === 0) {
    return {
      count: 0,
      stats: {},
      topItems: [],
      message: 'No data to analyze',
    };
  }

  const values = items
    .map(item => parseFloat(item[valueField]))
    .filter(v => !isNaN(v));

  const stats = calculateStats(values);

  // Top 5 items (mayores valores)
  const topItems = [...items]
    .sort((a, b) => parseFloat(b[valueField]) - parseFloat(a[valueField]))
    .slice(0, 5);

  return {
    count: items.length,
    stats,
    topItems,
    distribution: generateDistribution(values),
  };
};

/**
 * Genera distribución de datos
 */
const generateDistribution = (values) => {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const buckets = 5;

  const distribution = Array(buckets).fill(0);

  values.forEach(v => {
    const bucketIndex = Math.min(
      buckets - 1,
      Math.floor(((v - min) / range) * buckets)
    );
    distribution[bucketIndex]++;
  });

  return distribution.map((count, i) => {
    const bucketMin = min + (i * range) / buckets;
    const bucketMax = min + ((i + 1) * range) / buckets;
    return {
      range: `${bucketMin.toFixed(2)} - ${bucketMax.toFixed(2)}`,
      count,
    };
  });
};

/**
 * Genera resumen en texto para resultados
 */
export const generateTextSummary = (items, query, valueField = 'symbol') => {
  if (!items || items.length === 0) {
    return `No se encontraron resultados para: "${query}"`;
  }

  if (typeof items === 'object' && items.type) {
    // Es una agregación
    return `📊 **Agregación**: ${items.type.toUpperCase()} = **${items.value}**\n(${items.count} elementos analizados)`;
  }

  const count = items.length;
  const itemList = items
    .slice(0, 3)
    .map(item => `• ${item[valueField] || JSON.stringify(item).substring(0, 50)}`)
    .join('\n');

  return `✅ Se encontraron **${count}** resultados:\n\n${itemList}${
    count > 3 ? `\n\n... y ${count - 3} más resultados` : ''
  }`;
};

/**
 * Formatea datos para respuesta JSON
 */
export const formatResponse = (data, query, includeCharts = false) => {
  const summary = generateTextSummary(data, query);
  const analysis = Array.isArray(data) ? analyzeFinancialData(data) : null;

  const response = {
    success: true,
    query,
    timestamp: new Date().toISOString(),
    count: Array.isArray(data) ? data.length : 1,
    summary,
    data,
  };

  if (analysis && includeCharts) {
    // Generar gráficas si hay múltiples items
    if (analysis.topItems.length > 0) {
      response.charts = [
        generateBarChart('Top Items', 
          analysis.topItems.slice(0, 10).map((item, i) => ({
            label: item.symbol || `Item ${i + 1}`,
            value: parseFloat(item.price || item.value || 0),
          }))
        ),
      ];
    }
  }

  return response;
};

export default {
  calculateStats,
  generateBarChart,
  generateLineChart,
  generateScatterChart,
  generatePieChart,
  analyzeFinancialData,
  generateTextSummary,
  formatResponse,
};
