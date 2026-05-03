import axios from 'axios';
import config from '../config/config';

/**
 * Alpaca Connector Service
 * Obtiene datos bursátiles de Alpaca Markets API
 */

const alpacaClient = axios.create({
  baseURL: config.ALPACA_BASE_URL,
  headers: {
    'APCA-API-KEY-ID': config.ALPACA_API_KEY,
  },
});

/**
 * Obtiene el precio actual de un símbolo
 * @param {string} symbol - ej: "AAPL"
 * @returns {object} - {symbol, price, timestamp}
 */
export const getLatestPrice = async (symbol) => {
  try {
    const response = await alpacaClient.get(`/v1/last/stocks/${symbol.toUpperCase()}`);
    const quote = response.data.last;

    return {
      symbol: symbol.toUpperCase(),
      price: quote.price,
      bid: quote.bid,
      ask: quote.ask,
      timestamp: new Date(quote.timestamp).toISOString(),
    };
  } catch (error) {
    console.error(`❌ Error fetching price for ${symbol}:`, error.message);
    return null;
  }
};

/**
 * Obtiene datos históricos (bars) de un símbolo
 * @param {string} symbol - ej: "AAPL"
 * @param {string} timeframe - ej: "1h", "1d"
 * @param {number} limit - Número de barras (default: 100)
 * @returns {array} - Array de bars con OHLCV
 */
export const getBars = async (symbol, timeframe = '1d', limit = 100) => {
  try {
    const response = await alpacaClient.get(`/v1/stocks/${symbol.toUpperCase()}/bars`, {
      params: {
        timeframe,
        limit,
      },
    });

    return response.data.bars.map(bar => ({
      symbol: symbol.toUpperCase(),
      timestamp: new Date(bar.t).toISOString(),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
    }));
  } catch (error) {
    console.error(`❌ Error fetching bars for ${symbol}:`, error.message);
    return [];
  }
};

/**
 * Calcula volatilidad histórica (desviación estándar de retornos)
 * @param {string} symbol - ej: "AAPL"
 * @param {number} days - Días para calcular (default: 30)
 * @returns {object} - {symbol, volatility, avgClose, minClose, maxClose}
 */
export const calculateVolatility = async (symbol, days = 30) => {
  try {
    const bars = await getBars(symbol, '1d', days);

    if (bars.length < 2) {
      return null;
    }

    const closes = bars.map(b => b.close);

    // Calcular retornos logarítmicos
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }

    // Desviación estándar (volatilidad)
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, r) => a + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const annualizedVol = stdDev * Math.sqrt(252); // 252 trading days

    return {
      symbol: symbol.toUpperCase(),
      volatility: parseFloat(annualizedVol.toFixed(4)),
      volatilityPct: parseFloat((annualizedVol * 100).toFixed(2)),
      avgClose: parseFloat((closes.reduce((a, b) => a + b) / closes.length).toFixed(2)),
      minClose: parseFloat(Math.min(...closes).toFixed(2)),
      maxClose: parseFloat(Math.max(...closes).toFixed(2)),
      daysAnalyzed: bars.length,
    };
  } catch (error) {
    console.error(`❌ Error calculating volatility for ${symbol}:`, error.message);
    return null;
  }
};

/**
 * Obtiene posiciones del usuario (en paper trading)
 * @returns {array} - Array de posiciones abiertas
 */
export const getPositions = async () => {
  try {
    const response = await alpacaClient.get('/v1/positions');
    return response.data.map(pos => ({
      symbol: pos.symbol,
      qty: parseFloat(pos.qty),
      side: pos.side,
      entryPrice: parseFloat(pos.avg_fill_price),
      currentPrice: parseFloat(pos.current_price),
      unrealizedPnl: parseFloat(pos.unrealized_pl),
      unrealizedPnlPct: parseFloat(pos.unrealized_plpc) * 100,
    }));
  } catch (error) {
    console.error('❌ Error fetching positions:', error.message);
    return [];
  }
};

/**
 * Obtiene información de cuenta (equity, buying_power, etc)
 * @returns {object} - Datos de cuenta
 */
export const getAccountInfo = async () => {
  try {
    const response = await alpacaClient.get('/v1/account');
    return {
      equity: parseFloat(response.data.equity),
      buyingPower: parseFloat(response.data.buying_power),
      cash: parseFloat(response.data.cash),
      portfolioValue: parseFloat(response.data.portfolio_value),
      dayTradeCount: response.data.daytrade_count,
      accountStatus: response.data.account_status,
    };
  } catch (error) {
    console.error('❌ Error fetching account info:', error.message);
    return null;
  }
};

/**
 * Obtiene órdenes recientes
 * @param {number} limit - Número de órdenes (default: 50)
 * @returns {array}
 */
export const getOrders = async (limit = 50) => {
  try {
    const response = await alpacaClient.get('/v1/orders', {
      params: { limit, status: 'all' },
    });

    return response.data.map(order => ({
      id: order.id,
      symbol: order.symbol,
      qty: parseFloat(order.qty),
      side: order.side,
      orderType: order.order_type,
      status: order.status,
      filledAt: order.filled_at,
      filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
      createdAt: order.created_at,
    }));
  } catch (error) {
    console.error('❌ Error fetching orders:', error.message);
    return [];
  }
};

