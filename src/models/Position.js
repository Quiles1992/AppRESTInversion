import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const positionSchema = new Schema(
  {
    user_id:            { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    order_id:           { type: Schema.Types.ObjectId, ref: 'Order' },
    symbol:             { type: String, required: true, uppercase: true, trim: true },
    side:               { type: String, required: true, enum: ['LONG', 'SHORT'] },
    quantity:           { type: Number, required: true, min: 0 },
    entry_price:        { type: Number, required: true },
    current_price:      { type: Number, default: 0 },
    stop_loss:          { type: Number },
    take_profit:        { type: Number },
    unrealized_pnl:     { type: Number, default: 0 },
    unrealized_pnl_pct: { type: Number, default: 0 },
    asset_type:         { type: String, default: 'STOCK' },
    is_open:            { type: Boolean, default: true },
    opened_at:          { type: Date, default: Date.now },
    closed_at:          { type: Date },
    updated_at:         { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'positions' }
);

export default models.Position || model('Position', positionSchema);
