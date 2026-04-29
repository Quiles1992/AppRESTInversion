import SignalEvent from '../models/SignalEvent';
import createCrudService from './crud.service';
export default createCrudService({ Model: SignalEvent, tableName: 'signal_events' });
