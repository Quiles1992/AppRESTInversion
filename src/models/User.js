import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

// -----------------------------------------------
// NOTA DE ARQUITECTURA:
// MongoDB  → risk_config y broker_accounts van
//            embebidos dentro del documento user.
// Supabase → son tablas separadas (risk_config y
//            broker_accounts) con FK a users.
//            Al usar ?DBServer=supabase el payload
//            de POST /users NO debe incluir estos
//            campos; se gestionan con sus propias
//            rutas /risk-config y /broker-accounts.
// -----------------------------------------------

// Sub-schema embebido para MongoDB
const brokerAccountEmbeddedSchema = new Schema(
  {
    broker:      { type: String, required: true, trim: true,
                   enum: ['ibkr', 'alpaca', 'other'] },
    account_id:  { type: String, trim: true },
    environment: { type: String, enum: ['paper', 'live'], default: 'paper' },
    is_active:   { type: Boolean, default: true },
    host:        { type: String, trim: true },
    port:        { type: Number },
    notes:       { type: String, trim: true },
  },
  { _id: true, versionKey: false }
);

// Sub-schema embebido para MongoDB
const riskConfigEmbeddedSchema = new Schema(
  {
    max_position_size_pct:    { type: Number, default: 5.00 },
    max_daily_loss_pct:       { type: Number, default: 2.00 },
    default_stop_loss_pct:    { type: Number, default: 1.50 },
    default_take_profit_pct:  { type: Number, default: 3.00 },
    max_concurrent_positions: { type: Number, default: 5 },
    max_iv_percentile:        { type: Number, default: 80 },
    preferred_dte_min:        { type: Number, default: 7 },
    preferred_dte_max:        { type: Number, default: 45 },
    max_option_premium_pct:   { type: Number, default: 2.00 },
  },
  { _id: false, versionKey: false }
);

const userSchema = new Schema(
  {
    email:       { type: String, required: true, unique: true, trim: true, lowercase: true },
    full_name:   { type: String, required: true, trim: true },
    role:        { type: String, default: 'trader', trim: true,
                   enum: ['owner', 'trader', 'viewer'] },
    timezone:    { type: String, default: 'UTC', trim: true },
    is_active:   { type: Boolean, default: true },
    preferences: { type: Schema.Types.Mixed, default: {} },
    // Solo usados en MongoDB — ignorados al usar Supabase
    risk_config:     { type: riskConfigEmbeddedSchema, default: () => ({}) },
    broker_accounts: { type: [brokerAccountEmbeddedSchema], default: [] },
    created_at:  { type: Date, default: Date.now },
    updated_at:  { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'users' }
);

export default models.User || model('User', userSchema);
