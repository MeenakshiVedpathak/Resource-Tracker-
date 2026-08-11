export const DEADLINE_SEVERITY = {
  NORMAL: 'normal',
  WARNING: 'warning',
  CRITICAL: 'critical',
  PASSED: 'passed',
};

// Thresholds aren't in the spec beyond "<=3 days shows red" — judgment call: 4-5 days left reads
// as an amber warning zone, anything closer than that (or passed) is critical/red.
const WARNING_DAYS_THRESHOLD = 5;
const CRITICAL_DAYS_THRESHOLD = 3;

// The server now computes days_remaining/deadline_passed itself (GET .../current,
// POST .../ response), so this just maps those numbers to a display severity instead of
// recomputing dates client-side.
export const getDeadlineSeverity = (daysRemaining, isPassed) => {
  if (isPassed) return DEADLINE_SEVERITY.PASSED;
  if (daysRemaining == null) return DEADLINE_SEVERITY.NORMAL;
  if (daysRemaining <= CRITICAL_DAYS_THRESHOLD) return DEADLINE_SEVERITY.CRITICAL;
  if (daysRemaining <= WARNING_DAYS_THRESHOLD) return DEADLINE_SEVERITY.WARNING;
  return DEADLINE_SEVERITY.NORMAL;
};
