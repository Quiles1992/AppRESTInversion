import Fundamental from '../models/Fundamental';
import createCrudService from './crud.service';
export default createCrudService({ Model: Fundamental, tableName: 'fundamentals' });
