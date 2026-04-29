import Order from '../models/Order';
import createCrudService from './crud.service';
export default createCrudService({ Model: Order, tableName: 'orders' });
