import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCompanies } from '@/hooks/useCompanies';
import { canScopeAcrossBus } from '@/services/apiClient';

// The single source of truth for "which Business Units can THIS login narrow a screen to" —
// shared by components/common/BusinessUnitFilter (what the dropdown offers) and
// hooks/useMasterBuFilter (whether a Master shows the control at all), so the two can never
// disagree about whether a filter is available.
//
// Where the options come from depends on the login, because the two kinds of login have their
// BUs in different places:
//
//   · Cross-BU logins — Admin, Entity Admin, Platform Admin (canScopeAcrossBus). These carry no
//     company_id of their own, so `useAuth().businessUnits` is typically EMPTY for them, and a
//     filter built from it would silently render nothing. That was the actual bug: an Admin —
//     the one role that sees every BU at once and therefore needs the filter most — got no BU
//     filter anywhere. Their options come from the BU master instead (GET /companies, already
//     scoped server-side to the caller's own Entities), which is the same source Service PO
//     Master and Employee Master already used for their own hand-rolled Admin BU filters.
//
//   · BU-scoped logins — BU Admin, BU Head, and below. Their reach IS their mapping, so their
//     own `businessUnits[]` is authoritative and needs no request.
//
// `canFilter` encodes the product rule for both: offer the filter only when there are at least
// two BUs to choose between. An Admin on a single-BU tenant, or a BU Admin mapped to exactly one
// BU, has nothing to narrow — the control would be a no-op, and for the single-BU login their one
// BU already IS "all of theirs" (see explicitBuScope, which resolves 'all' to that BU's header).
export const useSelectableBusinessUnits = () => {
  const { businessUnits } = useAuth();
  const isCrossBu = canScopeAcrossBus();

  // Only fetched for the logins that need it. Long staleTime because this mounts on every
  // report and master a cross-BU login opens, and the BU master changes rarely.
  const { data: companiesData } = useCompanies(
    { status: 'active', limit: 200 },
    { enabled: isCrossBu, staleTime: 1000 * 60 * 10 }
  );

  // Normalized to { id, name } — the BU master calls it `company_name`, the login's own mapping
  // calls it `name`.
  const units = useMemo(() => {
    if (isCrossBu) {
      return (companiesData?.data ?? []).map((c) => ({ id: c.id, name: c.company_name }));
    }
    return (businessUnits ?? []).map((bu) => ({ id: bu.id, name: bu.name }));
  }, [isCrossBu, companiesData, businessUnits]);

  return { units, isCrossBu, canFilter: units.length > 1 };
};

export default useSelectableBusinessUnits;
