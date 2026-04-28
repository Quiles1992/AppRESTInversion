import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const strategySchema = new Schema(
  {
    user_id:                  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:                     { type: String, required: true, trim: true },
    description:              { type: String, trim: true },
    is_preset:                { type: Boolean, default: false },
    is_active:                { type: Boolean, default: true },
    min_confidence_threshold: { type: Number, default: 0.5 },
    enabled_cores:            { type: Schema.Types.Mixed, default: {} },
    indicator_config:         { type: Schema.Types.Mixed, default: {} },
    option_strategies:        { type: [String], default: [] },
    recommended_timeframes:   { type: [String], default: [] },
    created_at:               { type: Date, default: Date.now },
    updated_at:               { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'strategies' }
);

export default models.Strategy || model('Strategy', strategySchema);
