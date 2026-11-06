import { api } from './client.js';
export const listRecommendations = (bid) => api.get(`/buildings/${bid}/recommendations`);
export const prefillRecommendation = (bid, measureId) => api.get(`/buildings/${bid}/recommendations/prefill?measureId=${measureId}`);
export const createRecommendation = (bid, data) => api.post(`/buildings/${bid}/recommendations`, data);
export const updateRecommendation = (bid, id, data) => api.patch(`/buildings/${bid}/recommendations/${id}`, data);
export const deleteRecommendation = (bid, id) => api.del(`/buildings/${bid}/recommendations/${id}`);
