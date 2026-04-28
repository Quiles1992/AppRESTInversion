import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

// En MongoDB coleccion independiente
// En Supabase tabla public.risk_config con FK unica a users
const riskConfigSchema = new Schema(
  {
    user_id:                  { type: Schema.Types.ObjectId, ref: 'User',
                                required: true, unique: true, index: true },
    max_position_size_pct:    { type: Number, default: 5.00 },
    max_daily_loss_pct:       { type: Number, default: 2.00 },
    default_stop_loss_pct:    { type: Number, default: 1.50 },
    default_take_profit_pct:  { type: Number, default: 3.00 },
    max_concurrent_positions: { type: Number, default: 5 },
    max_iv_percentile:        { type: Number, default: 80 },
    preferred_dte_min:        { type: Number, default: 7 },
    preferred_dte_max:        { type: Number, default: 45 },
    max_option_premium_pct:   { type: Number, default: 2.00 },
    created_at:               { type: Date, default: Date.now },
    updated_at:               { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'risk_config' }
);

export default models.RiskConfig || model('RiskConfig', riskConfigSchema);
