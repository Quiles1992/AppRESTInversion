import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const closedTradeSchema = new Schema(
  {
    user_id:          { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    position_id:      { type: Schema.Types.ObjectId, ref: 'Position' },
    signal_id:        { type: Schema.Types.ObjectId, ref: 'SignalEvent' },
    strategy_id:      { type: Schema.Types.ObjectId, ref: 'Strategy' },
    symbol:           { type: String, required: true, uppercase: true, trim: true },
    side:             { type: String, required: true, enum: ['BUY', 'SELL'] },
    quantity:         { type: Number, required: true },
    entry_price:      { type: Number, required: true },
    exit_price:       { type: Number, required: true },
    pnl:              { type: Number, required: true },
    pnl_pct:          { type: Number, required: true },
    stop_loss:        { type: Number },
    take_profit:      { type: Number },
    signal_confidence:{ type: Number },
    broker:           { type: String, enum: ['ibkr', 'alpaca', 'other'] },
    broker_order_id:  { type: String },
    asset_type:       { type: String, default: 'STOCK' },
    entry_time:       { type: Date, required: true },
    exit_time:        { type: Date, required: true },
    created_at:       { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'closed_trades' }
);

export default models.ClosedTrade || model('ClosedTrade', closedTradeSchema);
