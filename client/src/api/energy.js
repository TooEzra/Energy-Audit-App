import { api } from './client.js';
export const listEnergy = (bid) => api.get(`/buildings/${bid}/energy`);
export const createEnergy = (bid, data) => api.post(`/buildings/${bid}/energy`, data);
export const updateEnergy = (bid, id, data) => api.patch(`/buildings/${bid}/energy/${id}`, data);
export const deleteEnergy = (bid, id) => api.del(`/buildings/${bid}/energy/${id}`);
export const importEnergy = (bid, csv, confirm) => api.post(`/buildings/${bid}/energy/import`, { csv, confirm: !!confirm });
export const getAnalysis = (bid) => api.get(`/buildings/${bid}/analysis`);
export const getComparison = () => api.get('/analysis/compare');
