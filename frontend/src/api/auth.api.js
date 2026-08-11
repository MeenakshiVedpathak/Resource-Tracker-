import apiClient from '@/services/apiClient';
import { RBAC_MOCK_ENABLED } from '@/mocks/rbacMockConfig';
import {
  delay, getDb, persist, findUserById, findRoleById, serializeUser, serializeEmployee,
  rolesForLoginResponse, formsForRoleName, issueTokenFor, getCurrentMockUser, mockError, MOCK_OTP,
} from '@/mocks/rbacMockDb';

const mockLogin = async (email, password) => {
  await delay();
  const user = getDb().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw mockError(404, 'Email ID is not registered.');
  if (user.password !== password) throw mockError(401, 'Incorrect password.');
  if (user.status !== 'active') throw mockError(403, 'This account is inactive.');

  user.last_login = new Date().toISOString();
  persist();

  const employee = user.employee_id
    ? serializeEmployee(getDb().employees.find((e) => e.id === user.employee_id))
    : null;
  const roleName = findRoleById(user.role_id).role_name;

  return {
    success: true,
    message: 'Login successful.',
    data: {
      accessToken: issueTokenFor(user.id),
      refreshToken: `refresh.${issueTokenFor(user.id)}`,
      expiresIn: '15m',
      user: serializeUser(user),
      employee,
      roles: rolesForLoginResponse(user.id),
      forms: formsForRoleName(roleName),
    },
  };
};

const mockRefresh = async (refreshToken) => {
  await delay();
  const match = /mock\.(\d+)\./.exec(refreshToken ?? '');
  const userId = match ? Number(match[1]) : null;
  const user = userId ? findUserById(userId) : null;
  if (!user) throw mockError(401, 'Invalid or expired refresh token.');
  const roleName = findRoleById(user.role_id).role_name;
  return {
    success: true,
    message: 'Token refreshed.',
    data: {
      accessToken: issueTokenFor(user.id),
      refreshToken: `refresh.${issueTokenFor(user.id)}`,
      expiresIn: '15m',
      user: serializeUser(user),
      roles: rolesForLoginResponse(user.id),
      forms: formsForRoleName(roleName),
    },
  };
};

// Every seeded account shares one fixed OTP so the forgot-password flow is demoable without a
// real mailbox — see MOCK_OTP in rbacMockDb.js.
const mockForgotPassword = async (email) => {
  await delay();
  const user = getDb().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw mockError(404, 'Email ID is not registered.');
  return { success: true, message: `OTP sent to ${email}. (Mock OTP: ${MOCK_OTP})` };
};

const mockVerifyOtp = async (email, otp) => {
  await delay();
  if (otp !== MOCK_OTP) throw mockError(422, 'Invalid or expired OTP.');
  return { success: true, message: 'OTP verified.' };
};

const mockResetPassword = async (email, otp, password, confirmPassword) => {
  await delay();
  if (otp !== MOCK_OTP) throw mockError(422, 'Invalid or expired OTP.');
  if (password !== confirmPassword) throw mockError(422, 'Passwords do not match.');
  const user = getDb().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) throw mockError(404, 'Email ID is not registered.');
  user.password = password;
  persist();
  return { success: true, message: 'Password reset successfully.' };
};

const mockChangePassword = async (newPassword) => {
  await delay();
  const user = getCurrentMockUser();
  if (!user) throw mockError(401, 'Not authenticated.');
  user.password = newPassword;
  persist();
  return { success: true, message: 'Password changed successfully.' };
};

// Every method returns the raw parsed response body as-is (no unwrapping past `r.data`) —
// callers check the shape they expect for that specific call.
export const authApi = {
  login: (email, password) => {
    if (RBAC_MOCK_ENABLED) return mockLogin(email, password);
    return apiClient.post('/auth/login', { email, password }).then((r) => r.data);
  },

  logout: (refreshToken) => {
    if (RBAC_MOCK_ENABLED) return Promise.resolve({ success: true, message: 'Logged out.' });
    return apiClient.post('/auth/logout', { refresh_token: refreshToken }).then((r) => r.data);
  },

  refreshToken: (refreshToken) => {
    if (RBAC_MOCK_ENABLED) return mockRefresh(refreshToken);
    return apiClient.post('/auth/refresh-token', { refresh_token: refreshToken }).then((r) => r.data);
  },

  getProfile: () =>
    apiClient.get('/auth/profile').then((r) => r.data),

  // PUT, not POST — and only `newPassword`. The backend identifies which account to update
  // purely from whichever Bearer token is attached, so this never sends an account type or
  // needs the current password.
  changePassword: (newPassword) => {
    if (RBAC_MOCK_ENABLED) return mockChangePassword(newPassword);
    return apiClient.put('/auth/change-password', { newPassword }).then((r) => r.data);
  },

  forgotPassword: (email) => {
    if (RBAC_MOCK_ENABLED) return mockForgotPassword(email);
    return apiClient.post('/auth/forgot-password', { email }).then((r) => r.data);
  },

  verifyOtp: (email, otp) => {
    if (RBAC_MOCK_ENABLED) return mockVerifyOtp(email, otp);
    return apiClient.post('/auth/verify-otp', { email, otp }).then((r) => r.data);
  },

  resendOtp: (email) => {
    if (RBAC_MOCK_ENABLED) return mockForgotPassword(email);
    return apiClient.post('/auth/resend-otp', { email }).then((r) => r.data);
  },

  resetPassword: (email, otp, password, confirmPassword) => {
    if (RBAC_MOCK_ENABLED) return mockResetPassword(email, otp, password, confirmPassword);
    return apiClient.post('/auth/reset-password', { email, otp, password, confirmPassword }).then((r) => r.data);
  },
};
