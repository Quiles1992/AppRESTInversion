import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const optionChainSchema = new Schema(
  {
    symbol:           { type: String, required: true, uppercase: true, trim: true },
    expiration:       { type: Date },
    strike:           { type: Number, required: true },
    option_type:      { type: String, required: true, enum: ['CALL', 'PUT'] },
    bid:              { type: Number },
    ask:              { type: Number },
    last:             { type: Number },
    volume:           { type: Number },
    open_interest:    { type: Number },
    implied_volatility: { type: Number, default: 0 },
    iv_percentile:    { type: Number },
    dte:              { type: Number },
    greeks:           { type: Schema.Types.Mixed, default: {} },
    source:           { type: String, trim: true },
    signal_id:        { type: Schema.Types.ObjectId, ref: 'SignalEvent' },
    captured_at:      { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'option_chain' }
);

export default models.OptionChain || model('OptionChain', optionChainSchema);
