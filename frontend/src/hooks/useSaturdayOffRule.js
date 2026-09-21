import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/hooks/useCompanies';

// Resolves the logged-in Employee's effective `saturday_off_rule` — the single BU-level setting
// isOffDay() needs to tell a working Saturday from an off one (Sunday is always off regardless).
// GET /companies/:id (useCompany) is the BU Master endpoint — an Employee-only login isn't
// guaranteed access to it, so its `saturday_off_rule` is a best-effort enrichment, never the sole
// source. `activeBu`/`employee.business_units`, both already scoped to what this login can see
// (populated at login via GET /employees/:id/business-units), take priority; without those this
// used to silently fall through to 'ALL' whenever the Master call 403'd, gating every Saturday for
// an employee whose BU is actually only 1st/3rd (or 2nd/4th, or none). Shared by every screen that
// needs to gate hours-logging on an off-day (My Work Log, Time Entry, Monthly Summary) so they can
// never disagree about which days are off for this employee.
export const useSaturdayOffRule = () => {
  const { businessUnits, activeBuId, employee } = useAuth();
  const effectiveBuId = activeBuId || businessUnits?.[0]?.id || employee?.business_units?.[0]?.id || employee?.business_unit_ids?.[0];
  const { data: currentCompany } = useCompany(effectiveBuId);
  const activeBu = businessUnits?.find((b) => b.id === effectiveBuId) || businessUnits?.[0];
  const employeeBu = employee?.business_units?.find((b) => b.id === effectiveBuId) || employee?.business_units?.[0];
  return activeBu?.saturday_off_rule || employeeBu?.saturday_off_rule || currentCompany?.saturday_off_rule || 'ALL';
};

export default useSaturdayOffRule;
