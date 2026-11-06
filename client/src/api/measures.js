import { api } from './client.js';
export const listMeasures = () => api.get('/measures');
export const createMeasure = (data) => api.post('/measures', data);
