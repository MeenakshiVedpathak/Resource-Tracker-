import dayjs from 'dayjs';

// Invoice Master (Service PO Monthly Budget) is writable for the current calendar month at any
// point during that month, plus a grace period on the previous month through the 7th day of the
// current month. NOTE: as of 2026-08-19 the backend still enforces the older, stricter rule
// (previous month only, thru the 7th — current month never writable) — this frontend gate is
// ahead of that pending a backend change, so a save can still 400 with INVOICE_MASTER_LOCK_MESSAGE
// until the backend catches up.
export const getInvoiceMasterWritablePeriods = (today = dayjs()) => {
  const periods = [{ month: today.month() + 1, year: today.year() }];
  if (today.date() <= 7) {
    const prev = today.subtract(1, 'month');
    periods.push({ month: prev.month() + 1, year: prev.year() });
  }
  return periods;
};

export const isInvoiceMasterPeriodWritable = (month, year, today = dayjs()) =>
  getInvoiceMasterWritablePeriods(today).some((p) => p.month === month && p.year === year);

// Exact text of the backend's 400 rejection for its still-stricter rule — kept verbatim so the
// entry sheet can detect that specific error and show it as a persistent banner instead of a toast.
export const INVOICE_MASTER_LOCK_MESSAGE =
  'Invoice Master can only be added or modified for the previous month until the 7th day of the current month.';

// Frontend-facing copy describing the wider client-side window above — deliberately a different
// string from INVOICE_MASTER_LOCK_MESSAGE so it's never mistaken for the backend's own message.
export const INVOICE_MASTER_WINDOW_MESSAGE =
  'Monthly PO Reporting is editable for the current month, plus the previous month through the 7th day of this month.';
