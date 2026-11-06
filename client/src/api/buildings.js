import { api } from './client.js';
export const listBuildings = () => api.get('/buildings');
export const getBuilding = (id) => api.get(`/buildings/${id}`);
export const createBuilding = (data) => api.post('/buildings', data);
export const updateBuilding = (id, data) => api.patch(`/buildings/${id}`, data);
export const deleteBuilding = (id) => api.del(`/buildings/${id}`);
