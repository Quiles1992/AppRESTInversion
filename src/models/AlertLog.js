import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const alertLogSchema = new Schema(
  {
    user_id:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    alert_type: { type: String, required: true, trim: true,
                  enum: ['SIGNAL_HIGH_CONFIDENCE','SIGNAL_MEDIUM','DAILY_OPPORTUNITY',
                         'EVENT_RISK','POSITION_STOP_LOSS','POSITION_TAKE_PROFIT',
                         'CONNECTION_LOST','AI_CONFIRMATION'] },
                         // Consider using an enum for alert_type to ensure data consistency
    symbol:       { type: String, uppercase: true, trim: true },
    message:      { type: String, required: true, trim: true },
    channel:      { type: String, required: true, trim: true, enum: ['ui','email','both'] },
    delivered:    { type: Boolean, default: false },
    acknowledged: { type: Boolean, default: false },
    email_address:       { type: String },
    related_signal_id:   { type: Schema.Types.ObjectId, ref: 'SignalEvent' },
    related_position_id: { type: Schema.Types.ObjectId, ref: 'Position' },
    triggered_at:    { type: Date, default: Date.now },
    delivered_at:    { type: Date },
    acknowledged_at: { type: Date },
  },
  { versionKey: false, collection: 'alert_log' }
);

export default models.AlertLog || model('AlertLog', alertLogSchema);
