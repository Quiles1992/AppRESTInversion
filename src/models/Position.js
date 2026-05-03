import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const positionSchema = new Schema(
  {
    // ===============================
    // RELACIONES
    // ===============================
    user_id:            { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order_id:           { type: Schema.Types.ObjectId, ref: 'Order' },

    // ===============================
    // IDENTIFICADOR
    // ===============================
    symbol:             { type: String, required: true, uppercase: true, trim: true, index: true },
    side:               { type: String, required: true, enum: ['LONG', 'SHORT'] },
    asset_type:         { type: String, default: 'STOCK', enum: ['STOCK', 'ETF', 'CRYPTO', 'OPTION'] },

    // ===============================
    // ENTRADA Y MONTOS
    // ===============================
    quantity:           { type: Number, required: true, min: 0 },
    entry_price:        { type: Number, required: true },
    entry_cost:         { type: Number, default: 0 }, // quantity * entry_price
    entry_commission:   { type: Number, default: 0 },
    
    // ===============================
    // PRECIO ACTUAL Y P&L
    // ===============================
    current_price:      { type: Number, default: 0 },
    current_value:      { type: Number, default: 0 }, // quantity * current_price
    unrealized_pnl:     { type: Number, default: 0 }, // en $
    unrealized_pnl_pct: { type: Number, default: 0 }, // en %
    realized_pnl:       { type: Number, default: 0 }, // ganancias al cerrar
    total_fees:         { type: Number, default: 0 }, // comisiones pagadas

    // ===============================
    // RISK MANAGEMENT
    // ===============================
    stop_loss:          { type: Number },
    stop_loss_pct:      { type: Number }, // % del entry_price
    take_profit:        { type: Number },
    take_profit_pct:    { type: Number }, // % del entry_price
    risk_reward_ratio:  { type: Number, default: 0 }, // (TP - Entry) / (Entry - SL)

    // ===============================
    // PERFORMANCE ANALYTICS
    // ===============================
    roi_pct:            { type: Number, default: 0 }, // Return on Investment %
    days_held:          { type: Number, default: 0 },
    daily_return:       { type: Number, default: 0 }, // ROI / days held
    
    // Volatilidad de la posición
    position_volatility: { type: Number, default: 0 },
    
    // ===============================
    // ESTADO
    // ===============================
    is_open:            { type: Boolean, default: true, index: true },
    opened_at:          { type: Date, default: Date.now },
    closed_at:          { type: Date },
    
    // ===============================
    // TIMESTAMPS
    // ===============================
    updated_at:         { type: Date, default: Date.now },
    last_price_update:  { type: Date, default: Date.now },

    // ===============================
    // METADATA Y ANÁLISIS
    // ===============================
    strategy_used:      { type: String, trim: true }, // Nombre de estrategia
    entry_reason:       { type: String, trim: true }, // Por qué entraste
    exit_reason:        { type: String, trim: true }, // Por qué saliste
    notes:              { type: String, trim: true },
  },
  { 
    versionKey: false, 
    collection: 'positions',
    timestamps: true
  }
);

// Índices para búsquedas rápidas
positionSchema.index({ user_id: 1, is_open: 1 });
positionSchema.index({ user_id: 1, opened_at: -1 });
positionSchema.index({ unrealized_pnl_pct: -1 });
positionSchema.index({ roi_pct: -1 });

export default models.Position || model('Position', positionSchema);
