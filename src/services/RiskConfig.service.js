import RiskConfig from '../models/RiskConfig';
import createCrudService from './crud.service';
export default createCrudService({ Model: RiskConfig, tableName: 'risk_config' });