/**
 * Calcula RSI (Relative Strength Index)
 * Rango: 0-100. <30 sobrevendido, >70 sobrecomprado
 * @param {array} bars - Array de barras con {close}
 * @param {number} period - Período del RSI (default: 14)
 * @returns {number} - Valor del RSI
 */
export const calculateRSI = (bars, period = 14) => {
  if (!bars || bars.length < period + 1) return null;

  const closes = bars.map(b => b.close);
  const changes = [];

  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;

  let rs = avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));

  // Smooth remaining values
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    rs = avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
  }

  return parseFloat(rsi.toFixed(2));
};

/**
 * Calcula Moving Averages
 * @param {array} bars - Array de barras con {close}
 * @param {number} period20 - Período MA20 (default: 20)
 * @param {number} period50 - Período MA50 (default: 50)
 * @returns {object} - {ma20, ma50, ma200}
 */
export const calculateMovingAverages = (bars, period20 = 20, period50 = 50) => {
  if (!bars || bars.length < Math.max(period20, period50)) {
    return { ma20: null, ma50: null, ma200: null };
  }

  const closes = bars.map(b => b.close);

  const calculateMA = (data, period) => {
    if (data.length < period) return null;
    const sum = data.slice(-period).reduce((a, b) => a + b, 0);
    return parseFloat((sum / period).toFixed(2));
  };

  return {
    ma20: calculateMA(closes, period20),
    ma50: calculateMA(closes, period50),
    ma200: calculateMA(closes, Math.min(200, closes.length)),
  };
};

/**
 * Calcula MACD (Moving Average Convergence Divergence)
 * @param {array} bars - Array de barras con {close}
 * @returns {object} - {macd, signal, histogram}
 */
export const calculateMACD = (bars) => {
  if (!bars || bars.length < 26) return null;

  const closes = bars.map(b => b.close);

  const ema = (data, period) => {
    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b) / period;

    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }
    return ema;
  };

  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macd = ema12 - ema26;

  // Signal line (EMA de 9 períodos del MACD)
  const macdValues = [];
  for (let i = 25; i < closes.length; i++) {
    const e12 = ema(closes.slice(0, i + 1), 12);
    const e26 = ema(closes.slice(0, i + 1), 26);
    macdValues.push(e12 - e26);
  }

  const signal = ema(macdValues, 9);
  const histogram = macd - signal;

  return {
    macd: parseFloat(macd.toFixed(4)),
    signal: parseFloat(signal.toFixed(4)),
    histogram: parseFloat(histogram.toFixed(4)),
  };
};

/**
 * Calcula Sharpe Ratio
 * Mide retorno ajustado por riesgo
 * @param {array} returns - Array de retornos diarios
 * @param {number} riskFreeRate - Tasa libre de riesgo (default: 0.02 = 2% anual)
 * @returns {number} - Sharpe Ratio anualizado
 */
export const calculateSharpeRatio = (returns, riskFreeRate = 0.02) => {
  if (!returns || returns.length < 2) return null;

  const avgReturn = returns.reduce((a, b) => a + b) / returns.length;
  const variance = returns.reduce((a, r) => a + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  const dailyRiskFreeRate = riskFreeRate / 252;
  const sharpeRatio = (avgReturn - dailyRiskFreeRate) / stdDev * Math.sqrt(252);

  return parseFloat(sharpeRatio.toFixed(2));
};

/**
 * Calcula Sortino Ratio (como Sharpe pero solo downside volatility)
 * @param {array} returns - Array de retornos diarios
 * @param {number} targetReturn - Retorno mínimo objetivo (default: 0)
 * @returns {number} - Sortino Ratio anualizado
 */
export const calculateSortinoRatio = (returns, targetReturn = 0) => {
  if (!returns || returns.length < 2) return null;

  const avgReturn = returns.reduce((a, b) => a + b) / returns.length;
  
  // Solo contar volatilidad negativa (downsides)
  const downside = returns
    .filter(r => r < targetReturn)
    .reduce((a, r) => a + Math.pow(r - targetReturn, 2), 0) / returns.length;

  const downsideStdDev = Math.sqrt(downside);
  if (downsideStdDev === 0) return null;

  const sortinoRatio = (avgReturn - targetReturn) / downsideStdDev * Math.sqrt(252);

  return parseFloat(sortinoRatio.toFixed(2));
};

/**
 * Calcula Max Drawdown (mayor pérdida desde peak)
 * @param {array} bars - Array de barras con {close}
 * @returns {number} - Max Drawdown en porcentaje
 */
export const calculateMaxDrawdown = (bars) => {
  if (!bars || bars.length < 2) return null;

  const closes = bars.map(b => b.close);
  let maxDD = 0;
  let peak = closes[0];

  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > peak) {
      peak = closes[i];
    }
    const dd = (closes[i] - peak) / peak;
    if (dd < maxDD) {
      maxDD = dd;
    }
  }

  return parseFloat((maxDD * 100).toFixed(2));
};

