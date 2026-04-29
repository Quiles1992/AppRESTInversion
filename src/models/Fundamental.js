import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const fundamentalSchema = new Schema(
  {
    symbol:         { type: String, required: true, uppercase: true, trim: true },
    revenue_growth: { type: Number, default: 0 },
    eps:            { type: Number, default: 0 },
    eps_surprise:   { type: Number, default: 0 },
    guidance:       { type: String, trim: true },
    analyst_rating: { type: String, trim: true },
    revenue_ttm:    { type: Number },
    gross_margin:   { type: Number },
    pe_ratio:       { type: Number },
    ps_ratio:       { type: Number },
    market_cap:     { type: Number },
    raw_payload:    { type: Schema.Types.Mixed, default: {} },
    source:         { type: String, trim: true },
    captured_at:    { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'fundamentals' }
);

export default models.Fundamental || model('Fundamental', fundamentalSchema);
