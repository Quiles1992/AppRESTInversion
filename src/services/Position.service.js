import Position from '../models/Position';
import createCrudService from './crud.service';
export default createCrudService({ Model: Position, tableName: 'positions' });
