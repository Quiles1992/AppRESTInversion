import OptionChain from '../models/OptionChain';
import createCrudService from './crud.service';
export default createCrudService({ Model: OptionChain, tableName: 'option_chain' });
