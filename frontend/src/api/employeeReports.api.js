import apiClient from '@/services/apiClient';

const parseFilename = (contentDisposition, fallback) => {
  const match = /filename="?([^"]+)"?/i.exec(contentDisposition ?? '');
  return match?.[1] ?? fallback;
};

// format: 'json' (default) | 'excel' | 'csv' | 'pdf'. JSON returns the rows directly; the file
// formats return a Blob + filename (parsed from the backend's Content-Disposition header) for
// the caller to hand to utils/download.js — never parsed as JSON.
const getReport = async (path, params, fallbackFilename) => {
  const format = params.format ?? 'json';
  const res = await apiClient.get(path, {
    params,
    responseType: format === 'json' ? 'json' : 'blob',
  });
  if (format === 'json') return res.data?.data ?? { rows: [], totalHours: 0 };
  return { blob: res.data, filename: parseFilename(res.headers['content-disposition'], `${fallbackFilename}.${format}`) };
};

export const employeeReportsApi = {
  getDaily: (params) => getReport('/employee-reports/daily', params, 'work-log-daily'),
  getMonthly: (params) => getReport('/employee-reports/monthly', params, 'work-log-monthly'),
  getRange: (params) => getReport('/employee-reports/range', params, 'work-log-range'),
};
