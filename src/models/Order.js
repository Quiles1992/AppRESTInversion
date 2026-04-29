import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const orderSchema = new Schema(
  {
    user_id:          { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    signal_id:        { type: Schema.Types.ObjectId, ref: 'SignalEvent' },
    strategy_id:      { type: Schema.Types.ObjectId, ref: 'Strategy' },
    symbol:           { type: String, required: true, uppercase: true, trim: true },
    side:             { type: String, required: true, enum: ['BUY', 'SELL'] },
    quantity:         { type: Number, required: true, min: 0 },
    order_type:       { type: String, required: true, enum: ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'] },
    limit_price:      { type: Number },
    stop_price:       { type: Number },
    stop_loss:        { type: Number },
    take_profit:      { type: Number },
    time_in_force:    { type: String, default: 'DAY', enum: ['DAY', 'GTC', 'IOC', 'FOK'] },
    asset_type:       { type: String, default: 'STOCK', enum: ['STOCK', 'OPTION'] },
    broker_order_id:  { type: String },
    status:           { type: String, default: 'PENDING',
                        enum: ['PENDING', 'FILLED', 'PARTIAL', 'CANCELLED', 'REJECTED'] },
    filled_qty:       { type: Number, default: 0, min: 0 },
    filled_avg_price: { type: Number, default: 0, min: 0 },
    notes:            { type: String },
    created_at:       { type: Date, default: Date.now },
    updated_at:       { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'orders' }
);

export default models.Order || model('Order', orderSchema);
