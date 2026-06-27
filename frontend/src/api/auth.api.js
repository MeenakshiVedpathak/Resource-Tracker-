import apiClient from '@/services/apiClient';

export const authApi = {
  login: (credentials) =>
    apiClient.post('/auth/login', credentials).then((r) => r.data),

  logout: () =>
    apiClient.post('/auth/logout').then((r) => r.data),

  refreshToken: (refreshToken) =>
    apiClient.post('/auth/refresh-token', { refresh_token: refreshToken }).then((r) => r.data),

  getProfile: () =>
    apiClient.get('/auth/profile').then((r) => r.data),

  changePassword: (payload) =>
    apiClient.post('/auth/change-password', payload).then((r) => r.data),
};
