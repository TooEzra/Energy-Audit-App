import { api } from './client.js';
export const listFindings = (bid, area) => api.get(`/buildings/${bid}/findings${area ? `?area=${encodeURIComponent(area)}` : ''}`);
/** form is a FormData (fields + optional "photo" file). */
export const createFinding = (bid, form) => api.postForm(`/buildings/${bid}/findings`, form);
export const updateFinding = (bid, id, form) => api.patchForm(`/buildings/${bid}/findings/${id}`, form);
export const deleteFinding = (bid, id) => api.del(`/buildings/${bid}/findings/${id}`);
// Photos are served by an authenticated route; the browser sends the session cookie with the <img> request.
export const photoUrl = (bid, id) => `/api/buildings/${bid}/findings/${id}/photo`;
