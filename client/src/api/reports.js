import { api } from './client.js';
const q = (conclusion) => (conclusion ? `conclusion=${encodeURIComponent(conclusion)}` : '');
export const getReport = (bid, conclusion) => api.get(`/buildings/${bid}/report${conclusion ? `?${q(conclusion)}` : ''}`);
// Downloads are plain links (the cookie authenticates them).
export const reportPdfUrl = (bid, conclusion) => `/api/buildings/${bid}/report?format=pdf${conclusion ? `&${q(conclusion)}` : ''}`;
export const exportUrl = (format) => `/api/export?format=${format}`;
