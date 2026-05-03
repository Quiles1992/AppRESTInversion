import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const fundamentalSchema = new Schema(
  {
    // ===============================
    // IDENTIFICADOR
    // ===============================
    symbol:         { type: String, required: true, uppercase: true, trim: true, index: true },

    // ===============================
    // PRECIO Y DATOS EN VIVO
    // ===============================
    price:          { type: Number, default: 0 },
    bid:            { type: Number, default: 0 },
    ask:            { type: Number, default: 0 },
    last_update:    { type: Date, default: Date.now },
    
    // ===============================
    // FUNDAMENTALS FINANCIEROS
    // ===============================
    revenue_growth:     { type: Number, default: 0 }, // % anual
    revenue_ttm:        { type: Number, default: 0 }, // Trailing Twelve Months
    eps:                { type: Number, default: 0 }, // Earnings Per Share
    eps_surprise:       { type: Number, default: 0 }, // % de sorpresa
    guidance:           { type: String, trim: true },
    analyst_rating:     { type: String, trim: true }, // BUY, HOLD, SELL
    
    // Ratios financieros
    pe_ratio:           { type: Number, default: 0 }, // Price-to-Earnings
    ps_ratio:           { type: Number, default: 0 }, // Price-to-Sales
    pb_ratio:           { type: Number, default: 0 }, // Price-to-Book
    market_cap:         { type: Number, default: 0 },
    gross_margin:       { type: Number, default: 0 }, // %
    operating_margin:   { type: Number, default: 0 }, // %
    net_margin:         { type: Number, default: 0 }, // %
    
    // Retorno y deuda
    roe:                { type: Number, default: 0 }, // Return on Equity %
    roa:                { type: Number, default: 0 }, // Return on Assets %
    roic:               { type: Number, default: 0 }, // Return on Invested Capital %
    debt_to_equity:     { type: Number, default: 0 },
    current_ratio:      { type: Number, default: 0 }, // Liquidez
    quick_ratio:        { type: Number, default: 0 },
    
    // Dividendos
    dividend_yield:     { type: Number, default: 0 }, // %
    dividend_per_share: { type: Number, default: 0 },
    payout_ratio:       { type: Number, default: 0 }, // %
    
    // ===============================
    // INDICADORES TÉCNICOS
    // ===============================
    volatility:         { type: Number, default: 0 }, // Volatilidad anualizada (0-1)
    volatility_pct:     { type: Number, default: 0 }, // En porcentaje
    volatility_30d:     { type: Number, default: 0 },
    volatility_90d:     { type: Number, default: 0 },
    
    // Osciladores
    rsi_14:             { type: Number, default: null }, // RSI de 14 períodos
    rsi_overbought:     { type: Boolean, default: false }, // RSI > 70
    rsi_oversold:       { type: Boolean, default: false }, // RSI < 30
    
    // MACD
    macd:               { type: Number, default: null },
    macd_signal:        { type: Number, default: null },
    macd_histogram:     { type: Number, default: null },
    
    // Moving Averages
    ma_20:              { type: Number, default: 0 },
    ma_50:              { type: Number, default: 0 },
    ma_200:             { type: Number, default: 0 },
    price_above_ma20:   { type: Boolean, default: false },
    price_above_ma50:   { type: Boolean, default: false },
    price_above_ma200:  { type: Boolean, default: false },
    
    // ===============================
    // PERFORMANCE Y RETORNOS
    // ===============================
    performance_1d:     { type: Number, default: 0 }, // %
    performance_1w:     { type: Number, default: 0 }, // %
    performance_1m:     { type: Number, default: 0 }, // %
    performance_3m:     { type: Number, default: 0 }, // %
    performance_6m:     { type: Number, default: 0 }, // %
    performance_ytd:    { type: Number, default: 0 }, // % YTD
    performance_1y:     { type: Number, default: 0 }, // %
    
    // 52 semanas
    week_52_high:       { type: Number, default: 0 },
    week_52_low:        { type: Number, default: 0 },
    week_52_change_pct: { type: Number, default: 0 }, // %
    
    // ===============================
    // MÉTRICAS DE RIESGO
    // ===============================
    sharpe_ratio:       { type: Number, default: 0 }, // Retorno ajustado por riesgo
    sortino_ratio:      { type: Number, default: 0 }, // Como Sharpe pero solo downside
    max_drawdown:       { type: Number, default: 0 }, // % desde peak
    beta:               { type: Number, default: 1.0 }, // vs índice de mercado
    
    // ===============================
    // DATOS DE TRADING
    // ===============================
    volume_today:       { type: Number, default: 0 },
    volume_avg_30:      { type: Number, default: 0 }, // Promedio 30 días
    volume_ratio:       { type: Number, default: 0 }, // Volumen hoy vs promedio
    
    // ===============================
    // ANALYST DATA
    // ===============================
    analyst_price_target:   { type: Number, default: 0 },
    analyst_count:          { type: Number, default: 0 },
    analyst_consensus:      { type: String, trim: true }, // BUY, HOLD, SELL
    
    // ===============================
    // METADATOS
    // ===============================
    source:             { type: String, trim: true, default: 'alpaca' },
    captured_at:        { type: Date, default: Date.now },
    last_synced_at:     { type: Date, default: Date.now },
    data_quality:       { type: String, enum: ['complete', 'partial', 'incomplete'], default: 'partial' },
    
    // Raw payload (para debugging)
    raw_payload:        { type: Schema.Types.Mixed, default: {} },
  },
  { 
    versionKey: false, 
    collection: 'fundamentals',
    timestamps: true // Agrega createdAt y updatedAt automáticamente
  }
);

// Índices para búsquedas rápidas
fundamentalSchema.index({ symbol: 1, last_synced_at: -1 });
fundamentalSchema.index({ pe_ratio: 1 });
fundamentalSchema.index({ volatility: 1 });
fundamentalSchema.index({ rsi_14: 1 });
fundamentalSchema.index({ performance_1y: -1 });
fundamentalSchema.index({ market_cap: -1 });

export default models.Fundamental || model('Fundamental', fundamentalSchema);
