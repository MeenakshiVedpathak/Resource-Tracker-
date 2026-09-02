import { useState, useMemo, useRef } from 'react';
import { useMyTeamEmployees } from '@/hooks/useMyTeam';
import { useSelectableBusinessUnits } from '@/hooks/useSelectableBusinessUnits';
import BusinessUnitFilter, { ALL_BUS } from '@/components/common/BusinessUnitFilter';
import ManagerTeamTimesheetView from '@/components/employee/ManagerTeamTimesheetView';
import EmptyState from '@/components/common/EmptyState';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';

// Converts the BusinessUnitFilter's string value ('all' | '<id>') to the numeric buId this page
// passes to every API call: null for "All Business Units", a Number otherwise.
const toBuId = (filterValue) =>
  !filterValue || filterValue === ALL_BUS ? null : Number(filterValue);

// Standalone Manager screen — split off (2026-08-23) from the employee selector that used to
// live inside "My Work Log" (EmployeeTimesheet.jsx). Reuses ManagerTeamTimesheetView unchanged;
// this page only owns picking which mapped Employee to view/approve.
const ManagerTimesheetApproval = () => {
  const { units, canFilter } = useSelectableBusinessUnits();

  // BusinessUnitFilter drives a string ('all' | '<id>'); the page works with a numeric buId
  // internally (null = all, Number = specific BU) to match every API call's expectations.
  const [filterValue, setFilterValue] = useState(ALL_BUS);
  const selectedBuId = toBuId(filterValue);

  // A generation counter increments on every BU change so that results from an earlier
  // selection that arrive after a newer one has already fired can be discarded. Each query key
  // embeds the generation, meaning React Query treats the old and new requests as distinct
  // entries and never merges their results.
  const generationRef = useRef(0);
  const [generation, setGeneration] = useState(0);

  const handleBuChange = (v) => {
    generationRef.current += 1;
    setGeneration(generationRef.current);
    setFilterValue(v);
    setSelectedEmployeeId('');
  };

  // ── My-Team employees (primary source) ─────────────────────────────────────────────────────
  // GET /my-team/employees?business_unit_id=<buId>  +  X-Company-Id: <buId>  (specific BU)
  // GET /my-team/employees                                                    (all BUs)
  const myTeamParams = useMemo(
    () => (selectedBuId != null ? { buId: selectedBuId } : {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedBuId, generation],
  );

  const {
    data: mappedEmployees = [],
    isLoading: isLoadingMyTeam,
    isError: isErrorMyTeam,
  } = useMyTeamEmployees(myTeamParams);

  // ── Resolve the employee list ───────────────────────────────────────────────────────────────
  // The ONLY valid source is /my-team/employees — this endpoint is manager-scoped, meaning the
  // backend verifies that the selected employee is mapped to the calling user before serving the
  // approval summary. Using any other source (active/list, /employees master) would show employees
  // the logged-in user cannot actually approve — leading to "This Employee is not one of your
  // mapped Employees" errors from the /my-team/timesheets/* endpoints. An Admin or any other role
  // with no team mappings will correctly see an empty dropdown.
  const employeeList = mappedEmployees;

  const isLoading = isLoadingMyTeam;
  const hasError = isErrorMyTeam;

  // ── Employee picker ─────────────────────────────────────────────────────────────────────────
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const selectedEmployee = employeeList.find((e) => String(e.id) === selectedEmployeeId);

  const employeeOptions = employeeList.map((e) => ({
    value: String(e.id),
    label: e.full_name || e.name || `Employee #${e.id}`,
  }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Timesheet Approval</h1>
          <p className="text-sm text-muted-foreground">Review and approve your team's timesheets.</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {canFilter && (
            <div className="w-56">
              <BusinessUnitFilter
                value={filterValue}
                onChange={handleBuChange}
                className="h-9 w-full text-sm bg-white"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {canFilter && <Label className="text-xs">Employee</Label>}
            <SearchableSelect
              options={employeeOptions}
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
              placeholder={
                isLoading
                  ? 'Loading employees…'
                  : hasError
                    ? 'Error loading employees'
                    : employeeOptions.length === 0
                      ? 'No employees found'
                      : 'Select an Employee'
              }
              searchPlaceholder="Search…"
              className="w-64 h-9 bg-white text-sm"
              disabled={isLoading || hasError || employeeOptions.length === 0}
            />
          </div>
        </div>
      </div>

      {selectedEmployeeId ? (
        <ManagerTeamTimesheetView
          key={selectedEmployeeId}
          employeeId={selectedEmployeeId}
          employeeName={selectedEmployee?.full_name}
        />
      ) : (
        <EmptyState
          title={
            hasError
              ? 'Failed to load employees. Please refresh the page.'
              : 'Select an Employee to view their timesheet.'
          }
        />
      )}
    </div>
  );
};

export default ManagerTimesheetApproval;
