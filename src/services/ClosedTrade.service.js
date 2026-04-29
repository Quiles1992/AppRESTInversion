import ClosedTrade from '../models/ClosedTrade';
import createCrudService from './crud.service';
export default createCrudService({ Model: ClosedTrade, tableName: 'closed_trades' });
