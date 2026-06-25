import api from './api';

const authService = {
  /**
   * Authenticate a user with email and password.
   * @param {{ email: string, password: string }} credentials
   */
  login: (credentials) => api.post('/auth/login', credentials),

  /**
   * Invalidate the current session on the server.
   * @param {{ refreshToken: string }} payload
   */
  logout: (payload) => api.post('/auth/logout', payload),

  /**
   * Exchange a refresh token for a new access/refresh token pair.
   * @param {{ refreshToken: string }} payload
   */
  refreshToken: (payload) => api.post('/auth/refresh-token', payload),

  /**
   * Fetch the authenticated user's profile.
   */
  getProfile: () => api.get('/auth/profile'),

  /**
   * Change the authenticated user's password.
   * @param {{ currentPassword: string, newPassword: string }} payload
   */
  changePassword: (payload) => api.put('/auth/change-password', payload),
};

export default authService;
