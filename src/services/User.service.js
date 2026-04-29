// User.service.js
import User from '../models/User';
import createCrudService from './crud.service';
export default createCrudService({ Model: User, tableName: 'users' });
