import { useState } from 'react';
import { useMyTeamEmployees } from '@/hooks/useMyTeam';
import ManagerTeamTimesheetView from '@/components/employee/ManagerTeamTimesheetView';
import EmptyState from '@/components/common/EmptyState';
import { SearchableSelect } from '@/components/ui/searchable-select';

// Standalone Manager screen — split off (2026-08-23) from the employee selector that used to
// live inside "My Work Log" (EmployeeTimesheet.jsx). Reuses ManagerTeamTimesheetView unchanged;
// this page only owns picking which mapped Employee to view/approve.
const ManagerTimesheetApproval = () => {
  const { data: mappedEmployees = [], isLoading } = useMyTeamEmployees();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const selectedEmployee = mappedEmployees.find((e) => String(e.id) === selectedEmployeeId);

  const employeeOptions = mappedEmployees.map((e) => ({ value: String(e.id), label: e.full_name }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Timesheet Approval</h1>
          <p className="text-sm text-muted-foreground">Review and approve your team's timesheets.</p>
        </div>

        <SearchableSelect
          options={employeeOptions}
          value={selectedEmployeeId}
          onValueChange={setSelectedEmployeeId}
          placeholder="Select an Employee"
          searchPlaceholder="Search…"
          className="w-64"
          disabled={isLoading}
        />
      </div>

      {selectedEmployeeId ? (
        <ManagerTeamTimesheetView
          key={selectedEmployeeId}
          employeeId={selectedEmployeeId}
          employeeName={selectedEmployee?.full_name}
        />
      ) : (
        <EmptyState title="Select an Employee to view their timesheet." />
      )}
    </div>
  );
};

export default ManagerTimesheetApproval;
