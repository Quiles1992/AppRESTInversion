import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const newsSchema = new Schema(
  {
    symbol:          { type: String, uppercase: true, trim: true },
    headline:        { type: String, required: true, trim: true },
    summary:         { type: String, trim: true },
    sentiment:       { type: String, trim: true, enum: ['bullish', 'bearish', 'neutral'] },
    relevance_score: { type: Number, default: 0 },
    source:          { type: String, trim: true },
    url:             { type: String, trim: true },
    published_at:    { type: Date, default: Date.now },
    archived_at:     { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'news' }
);

export default models.News || model('News', newsSchema);
