import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  loginSuccess,
  logout as logoutAction,
  setLoading,
  setError,
  updateUser,
  selectUser,
  selectToken,
  selectIsAuthenticated,
  selectAuth,
} from '../store/slices/authSlice';
import { authApi } from '../utils/api';
import { toast } from 'react-toastify';

/**
 * useAuth — primary authentication hook.
 *
 * Returns:
 *   user            — currently authenticated user object or null
 *   token           — JWT access token string or null
 *   isAuthenticated — boolean
 *   loading         — boolean, true while a login/logout request is in flight
 *   error           — last auth error message or null
 *   login(credentials) — POST to /auth/login, store tokens, navigate to dashboard
 *   logout()           — POST to /auth/logout, clear state, navigate to /login
 *   hasRole(roles)     — returns true if user.role is in the roles array
 *   updateProfile(data) — merge data into the user object (after profile edit)
 */
export function useAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const user = useSelector(selectUser);
  const token = useSelector(selectToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const { loading, error } = useSelector(selectAuth);

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------
  const login = useCallback(
    async (credentials) => {
      dispatch(setLoading(true));
      dispatch(setError(null));
      try {
        const response = await authApi.login(credentials);

        const { user: userData, token: accessToken, refreshToken } = response;

        dispatch(
          loginSuccess({
            user: userData,
            token: accessToken,
            refreshToken: refreshToken ?? null,
          })
        );

        toast.success(`Welcome back, ${userData.full_name || userData.email}!`);
        navigate('/dashboard', { replace: true });

        return { success: true };
      } catch (err) {
        const message = err.message || 'Login failed. Please check your credentials.';
        dispatch(setError(message));
        toast.error(message);
        return { success: false, error: message };
      }
    },
    [dispatch, navigate]
  );

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------
  const logout = useCallback(async () => {
    try {
      // Best-effort server-side session invalidation
      await authApi.logout().catch(() => {});
    } finally {
      dispatch(logoutAction());
      navigate('/login', { replace: true });
      toast.info('You have been signed out.');
    }
  }, [dispatch, navigate]);

  // -------------------------------------------------------------------------
  // hasRole
  // -------------------------------------------------------------------------
  const hasRole = useCallback(
    (roles) => {
      if (!user?.role) return false;
      const allowed = Array.isArray(roles) ? roles : [roles];
      // Support role by name string or by id
      return allowed.some(
        (r) =>
          r === user.role ||
          r === user.role_id ||
          r?.toLowerCase() === user.role?.toLowerCase()
      );
    },
    [user]
  );

  // -------------------------------------------------------------------------
  // updateProfile — dispatch a partial user update
  // -------------------------------------------------------------------------
  const updateProfile = useCallback(
    (data) => {
      dispatch(updateUser(data));
    },
    [dispatch]
  );

  return {
    user,
    token,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    hasRole,
    updateProfile,
  };
}

export default useAuth;
