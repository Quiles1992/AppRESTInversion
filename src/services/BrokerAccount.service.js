import BrokerAccount from '../models/BrokerAccount';
import createCrudService from './crud.service';
export default createCrudService({ Model: BrokerAccount, tableName: 'broker_accounts' });