/**
 * Obtiene desempeño del día anterior
 * @param {string} symbol - Ticker
 * @returns {object} - {pct_change, volume, high, low}
 */
export const getPreviousDayPerformance = async (symbol) => {
  try {
    const bars = await getBars(symbol, '1d', 2);
    if (bars.length < 2) return null;

    const prevClose = bars[0].close;
    const currClose = bars[1].close;
    const pctChange = ((currClose - prevClose) / prevClose) * 100;

    return {
      pct_change: parseFloat(pctChange.toFixed(2)),
      volume: bars[1].volume,
      high: bars[1].high,
      low: bars[1].low,
      close: currClose,
    };
  } catch (error) {
    console.error(`❌ Error fetching previous day performance for ${symbol}:`, error.message);
    return null;
  }
};

/**
 * Calcula correlación entre dos símbolos
 * @param {string} symbol1 - Primer símbolo
 * @param {string} symbol2 - Segundo símbolo
 * @param {number} days - Días para calcular (default: 30)
 * @returns {number} - Correlación (-1 a 1)
 */
export const calculateCorrelation = async (symbol1, symbol2, days = 30) => {
  try {
    const bars1 = await getBars(symbol1, '1d', days);
    const bars2 = await getBars(symbol2, '1d', days);

    if (bars1.length !== bars2.length || bars1.length < 2) return null;

    // Calcular retornos
    const returns1 = [];
    const returns2 = [];

    for (let i = 1; i < bars1.length; i++) {
      returns1.push(Math.log(bars1[i].close / bars1[i - 1].close));
      returns2.push(Math.log(bars2[i].close / bars2[i - 1].close));
    }

    // Correlación de Pearson
    const mean1 = returns1.reduce((a, b) => a + b) / returns1.length;
    const mean2 = returns2.reduce((a, b) => a + b) / returns2.length;

    let covariance = 0;
    let var1 = 0;
    let var2 = 0;

    for (let i = 0; i < returns1.length; i++) {
      covariance += (returns1[i] - mean1) * (returns2[i] - mean2);
      var1 += Math.pow(returns1[i] - mean1, 2);
      var2 += Math.pow(returns2[i] - mean2, 2);
    }

    covariance /= returns1.length;
    var1 /= returns1.length;
    var2 /= returns1.length;

    const correlation = covariance / (Math.sqrt(var1) * Math.sqrt(var2));

    return parseFloat(correlation.toFixed(4));
  } catch (error) {
    console.error(`❌ Error calculating correlation:`, error.message);
    return null;
  }
};

/**
 * Obtiene información de trading del símbolo
 * Combinación de todas las métricas
 * @param {string} symbol - Ticker
 * @param {number} days - Días para análisis (default: 30)
 * @returns {object} - Resumen técnico completo
 */
export const getCompleteTechnicalAnalysis = async (symbol, days = 30) => {
  try {
    const bars = await getBars(symbol, '1d', days);
    if (bars.length < 2) return null;

    const closes = bars.map(b => b.close);
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(Math.log(closes[i] / closes[i - 1]));
    }

    const volatility = await calculateVolatility(symbol, days);
    const rsi = calculateRSI(bars);
    const ma = calculateMovingAverages(bars);
    const macd = calculateMACD(bars);
    const sharpe = calculateSharpeRatio(returns);
    const sortino = calculateSortinoRatio(returns);
    const maxDD = calculateMaxDrawdown(bars);
    const prevDay = await getPreviousDayPerformance(symbol);

    return {
      symbol: symbol.toUpperCase(),
      timestamp: new Date().toISOString(),
      price: closes[closes.length - 1],
      
      // Volatilidad
      volatility: volatility?.volatilityPct,
      
      // Indicadores técnicos
      rsi_14: rsi,
      macd: macd?.macd,
      macd_signal: macd?.signal,
      macd_histogram: macd?.histogram,
      
      // Moving Averages
      ma20: ma.ma20,
      ma50: ma.ma50,
      ma200: ma.ma200,
      
      // Retorno y riesgo
      sharpe_ratio: sharpe,
      sortino_ratio: sortino,
      max_drawdown: maxDD,
      
      // Performance
      change_1d_pct: prevDay?.pct_change,
      volume: prevDay?.volume,
      
      // Análisis temporal
      days_analyzed: bars.length,
    };
  } catch (error) {
    console.error(`❌ Error getting technical analysis for ${symbol}:`, error.message);
    return null;
  }
};

export default {
  getLatestPrice,
  getBars,
  calculateVolatility,
  calculateRSI,
  calculateMovingAverages,
  calculateMACD,
  calculateSharpeRatio,
  calculateSortinoRatio,
  calculateMaxDrawdown,
  getPreviousDayPerformance,
  calculateCorrelation,
  getCompleteTechnicalAnalysis,
  getPositions,
  getAccountInfo,
  getOrders,
};
