import apiClient from '@/services/apiClient';

// Every method below returns the raw parsed response body as-is (no unwrapping past
// `r.data`) because the shape genuinely differs per endpoint and per outcome — callers must
// check `requiresUserTypeSelection` FIRST, before assuming any particular shape:
//   - login success:            { success, message, data: { accessToken, ..., loginType? } }
//   - forgot-password/resend-otp success: { success, message, loginType }  <-- NO `data` key
//   - any of the three, ambiguous email:  { success: false, requiresUserTypeSelection: true, message, accountTypes }
// forgot-password/resend-otp's `loginType` is the resolved account type — the single source
// of truth callers must carry forward unchanged into verify-otp/reset-password.
export const authApi = {
  login: (email, password, loginType) =>
    apiClient.post('/auth/login', { email, password, ...(loginType ? { loginType } : {}) }).then((r) => r.data),

  logout: () =>
    apiClient.post('/auth/logout').then((r) => r.data),

  refreshToken: (refreshToken) =>
    apiClient.post('/auth/refresh-token', { refresh_token: refreshToken }).then((r) => r.data),

  getProfile: () =>
    apiClient.get('/auth/profile').then((r) => r.data),

  // PUT, not POST — and only `newPassword`. The backend identifies which account (User or
  // Employee) to update purely from whichever Bearer token is attached, so this never needs
  // to know or send an account type, and there's no current-password check on this endpoint.
  changePassword: (newPassword) =>
    apiClient.put('/auth/change-password', { newPassword }).then((r) => r.data),

  // Forgot password flow — all unauthenticated, so the interceptor's Bearer header (if any
  // stale token happens to still be in storage) is simply ignored by these public endpoints.
  forgotPassword: (email, loginType) =>
    apiClient.post('/auth/forgot-password', { email, ...(loginType ? { loginType } : {}) }).then((r) => r.data),

  // loginType is required by the backend from this point in the flow onward — normally
  // already resolved by the time verify-otp is called (either unambiguous, or the user picked
  // one in the account-type dialog). If it's still unresolved (null) for some reason, omit the
  // key entirely rather than send a literal `null` — lets a genuinely-required-but-missing
  // loginType surface as a clean 422 instead of an unpredictable server-side null check.
  verifyOtp: (email, otp, loginType) =>
    apiClient.post('/auth/verify-otp', { email, otp, ...(loginType ? { loginType } : {}) }).then((r) => r.data),

  // loginType is already known by the time this is called from the OTP screen, so always
  // send it — omitting it risks getting requiresUserTypeSelection back with no UI slot to
  // resolve it on that screen.
  resendOtp: (email, loginType) =>
    apiClient.post('/auth/resend-otp', { email, ...(loginType ? { loginType } : {}) }).then((r) => r.data),

  resetPassword: (email, otp, password, confirmPassword, loginType) =>
    apiClient.post('/auth/reset-password', {
      email, otp, password, confirmPassword, ...(loginType ? { loginType } : {}),
    }).then((r) => r.data),
};
