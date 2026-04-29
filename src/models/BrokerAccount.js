import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

// En MongoDB coleccion independiente
// En Supabase tabla public.broker_accounts con FK a users
const brokerAccountSchema = new Schema(
  {
    user_id:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    broker:      { type: String, required: true, trim: true,
                   enum: ['ibkr', 'alpaca', 'other'] },
    account_id:  { type: String, trim: true },
    environment: { type: String, enum: ['paper', 'live'], default: 'paper' },
    is_active:   { type: Boolean, default: true },
    host:        { type: String, trim: true },
    port:        { type: Number },
    notes:       { type: String, trim: true },
    created_at:  { type: Date, default: Date.now },
    updated_at:  { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'broker_accounts' }
);

export default models.BrokerAccount || model('BrokerAccount', brokerAccountSchema);
