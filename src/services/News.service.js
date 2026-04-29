import News from '../models/News';
import createCrudService from './crud.service';
export default createCrudService({ Model: News, tableName: 'news' });
