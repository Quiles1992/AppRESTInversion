import AlertLog from '../models/AlertLog';
import createCrudService from './crud.service';
export default createCrudService({ Model: AlertLog, tableName: 'alert_log' });
