/**
 * Candlestick Chart Service
 * Genera gráficas de velas (OHLC) con indicadores técnicos
 * Soporta: Chart.js, formatos de exportación
 */

/**
 * Calcula Moving Average Simple
 * @param {array} closes - Array de precios de cierre
 * @param {number} period - Período de MA (20, 50, 200)
 * @returns {array} - Array de MA o null si no hay suficientes datos
 */
const calculateSMA = (closes, period) => {
  if (closes.length < period) return null;
  
  const sma = [];
  for (let i = period - 1; i < closes.length; i++) {
    const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  
  // Rellenar con nulls los primeros valores
  return Array(period - 1).fill(null).concat(sma);
};

/**
 * Calcula Bollinger Bands
 * @param {array} closes - Array de precios de cierre
 * @param {number} period - Período (default: 20)
 * @param {number} stdDev - Desviación estándar (default: 2)
 * @returns {object} - {upper, middle, lower}
 */
const calculateBollingerBands = (closes, period = 20, stdDev = 2) => {
  if (closes.length < period) return null;

  const middle = calculateSMA(closes, period);
  if (!middle) return null;

  const upper = [];
  const lower = [];

  for (let i = period - 1; i < closes.length; i++) {
    const sliced = closes.slice(i - period + 1, i + 1);
    const avg = sliced.reduce((a, b) => a + b, 0) / period;
    const variance = sliced.reduce((a, v) => a + Math.pow(v - avg, 2), 0) / period;
    const std = Math.sqrt(variance);

    upper.push(avg + stdDev * std);
    lower.push(avg - stdDev * std);
  }

  return {
    upper: Array(period - 1).fill(null).concat(upper),
    middle: middle,
    lower: Array(period - 1).fill(null).concat(lower),
  };
};

/**
 * Valida datos OHLC
 * @param {array} ohlcData - Array de {timestamp, open, high, low, close, volume}
 * @returns {boolean} - true si es válido
 */
const validateOHLCData = (ohlcData) => {
  if (!Array.isArray(ohlcData) || ohlcData.length === 0) {
    return false;
  }

  return ohlcData.every(bar => 
    bar.timestamp &&
    typeof bar.open === 'number' &&
    typeof bar.high === 'number' &&
    typeof bar.low === 'number' &&
    typeof bar.close === 'number' &&
    typeof bar.volume === 'number' &&
    bar.high >= bar.low &&
    bar.high >= bar.open &&
    bar.high >= bar.close &&
    bar.low <= bar.open &&
    bar.low <= bar.close
  );
};

/**
 * Genera gráfica Candlestick para Chart.js
 * @param {array} ohlcData - Datos OHLC: [{timestamp, open, high, low, close, volume}, ...]
 * @param {string} symbol - Símbolo (ej: AAPL)
 * @param {object} options - Opciones adicionales {showMA20, showMA50, showBollingerBands}
 * @returns {object} - Configuración Chart.js
 */
export const generateCandlestickChart = (ohlcData, symbol = 'ASSET', options = {}) => {
  // Validar datos
  if (!validateOHLCData(ohlcData)) {
    throw new Error('Invalid OHLC data format');
  }

  const {
    showMA20 = true,
    showMA50 = false,
    showBollingerBands = false,
    title = `Candlestick - ${symbol}`,
    height = 400,
  } = options;

  // Extraer closes para cálculos
  const closes = ohlcData.map(bar => bar.close);

  // Calcular indicadores
  const ma20 = showMA20 ? calculateSMA(closes, 20) : null;
  const ma50 = showMA50 ? calculateSMA(closes, 50) : null;
  const bbands = showBollingerBands ? calculateBollingerBands(closes, 20, 2) : null;

  // Formatear datos para candlestick
  const candleData = ohlcData.map(bar => ({
    x: new Date(bar.timestamp).toISOString().split('T')[0],
    o: parseFloat(bar.open.toFixed(2)),
    h: parseFloat(bar.high.toFixed(2)),
    l: parseFloat(bar.low.toFixed(2)),
    c: parseFloat(bar.close.toFixed(2)),
  }));

  // Construir datasets
  const datasets = [
    {
      label: symbol,
      data: candleData,
      type: 'candlestick',
      borderColor: '#1F2937',
      color: {
        up: '#10B981',   // Verde cuando cierra arriba
        down: '#EF4444',  // Rojo cuando cierra abajo
      },
    },
  ];

  // Agregar MA20
  if (ma20) {
    datasets.push({
      label: 'MA20',
      data: ma20.map((val, idx) => val ? parseFloat(val.toFixed(2)) : null),
      type: 'line',
      borderColor: '#F59E0B',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 1,
      fill: false,
      tension: 0.4,
      pointRadius: 0,
    });
  }

  // Agregar MA50
  if (ma50) {
    datasets.push({
      label: 'MA50',
      data: ma50.map((val, idx) => val ? parseFloat(val.toFixed(2)) : null),
      type: 'line',
      borderColor: '#8B5CF6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      borderWidth: 1,
      fill: false,
      tension: 0.4,
      pointRadius: 0,
    });
  }

  // Agregar Bollinger Bands
  if (bbands) {
    datasets.push({
      label: 'BB Upper',
      data: bbands.upper.map((val, idx) => val ? parseFloat(val.toFixed(2)) : null),
      type: 'line',
      borderColor: '#6366F1',
      borderWidth: 0.5,
      fill: false,
      tension: 0.4,
      pointRadius: 0,
      borderDash: [5, 5],
    });

    datasets.push({
      label: 'BB Lower',
      data: bbands.lower.map((val, idx) => val ? parseFloat(val.toFixed(2)) : null),
      type: 'line',
      borderColor: '#6366F1',
      borderWidth: 0.5,
      fill: false,
      tension: 0.4,
      pointRadius: 0,
      borderDash: [5, 5],
    });
  }

  return {
    type: 'candlestick',
    title,
    symbol,
    data: {
      labels: candleData.map(d => d.x),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      height,
      scales: {
        y: {
          title: {
            display: true,
            text: 'Precio (USD)',
          },
        },
        x: {
          title: {
            display: true,
            text: 'Fecha',
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        title: {
          display: true,
          text: title,
          font: { size: 16, weight: 'bold' },
        },
      },
    },
    metadata: {
      symbol,
      dataPoints: ohlcData.length,
      dateRange: {
        from: ohlcData[0].timestamp,
        to: ohlcData[ohlcData.length - 1].timestamp,
      },
      indicators: {
        ma20: showMA20,
        ma50: showMA50,
        bollingerBands: showBollingerBands,
      },
      stats: {
        highestClose: Math.max(...closes),
        lowestClose: Math.min(...closes),
        avgClose: closes.reduce((a, b) => a + b, 0) / closes.length,
        volatility: calculateVolatility(closes),
      },
    },
  };
};

/**
 * Calcula volatilidad (desviación estándar de retornos logarítmicos)
 * @param {array} closes - Array de precios de cierre
 * @returns {number} - Volatilidad anualizada
 */
const calculateVolatility = (closes) => {
  if (closes.length < 2) return 0;

  const returns = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, r) => a + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const annualizedVol = stdDev * Math.sqrt(252);

  return parseFloat(annualizedVol.toFixed(4));
};

/**
 * Detecta automáticamente qué tipo de gráfica usar
 * @param {array} data - Datos de resultados
 * @param {string} query - Query original del usuario
 * @returns {string} - Tipo de gráfica: 'candlestick' | 'bar' | 'line' | 'scatter'
 */
export const detectChartType = (data, query) => {
  const queryLower = query.toLowerCase();

  // Si hay datos OHLC y se menciona "gráfica" o "velas"
  if (
    (queryLower.includes('gráfica') || queryLower.includes('grafica') || queryLower.includes('chart')) &&
    (queryLower.includes('vela') || queryLower.includes('candlestick') || queryLower.includes('precio'))
  ) {
    return 'candlestick';
  }

  // Si es un top N, usar bar
  if (queryLower.includes('top') || queryLower.includes('top 10')) {
    return 'bar';
  }

  // Si es evolución/histórico, usar line
  if (
    queryLower.includes('evolución') || 
    queryLower.includes('evolucion') ||
    queryLower.includes('histórico') ||
    queryLower.includes('historico') ||
    queryLower.includes('tendencia')
  ) {
    return 'line';
  }

  // Por defecto, si hay muchos puntos, usar scatter
  if (Array.isArray(data) && data.length > 50) {
    return 'scatter';
  }

  return 'bar';
};

/**
 * Formatea datos para Bar Chart
 * @param {array} data - Array de datos
 * @param {string} xField - Campo para eje X (ej: 'symbol')
 * @param {string} yField - Campo para eje Y (ej: 'volatility')
 * @param {string} title - Título del gráfico
 * @returns {object} - Configuración Chart.js
 */
export const generateBarChart = (data, xField, yField, title = 'Bar Chart') => {
  const chartData = {
    type: 'bar',
    title,
    data: {
      labels: data.map(d => d[xField]),
      datasets: [
        {
          label: yField,
          data: data.map(d => parseFloat(d[yField].toFixed(2))),
          backgroundColor: '#3B82F6',
          borderColor: '#1E40AF',
          borderWidth: 1,
        },
      ],
    },
  };

  return chartData;
};

/**
 * Formatea datos para Line Chart
 * @param {array} data - Array de datos
 * @param {string} xField - Campo para eje X
 * @param {string} yField - Campo para eje Y
 * @param {string} title - Título
 * @returns {object} - Configuración Chart.js
 */
export const generateLineChart = (data, xField, yField, title = 'Line Chart') => {
  const chartData = {
    type: 'line',
    title,
    data: {
      labels: data.map(d => d[xField]),
      datasets: [
        {
          label: yField,
          data: data.map(d => parseFloat(d[yField].toFixed(2))),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
        },
      ],
    },
  };

  return chartData;
};

export default {
  generateCandlestickChart,
  detectChartType,
  generateBarChart,
  generateLineChart,
};
