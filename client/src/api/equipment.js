import { api } from './client.js';
export const listEquipment = (bid) => api.get(`/buildings/${bid}/equipment`);
export const createEquipment = (bid, data) => api.post(`/buildings/${bid}/equipment`, data);
export const updateEquipment = (bid, id, data) => api.patch(`/buildings/${bid}/equipment/${id}`, data);
export const deleteEquipment = (bid, id) => api.del(`/buildings/${bid}/equipment/${id}`);
export const getReconciliation = (bid) => api.get(`/buildings/${bid}/reconciliation`);
