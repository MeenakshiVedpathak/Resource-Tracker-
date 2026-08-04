import { useEffect, useState } from 'react';
import { ChevronRight, Search, Inbox } from 'lucide-react';
import { useActiveEmployees } from '@/hooks/useEmployees';
import {
  useServicePOEmployeeMappings,
  useCreateEmployeeServicePOMapping,
  useSetEmployeeServicePOMappingStatus,
} from '@/hooks/useEmployeeServicePOMapping';
import { useCanWrite } from '@/hooks/usePermissions';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Row shape used by both panels below: { key, name, sub, raw }. Normalizing mapping
// records into this common shape up front means the picker UI itself never has to know
// the raw API shape — it just needs a resolved display name.
const toRow = (key, name, sub, raw) => ({ key, name: name ?? '—', sub, raw });

// The mapping API's response shape for the employee on each row hasn't been consistent —
// sometimes flat (employee_name/employee_code), sometimes nested (employee: {...} or
// Employee: {...}). Check every variant so a shape change on the backend doesn't silently
// blank out the name column again.
const resolveMappingEmployee = (m) => {
  const nested = m.employee ?? m.Employee ?? m.employeeDetails ?? m.Employee_Details ?? {};
  return {
    name: m.employee_name ?? m.full_name ?? m.employeeName ?? nested.full_name ?? nested.employee_name ?? nested.name ?? null,
    code: m.employee_code ?? m.employeeCode ?? nested.employee_code ?? nested.code ?? null,
  };
};

const filterRows = (rows, term) => {
  const q = term.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) => r.name.toLowerCase().includes(q) || (r.sub ?? '').toLowerCase().includes(q)
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
    <Inbox className="h-8 w-8 opacity-40" />
    <span className="text-sm">No Data</span>
  </div>
);

const PanelSearchBar = ({ count, search, onSearchChange, children }) => (
  <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
    <span className="whitespace-nowrap text-[11px] font-medium text-muted-foreground">
      Total Record(s): {count}
    </span>
    {children}
    <div className="relative ml-auto w-[160px]">
      <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search…"
        className="h-7 pl-7 text-xs"
      />
    </div>
  </div>
);

