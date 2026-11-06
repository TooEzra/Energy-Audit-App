import { api } from './client.js';
export const me = () => api.get('/auth/me');
export const login = (email, password) => api.post('/auth/login', { email, password });
export const registerInstitution = (data) => api.post('/auth/register-institution', data);
export const logout = () => api.post('/auth/logout');
export const changePassword = (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword });
