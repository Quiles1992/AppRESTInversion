import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const eventCalendarSchema = new Schema(
  {
    symbol:          { type: String, uppercase: true, trim: true },
    event_type:      { type: String, required: true, trim: true,
                       enum: ['earnings','guidance','dividend','split','macro','analyst_update','other'] },
    title:           { type: String, required: true, trim: true },
    description:     { type: String, trim: true },
    expected_impact: { type: String, enum: ['high','medium','low','unknown'] },
    event_date:      { type: Date, required: true },
    event_time:      { type: String },
    is_confirmed:    { type: Boolean, default: false },
    source:          { type: String, trim: true },
    created_at:      { type: Date, default: Date.now },
    updated_at:      { type: Date, default: Date.now },
  },
  { versionKey: false, collection: 'event_calendar' }
);

export default models.EventCalendar || model('EventCalendar', eventCalendarSchema);
