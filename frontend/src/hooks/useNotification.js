import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationsApi } from '../utils/api';
import { toast } from 'react-toastify';

/**
 * useNotification — manages the notifications bell in the AppBar.
 *
 * Fetches unread + recent notifications from the API on mount and at a
 * configurable polling interval.
 *
 * @param {object}  options
 * @param {number}  options.pollIntervalMs  — how often to refresh (default 60s)
 * @param {boolean} options.enabled         — set false to pause polling (e.g. unauthenticated)
 *
 * @returns {{
 *   notifications: Notification[],
 *   unreadCount: number,
 *   loading: boolean,
 *   error: string|null,
 *   markAsRead: (id: number) => Promise<void>,
 *   markAllRead: () => Promise<void>,
 *   deleteNotification: (id: number) => Promise<void>,
 *   refresh: () => void,
 * }}
 */
export function useNotification({
  pollIntervalMs = 60_000,
  enabled = true,
} = {}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const intervalRef = useRef(null);
  const isMounted = useRef(true);

  // -------------------------------------------------------------------------
  // Fetch notifications
  // -------------------------------------------------------------------------
  const fetchNotifications = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const response = await notificationsApi.getAll({ limit: 50, sort: 'created_at:desc' });

      if (!isMounted.current) return;

      // Handle both wrapped { data: [...] } and raw array responses
      const items = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
        ? response.data
        : [];

      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.is_read).length);
    } catch (err) {
      if (!isMounted.current) return;
      setError(err.message || 'Failed to load notifications');
      // Silently fail for polling — don't spam the user with toast errors
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [enabled]);

  // -------------------------------------------------------------------------
  // Mount + polling
  // -------------------------------------------------------------------------
  useEffect(() => {
    isMounted.current = true;
    fetchNotifications();

    if (enabled && pollIntervalMs > 0) {
      intervalRef.current = setInterval(fetchNotifications, pollIntervalMs);
    }

    return () => {
      isMounted.current = false;
      clearInterval(intervalRef.current);
    };
  }, [fetchNotifications, enabled, pollIntervalMs]);

  // -------------------------------------------------------------------------
  // markAsRead
  // -------------------------------------------------------------------------
  const markAsRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await notificationsApi.markAsRead(id);
    } catch (err) {
      // Revert optimistic update on failure
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: false } : n))
      );
      setUnreadCount((prev) => prev + 1);
      toast.error('Failed to mark notification as read');
    }
  }, []);

  // -------------------------------------------------------------------------
  // markAllRead
  // -------------------------------------------------------------------------
  const markAllRead = useCallback(async () => {
    const prevNotifications = notifications;
    const prevCount = unreadCount;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await notificationsApi.markAllRead();
      toast.success('All notifications marked as read');
    } catch (err) {
      // Revert
      setNotifications(prevNotifications);
      setUnreadCount(prevCount);
      toast.error('Failed to mark all notifications as read');
    }
  }, [notifications, unreadCount]);

  // -------------------------------------------------------------------------
  // deleteNotification
  // -------------------------------------------------------------------------
  const deleteNotification = useCallback(async (id) => {
    const target = notifications.find((n) => n.id === id);
    const wasUnread = target && !target.is_read;

    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await notificationsApi.delete(id);
    } catch (err) {
      // Revert
      if (target) {
        setNotifications((prev) => {
          const idx = prev.findIndex((n) => n.id > id);
          const copy = [...prev];
          if (idx === -1) copy.push(target);
          else copy.splice(idx, 0, target);
          return copy;
        });
        if (wasUnread) setUnreadCount((prev) => prev + 1);
      }
      toast.error('Failed to delete notification');
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllRead,
    deleteNotification,
    refresh: fetchNotifications,
  };
}

export default useNotification;
