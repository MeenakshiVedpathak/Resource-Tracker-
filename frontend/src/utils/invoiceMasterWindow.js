import dayjs from 'dayjs';

// Invoice Master (Service PO Monthly Budget) is writable only for the previous calendar month,
// and only through the 7th day of the current month — mirrors the backend's hard lock on
// POST /service-po-monthly-budgets so the UI can gate proactively instead of round-tripping a 400.
export const getInvoiceMasterWritablePeriod = (today = dayjs()) => {
  if (today.date() > 7) return null;
  const prev = today.subtract(1, 'month');
  return { month: prev.month() + 1, year: prev.year() };
};

export const isInvoiceMasterPeriodWritable = (month, year, today = dayjs()) => {
  const writable = getInvoiceMasterWritablePeriod(today);
  return !!writable && writable.month === month && writable.year === year;
};

export const INVOICE_MASTER_LOCK_MESSAGE =
  'Invoice Master can only be added or modified for the previous month until the 7th day of the current month.';
