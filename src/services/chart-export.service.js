/**
 * Chart Export Service
 * Exporta gráficas a PNG usando Canvas
 */

import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Directorio temporal para gráficas exportadas
 */
const EXPORTS_DIR = path.join(__dirname, '../../tmp/chart-exports');

// Crear directorio si no existe
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

/**
 * Exporta una gráfica Candlestick a PNG
 * @param {object} chartConfig - Configuración de Chart.js
 * @param {number} width - Ancho del canvas (default: 1200)
 * @param {number} height - Alto del canvas (default: 600)
 * @returns {object} - {filename, path, url}
 */
export const exportCandlestickToPNG = async (chartConfig, width = 1200, height = 600) => {
  try {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fondo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Título
    const title = chartConfig.title || 'Candlestick Chart';
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(title, 40, 40);

    // Padding
    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding - 20;

    // Obtener datos
    const data = chartConfig.data || {};
    const labels = data.labels || [];
    const datasets = data.datasets || [];

    if (labels.length === 0) {
      throw new Error('No data provided for chart');
    }

    // Calcular escala
    const allValues = [];
    datasets.forEach(ds => {
      if (ds.data && Array.isArray(ds.data)) {
        ds.data.forEach(point => {
          if (point && typeof point === 'object') {
            allValues.push(point.h || point.c || 0);
            allValues.push(point.l || point.c || 0);
          }
        });
      }
    });

    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue || 1;

    // Función para escalar precio a pixel
    const scalePrice = (price) => {
      return padding + chartHeight - ((price - minValue) / valueRange) * chartHeight;
    };

    // Función para escalar X
    const scaleX = (index) => {
      return padding + (index / (labels.length - 1)) * chartWidth;
    };

    // Dibujar grid horizontal
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();

      // Labels Y
      const value = maxValue - (i / 5) * valueRange;
      ctx.fillStyle = '#6B7280';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(value.toFixed(2), padding - 10, y + 4);
    }

    // Dibujar velas (candlesticks)
    const candleDataset = datasets[0];
    if (candleDataset && candleDataset.data) {
      const candleWidth = Math.max(2, chartWidth / labels.length * 0.6);

      candleDataset.data.forEach((candle, idx) => {
        if (!candle) return;

        const x = scaleX(idx);
        const open = scalePrice(candle.o);
        const high = scalePrice(candle.h);
        const low = scalePrice(candle.l);
        const close = scalePrice(candle.c);

        // Color: verde si sube, rojo si baja
        const isUp = candle.c >= candle.o;
        ctx.strokeStyle = isUp ? '#10B981' : '#EF4444';
        ctx.fillStyle = isUp ? '#10B981' : '#EF4444';

        // Línea high-low
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, high);
        ctx.lineTo(x, low);
        ctx.stroke();

        // Cuerpo de la vela
        const bodyTop = Math.min(open, close);
        const bodyHeight = Math.abs(close - open) || 1;
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
        ctx.strokeRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      });
    }

    // Dibujar líneas (MA, Bollinger Bands, etc)
    const lineColors = {
      'MA20': '#F59E0B',
      'MA50': '#8B5CF6',
      'BB Upper': '#6366F1',
      'BB Lower': '#6366F1',
    };

    datasets.slice(1).forEach(ds => {
      if (ds.type === 'line' && ds.data) {
        ctx.strokeStyle = lineColors[ds.label] || '#3B82F6';
        ctx.lineWidth = ds.borderWidth || 2;
        ctx.beginPath();

        let firstPoint = true;
        ds.data.forEach((value, idx) => {
          if (value === null || value === undefined) return;

          const x = scaleX(idx);
          const y = scalePrice(value);

          if (firstPoint) {
            ctx.moveTo(x, y);
            firstPoint = false;
          } else {
            ctx.lineTo(x, y);
          }
        });

        ctx.stroke();

        // Label en la leyenda
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(ds.label, padding + 10, 70 + datasets.indexOf(ds) * 20);
      }
    });

    // Leyenda (bottom)
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    const labelSpacing = chartWidth / Math.min(10, labels.length);
    for (let i = 0; i < Math.min(10, labels.length); i++) {
      const x = padding + i * labelSpacing;
      ctx.fillText(labels[i * Math.floor(labels.length / 10)], x, height - 10);
    }

    // Guardar PNG
    const timestamp = Date.now();
    const filename = `chart-${timestamp}.png`;
    const filepath = path.join(EXPORTS_DIR, filename);

    // Buffer de canvas a PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filepath, buffer);

    console.log(`✅ Gráfica exportada: ${filename}`);

    return {
      success: true,
      filename,
      path: filepath,
      url: `/api/v1/ai-query/chart-download/${filename}`,
      mimeType: 'image/png',
      size: fs.statSync(filepath).size,
    };
  } catch (error) {
    console.error('❌ Error exporting candlestick chart:', error.message);
    throw error;
  }
};

