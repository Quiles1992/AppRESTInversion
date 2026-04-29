import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const signalEventSchema = new Schema(
  {
    symbol:          { type: String, required: true, uppercase: true, trim: true, index: true },
    timeframe:       { type: String, required: true, trim: true },
    action:          { type: String, required: true, enum: ['BUY', 'SELL', 'HOLD'] },
    confidence:      { type: Number, required: true, min: 0, max: 1 },
    score:           { type: Number, default: 0 },
    strategy_id:     { type: Schema.Types.ObjectId, ref: 'Strategy', required: false },
    selected_cores:  { type: [String], default: [] },
    indicators:      { type: Schema.Types.Mixed, default: {} },
    ai_confirmation: { type: Schema.Types.Mixed, default: {} },
    suggested_params:{ type: Schema.Types.Mixed, default: {} },
    price_at_signal: { type: Number, required: true },
    reason:          { type: String, trim: true },
    status:          { type: String, default: 'active',
                       enum: ['active', 'executed', 'dismissed', 'expired'] },
    expires_at:      { type: Date },
    occurred_at:     { type: Date, required: true, default: Date.now },
    created_at:      { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'signal_events' }
);

export default models.SignalEvent || model('SignalEvent', signalEventSchema);
