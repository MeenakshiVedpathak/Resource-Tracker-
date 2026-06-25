import { format, parseISO, isValid } from 'date-fns';
import { DATE_FORMATS } from './constants';

// ===========================================================================
// Date helpers
// ===========================================================================

/**
 * Format a date value to a display string.
 * Accepts a Date object, ISO string, or null/undefined.
 */
export function formatDate(date, fmt = DATE_FORMATS.DISPLAY) {
  if (!date) return '—';
  try {
    const parsed = typeof date === 'string' ? parseISO(date) : new Date(date);
    if (!isValid(parsed)) return '—';
    return format(parsed, fmt);
  } catch {
    return '—';
  }
}

/**
 * Format a date for display including time.
 */
export function formatDateTime(date) {
  return formatDate(date, DATE_FORMATS.DISPLAY_WITH_TIME);
}

/**
 * Format a month + year integer pair into a readable string.
 * month: 1-12
 */
export function formatMonthYear(month, year) {
  if (!month || !year) return '—';
  try {
    const date = new Date(year, month - 1, 1);
    return format(date, DATE_FORMATS.FULL_MONTH_YEAR);
  } catch {
    return `${month}/${year}`;
  }
}

// ===========================================================================
// Currency / number helpers
// ===========================================================================

/**
 * Format a number as Indian Rupee currency.
 */
export function formatCurrency(
  value,
  currency = 'INR',
  minimumFractionDigits = 2
) {
  if (value === null || value === undefined || value === '') return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a number with comma separation (no currency symbol).
 */
export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || value === '') return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format hours worked, e.g. 7.5 -> "7.5 hrs"
 */
export function formatHours(value) {
  if (value === null || value === undefined || value === '') return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return `${num % 1 === 0 ? num.toFixed(0) : num.toFixed(1)} hrs`;
}

/**
 * Format a percentage value.
 */
export function formatPercent(value, decimals = 1) {
  if (value === null || value === undefined) return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return `${num.toFixed(decimals)}%`;
}

// ===========================================================================
// Status colour helpers
// ===========================================================================

/**
 * Return a MUI Chip color string for a generic active/inactive status.
 */
export function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'default';
    case 'pending':
      return 'warning';
    case 'completed':
      return 'info';
    case 'processing':
      return 'primary';
    case 'failed':
    case 'error':
      return 'error';
    case 'partial':
      return 'warning';
    default:
      return 'default';
  }
}

/**
 * Return a hex colour for a numeric utilisation percentage.
 * <= 50%: warning amber, 51-85%: success green, >85%: info blue (over-utilised)
 */
export function getUtilizationColor(percent) {
  if (percent === null || percent === undefined) return '#94a3b8';
  if (percent < 50) return '#ed6c02';
  if (percent <= 85) return '#2e7d32';
  return '#0288d1';
}

/**
 * Return a hex colour based on import status.
 */
export function getImportStatusColor(status) {
  const map = {
    pending: '#64748b',
    processing: '#1976d2',
    completed: '#2e7d32',
    partial: '#ed6c02',
    failed: '#d32f2f',
  };
  return map[status?.toLowerCase()] ?? '#64748b';
}

// ===========================================================================
// Text helpers
// ===========================================================================

/**
 * Truncate text to maxLength with an ellipsis.
 */
export function truncateText(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}

/**
 * Convert a snake_case or camelCase string to Title Case.
 */
export function toTitleCase(str) {
  if (!str) return '';
  return str
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get initials from a full name (up to 2 characters).
 */
export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ===========================================================================
// File / download helpers
// ===========================================================================

/**
 * Trigger a browser download of a Blob object.
 * @param {Blob} blob - the file data
 * @param {string} filename - suggested file name
 */
export function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Generate an export filename with a timestamp.
 * @param {string} prefix - e.g. "utilization_report"
 * @param {string} extension - e.g. "xlsx"
 */
export function generateExportFileName(prefix, extension = 'xlsx') {
  const timestamp = format(new Date(), DATE_FORMATS.EXPORT_FILENAME);
  return `${prefix}_${timestamp}.${extension}`;
}

/**
 * Convert bytes to a human-readable file size string.
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

// ===========================================================================
// Validation helpers
// ===========================================================================

/**
 * Check whether a value is empty (null, undefined, empty string/array/object).
 */
export function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Validate that a number is within a range (inclusive).
 */
export function inRange(value, min, max) {
  const n = parseFloat(value);
  return !isNaN(n) && n >= min && n <= max;
}

// ===========================================================================
// Query / URL helpers
// ===========================================================================

/**
 * Build a query-parameter object, stripping empty values.
 */
export function buildQueryParams(params) {
  const clean = {};
  Object.entries(params).forEach(([key, val]) => {
    if (val !== null && val !== undefined && val !== '') {
      clean[key] = val;
    }
  });
  return clean;
}

/**
 * Debounce a function call.
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ===========================================================================
// Array / object helpers
// ===========================================================================

/**
 * Group an array of objects by a key.
 */
export function groupBy(arr, key) {
  return arr.reduce((groups, item) => {
    const group = item[key];
    if (!groups[group]) groups[group] = [];
    groups[group].push(item);
    return groups;
  }, {});
}

/**
 * Return a sorted copy of an array of objects by a string or numeric field.
 */
export function sortBy(arr, key, direction = 'asc') {
  return [...arr].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av < bv) return direction === 'asc' ? -1 : 1;
    if (av > bv) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Compute a sum over a numeric field in an array of objects.
 */
export function sumBy(arr, key) {
  return arr.reduce((acc, item) => acc + (parseFloat(item[key]) || 0), 0);
}
