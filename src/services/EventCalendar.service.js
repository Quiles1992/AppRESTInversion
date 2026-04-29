import EventCalendar from '../models/EventCalendar';
import createCrudService from './crud.service';
export default createCrudService({ Model: EventCalendar, tableName: 'event_calendar' });