/**
 * Exporta una gráfica Bar Chart a PNG
 * @param {object} chartConfig - Configuración Chart.js
 * @param {number} width - Ancho
 * @param {number} height - Alto
 * @returns {object} - {filename, path, url}
 */
export const exportBarChartToPNG = async (chartConfig, width = 1200, height = 600) => {
  try {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fondo
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Título
    const title = chartConfig.title || 'Bar Chart';
    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(title, 40, 40);

    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding - 20;

    const data = chartConfig.data || {};
    const labels = data.labels || [];
    const datasets = data.datasets || [];

    if (labels.length === 0 || !datasets[0]) {
      throw new Error('No data provided');
    }

    // Escala
    const values = datasets[0].data || [];
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values, 0);
    const valueRange = maxValue - minValue || 1;

    const scaleValue = (value) => {
      return padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
    };

    // Grid horizontal
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i / 5) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
    }

    // Barras
    const barWidth = (chartWidth / labels.length) * 0.7;
    const barSpacing = chartWidth / labels.length;

    datasets[0].data.forEach((value, idx) => {
      const x = padding + idx * barSpacing + barSpacing / 2 - barWidth / 2;
      const y = scaleValue(value);
      const barHeight = scaleValue(0) - y;

      ctx.fillStyle = datasets[0].backgroundColor || '#3B82F6';
      ctx.fillRect(x, y, barWidth, barHeight);
      ctx.strokeStyle = datasets[0].borderColor || '#1E40AF';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barWidth, barHeight);

      // Valor sobre la barra
      ctx.fillStyle = '#1F2937';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(value.toFixed(2), x + barWidth / 2, y - 5);
    });

    // Labels X
    ctx.fillStyle = '#6B7280';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    labels.forEach((label, idx) => {
      const x = padding + idx * barSpacing + barSpacing / 2;
      ctx.fillText(label, x, height - 10);
    });

    // Guardar
    const timestamp = Date.now();
    const filename = `bar-chart-${timestamp}.png`;
    const filepath = path.join(EXPORTS_DIR, filename);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filepath, buffer);

    return {
      success: true,
      filename,
      path: filepath,
      url: `/api/v1/ai-query/chart-download/${filename}`,
    };
  } catch (error) {
    console.error('❌ Error exporting bar chart:', error.message);
    throw error;
  }
};

/**
 * Descarga una gráfica exportada
 * @param {string} filename - Nombre del archivo
 * @returns {object} - {buffer, mimeType}
 */
export const downloadChart = (filename) => {
  try {
    const filepath = path.join(EXPORTS_DIR, filename);

    if (!fs.existsSync(filepath)) {
      throw new Error(`File not found: ${filename}`);
    }

    const buffer = fs.readFileSync(filepath);
    return {
      success: true,
      buffer,
      mimeType: 'image/png',
    };
  } catch (error) {
    console.error('❌ Error downloading chart:', error.message);
    throw error;
  }
};

/**
 * Limpia archivos exportados antiguos (más de 24 horas)
 */
export const cleanupOldCharts = () => {
  try {
    const files = fs.readdirSync(EXPORTS_DIR);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas

    files.forEach(file => {
      const filepath = path.join(EXPORTS_DIR, file);
      const stats = fs.statSync(filepath);
      const age = now - stats.mtimeMs;

      if (age > maxAge) {
        fs.unlinkSync(filepath);
        console.log(`🧹 Eliminado: ${file}`);
      }
    });
  } catch (error) {
    console.error('❌ Error cleaning up charts:', error.message);
  }
};

export default {
  exportCandlestickToPNG,
  exportBarChartToPNG,
  downloadChart,
  cleanupOldCharts,
};
