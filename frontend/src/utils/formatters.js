import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

export const formatDate = (date, format = 'DD MMM YYYY') =>
  date ? dayjs(date).format(format) : '—';

export const formatDateTime = (date) =>
  date ? dayjs(date).format('DD MMM YYYY, hh:mm A') : '—';

export const formatRelativeTime = (date) =>
  date ? dayjs(date).fromNow() : '—';

export const formatCurrency = (value, currency = 'INR') => {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value, decimals = 0) => {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
};

export const formatHours = (hours) => {
  if (hours == null) return '—';
  return `${Number(hours).toFixed(1)}h`;
};

export const formatPercentage = (value, decimals = 1) => {
  if (value == null) return '—';
  return `${Number(value).toFixed(decimals)}%`;
};

export const formatMonthYear = (month, year) => {
  if (!month || !year) return '—';
  return dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('MMMM YYYY');
};

export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

export const truncate = (str, maxLength = 40) => {
  if (!str) return '—';
  return str.length > maxLength ? `${str.substring(0, maxLength)}…` : str;
};

export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getStatusColor = (status) => {
  const map = {
    active: 'success',
    inactive: 'destructive',
    closed: 'secondary',
    cancelled: 'destructive',
    completed: 'success',
    pending: 'warning',
    failed: 'destructive',
    'in-progress': 'info',
    'on-hold': 'warning',
  };
  return map[status?.toLowerCase()] ?? 'secondary';
};
