import Strategy from '../models/Strategy';
import createCrudService from './crud.service';
export default createCrudService({ Model: Strategy, tableName: 'strategies' });
