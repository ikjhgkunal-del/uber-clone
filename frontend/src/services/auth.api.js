import { api } from './api';
export const signIn = (body) => api('/auth/login', { method: 'POST', body: JSON.stringify(body) });
export const signUp = (body) => api('/auth/register', { method: 'POST', body: JSON.stringify(body) });