// Left-hand panel: a searchable checklist of employees not yet mapped.
const SelectPanel = ({ rows, search, onSearchChange, selectedKeys, onToggle, onToggleAll }) => {
  const filtered = filterRows(rows, search);
  const allChecked = filtered.length > 0 && filtered.every((r) => selectedKeys.includes(r.key));

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-background">
      <PanelSearchBar count={filtered.length} search={search} onSearchChange={onSearchChange} />
      <div className="h-72 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-9 px-3 py-2">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(v) => onToggleAll(filtered.map((r) => r.key), !!v)}
                  />
                </th>
                <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Employee</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.key} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={selectedKeys.includes(row.key)}
                      onCheckedChange={() => onToggle(row.key)}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <p className="text-sm font-medium leading-none">{row.name}</p>
                    {row.sub && <p className="mt-0.5 text-xs text-muted-foreground">{row.sub}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// Right-hand panel: employees already mapped, each with an "Is Mapped ?" toggle
// (deactivate) and a remove (delete) action.
const MappedPanel = ({ rows, search, onSearchChange, renderToggle, selectAll }) => {
  const filtered = filterRows(rows, search);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-background">
      <PanelSearchBar count={filtered.length} search={search} onSearchChange={onSearchChange}>
        {selectAll && (
          <label className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-muted-foreground">
            Select All
            <Switch checked={selectAll.checked} disabled={selectAll.disabled} onCheckedChange={selectAll.onCheckedChange} />
          </label>
        )}
      </PanelSearchBar>
      <div className="h-72 overflow-y-auto">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b">
                <th className="w-28 px-3 py-2 text-left text-xs font-medium text-muted-foreground">Is Mapped ?</th>
                <th className="px-2 py-2 text-left text-xs font-medium text-muted-foreground">Employee</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.key} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    {renderToggle(row)}
                  </td>
                  <td className="px-2 py-2">
                    <p className="text-sm font-medium leading-none">{row.name}</p>
                    {row.sub && <p className="mt-0.5 text-xs text-muted-foreground">{row.sub}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const MoveButton = ({ disabled, onClick, title }) => (
  <div className="flex h-72 items-center justify-center">
    <Button
      type="button"
      size="icon"
      className="h-9 w-9 shrink-0 rounded-full"
      disabled={disabled}
      onClick={onClick}
      title={title}
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
);

// Maps employees to a Service PO for timesheet entry — this is what feeds the employee's
// Project dropdown in My Timesheet. (Resource allocation/planning used to live in a second
// tab here; removed since it wasn't backed by real data.)
const ServicePOMappingDialog = ({ servicePO, open, onOpenChange }) => {
  const servicePoId = servicePO?.id;
  const { success, error: showError } = useNotification();
  const canManageResources = useCanWrite();

  const [selectedForMapping, setSelectedForMapping] = useState([]);
  const [searchLeft, setSearchLeft] = useState('');
  const [searchRight, setSearchRight] = useState('');

  const { data: activeEmployees = [] } = useActiveEmployees();
  const { data: mappings = [], isPending: isLoadingMappings } = useServicePOEmployeeMappings(servicePoId);

  const createMappingMutation = useCreateEmployeeServicePOMapping();
  const mappingStatusMutation = useSetEmployeeServicePOMappingStatus();

  const mappedEmployeeIds = new Set(mappings.map((m) => m.employee_id));
  const availableForMapping = activeEmployees.filter((e) => !mappedEmployeeIds.has(e.id));

  const employeeSub = (e) => [e.employee_code ?? e.code, e.designation].filter(Boolean).join(' · ');
  const leftRows = availableForMapping.map((e) =>
    toRow(e.id, e.full_name ?? e.employee_name ?? e.name, employeeSub(e), e)
  );
  const rightRows = mappings.map((m) => {
    const { name, code } = resolveMappingEmployee(m);
    return toRow(m.id, name, code, m);
  });

  useEffect(() => {
    if (!open) {
      setSelectedForMapping([]);
      setSearchLeft('');
      setSearchRight('');
    }
  }, [open]);

  const toggleMappingSelection = (empId) => {
    setSelectedForMapping((prev) =>
      prev.includes(empId) ? prev.filter((x) => x !== empId) : [...prev, empId]
    );
  };

  const toggleAllMappingSelection = (keys, checked) => {
    setSelectedForMapping((prev) =>
      checked ? Array.from(new Set([...prev, ...keys])) : prev.filter((k) => !keys.includes(k))
    );
  };

  const handleMapSelected = async () => {
    if (selectedForMapping.length === 0) return;
    try {
      await Promise.all(
        selectedForMapping.map((empId) =>
          createMappingMutation.mutateAsync({ employeeId: empId, servicePOId: servicePoId })
        )
      );
      success('Employees mapped for timesheet entry.');
      setSelectedForMapping([]);
    } catch (err) {
      showError(extractApiError(err));
    }
  };

  // Bulk-flip every currently-visible mapping's active status in one go (the
  // "Select All" switch above the mapped list).
  const allMappingsActive = rightRows.length > 0 && rightRows.every((r) => (r.raw.status ?? 'active') === 'active');
  const handleToggleAllMappings = async (checked) => {
    const toChange = rightRows.filter((r) => ((r.raw.status ?? 'active') === 'active') !== checked);
    if (toChange.length === 0) return;
    try {
      await Promise.all(
        toChange.map((r) => mappingStatusMutation.mutateAsync({ id: r.key, active: checked }))
      );
    } catch (err) {
      showError(extractApiError(err));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Map Employees</DialogTitle>
          <DialogDescription>
            {servicePO?.service_po_name ?? servicePO?.service_po_code}
            {servicePO?.service_po_code && servicePO?.service_po_name && (
              <span className="font-mono text-xs"> · {servicePO.service_po_code}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Employees mapped here see this Service PO in their Timesheet's Project dropdown.
          {rightRows.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">{rightRows.length} mapped</Badge>
          )}
        </p>

        {isLoadingMappings ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <div className={cn('grid gap-2 items-start', canManageResources ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-1')}>
            {canManageResources && (
              <>
                <SelectPanel
                  rows={leftRows}
                  search={searchLeft}
                  onSearchChange={setSearchLeft}
                  selectedKeys={selectedForMapping}
                  onToggle={toggleMappingSelection}
                  onToggleAll={toggleAllMappingSelection}
                />
                <MoveButton
                  title={createMappingMutation.isPending ? 'Mapping…' : 'Map selected'}
                  disabled={selectedForMapping.length === 0 || createMappingMutation.isPending}
                  onClick={handleMapSelected}
                />
              </>
            )}
            <MappedPanel
              rows={rightRows}
              search={searchRight}
              onSearchChange={setSearchRight}
              selectAll={canManageResources ? {
                checked: allMappingsActive,
                disabled: mappingStatusMutation.isPending,
                onCheckedChange: handleToggleAllMappings,
              } : undefined}
              renderToggle={(row) => {
                const isMappingActive = (row.raw.status ?? 'active') === 'active';
                return (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={isMappingActive}
                      disabled={mappingStatusMutation.isPending}
                      onCheckedChange={(checked) =>
                        mappingStatusMutation.mutate({ id: row.key, active: checked })
                      }
                    />
                    <span className={cn('text-[11px] font-medium', isMappingActive ? 'text-green-600' : 'text-slate-400')}>
                      {isMappingActive ? 'Yes' : 'No'}
                    </span>
                  </div>
                );
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ServicePOMappingDialog;
