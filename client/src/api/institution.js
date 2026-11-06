import { api } from './client.js';
export const getInstitution = () => api.get('/institution');
export const updateInstitution = (data) => api.patch('/institution', data);
