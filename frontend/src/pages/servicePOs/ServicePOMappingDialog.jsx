import { useEffect, useState } from 'react';
import { ChevronRight, X, Users, ListChecks, Search, Inbox } from 'lucide-react';
import {
  useServicePO,
  useAllocateResources,
  useDeallocateResource,
} from '@/hooks/useServicePOs';
import { useActiveEmployees } from '@/hooks/useEmployees';
import {
  useServicePOEmployeeMappings,
  useCreateEmployeeServicePOMapping,
  useDeleteEmployeeServicePOMapping,
  useSetEmployeeServicePOMappingStatus,
} from '@/hooks/useEmployeeServicePOMapping';
import { useCanWrite } from '@/hooks/usePermissions';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import ConfirmDialog from '@/components/common/ConfirmDialog';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Row shape used by both panels below: { key, name, sub, raw }. Normalizing employee
// records and mapping records into this common shape up front means the picker UI
// itself never has to know which one it's rendering — and always has a resolved
// display name to show, even right after a row is moved across (see the dialog body).
const toRow = (key, name, sub, raw) => ({ key, name: name ?? '—', sub, raw });

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

// Left-hand panel: a searchable checklist of records not yet mapped/allocated.
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

// Right-hand panel: records already mapped/allocated, each with an "Is Mapped ?" toggle.
// renderToggle(row) returns the toggle cell content — the two tabs wire different actions
// (deactivate-vs-delete for timesheet mappings, remove-with-confirm for allocations).
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

// Employees can be attached to a Service PO in two independent ways: resource
// allocation (planning) and timesheet mapping (feeds the employee's Project
// dropdown in My Timesheet). Both are managed here, behind one button.
const ServicePOMappingDialog = ({ servicePO, open, onOpenChange }) => {
  const servicePoId = servicePO?.id;
  const { success, error: showError } = useNotification();
  const canManageResources = useCanWrite();

  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [selectedForMapping, setSelectedForMapping] = useState([]);
  const [deleteMappingTarget, setDeleteMappingTarget] = useState(null);

  const [allocSearchLeft, setAllocSearchLeft] = useState('');
  const [allocSearchRight, setAllocSearchRight] = useState('');
  const [mapSearchLeft, setMapSearchLeft] = useState('');
  const [mapSearchRight, setMapSearchRight] = useState('');

  const { data: po } = useServicePO(servicePoId);
  const { data: activeEmployees = [] } = useActiveEmployees();
  const { data: mappings = [], isPending: isLoadingMappings } = useServicePOEmployeeMappings(servicePoId);

  const allocateMutation = useAllocateResources(servicePoId);
  const deallocateMutation = useDeallocateResource(servicePoId);
  const createMappingMutation = useCreateEmployeeServicePOMapping();
  const deleteMappingMutation = useDeleteEmployeeServicePOMapping();
  const mappingStatusMutation = useSetEmployeeServicePOMappingStatus();

  const isActive = po?.status === 'active';

  const allocatedEmployees = po?.employees ?? po?.allocated_employees ?? [];
  const allocatedIds = new Set(allocatedEmployees.map((e) => e.id ?? e.employee_id));
  const availableEmployees = activeEmployees.filter((e) => !allocatedIds.has(e.id));

  const mappedEmployeeIds = new Set(mappings.map((m) => m.employee_id));
  const availableForMapping = activeEmployees.filter((e) => !mappedEmployeeIds.has(e.id));

  // Normalized rows — always resolved from the freshly-fetched server data, so a
  // row moved to the right panel shows its real name immediately, never a blank one.
  const employeeSub = (e) => [e.employee_code ?? e.code, e.designation].filter(Boolean).join(' · ');
  const allocLeftRows = availableEmployees.map((e) =>
    toRow(e.id, e.full_name ?? e.employee_name ?? e.name, employeeSub(e), e)
  );
  const allocRightRows = allocatedEmployees.map((emp) => {
    const empId = emp.id ?? emp.employee_id;
    return toRow(empId, emp.employee_name ?? emp.name, employeeSub({ ...emp, code: emp.employee_code ?? emp.code }), emp);
  });
  const mapLeftRows = availableForMapping.map((e) =>
    toRow(e.id, e.full_name ?? e.employee_name ?? e.name, employeeSub(e), e)
  );
  const mapRightRows = mappings.map((m) => toRow(m.id, m.employee_name ?? m.full_name, m.employee_code, m));

  useEffect(() => {
    if (!open) {
      setSelectedEmployees([]);
      setSelectedForMapping([]);
      setAllocSearchLeft('');
      setAllocSearchRight('');
      setMapSearchLeft('');
      setMapSearchRight('');
    }
  }, [open]);

  const toggleEmployee = (empId) => {
    setSelectedEmployees((prev) =>
      prev.includes(empId) ? prev.filter((x) => x !== empId) : [...prev, empId]
    );
  };

  const toggleAllEmployees = (keys, checked) => {
    setSelectedEmployees((prev) =>
      checked ? Array.from(new Set([...prev, ...keys])) : prev.filter((k) => !keys.includes(k))
    );
  };

  const handleAllocate = () => {
    if (selectedEmployees.length === 0) return;
    allocateMutation.mutate(selectedEmployees, {
      onSuccess: () => {
        success('Resources allocated successfully.');
        setSelectedEmployees([]);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const handleDeallocate = () => {
    if (!removeTarget) return;
    deallocateMutation.mutate(removeTarget.key, {
      onSuccess: () => {
        success(`${removeTarget.name} removed from PO.`);
        setRemoveTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setRemoveTarget(null);
      },
    });
  };

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

  const handleDeleteMapping = () => {
    if (!deleteMappingTarget) return;
    deleteMappingMutation.mutate(deleteMappingTarget.id, {
      onSuccess: () => {
        success('Mapping removed.');
        setDeleteMappingTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setDeleteMappingTarget(null);
      },
    });
  };

  // Bulk-flip every currently-visible mapping's active status in one go (the
  // "Select All" switch above the mapped list).
  const allMappingsActive = mapRightRows.length > 0 && mapRightRows.every((r) => (r.raw.status ?? 'active') === 'active');
  const handleToggleAllMappings = async (checked) => {
    const toChange = mapRightRows.filter((r) => ((r.raw.status ?? 'active') === 'active') !== checked);
    if (toChange.length === 0) return;
    try {
      await Promise.all(
        toChange.map((r) => mappingStatusMutation.mutateAsync({ id: r.key, active: checked }))
      );
    } catch (err) {
      showError(extractApiError(err));
    }
  };

  const canAllocate = isActive && canManageResources;

  return (
    <>
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

          <Tabs defaultValue="allocation" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="allocation" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Resource Allocation
                {allocRightRows.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{allocRightRows.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="timesheet" className="gap-1.5">
                <ListChecks className="h-3.5 w-3.5" />
                Timesheet Mapping
                {mapRightRows.length > 0 && (
                  <Badge variant="secondary" className="text-xs">{mapRightRows.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Resource Allocation */}
            <TabsContent value="allocation" className="space-y-2">
              <div className={cn('grid gap-2 items-start', canAllocate ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-1')}>
                {canAllocate && (
                  <>
                    <SelectPanel
                      rows={allocLeftRows}
                      search={allocSearchLeft}
                      onSearchChange={setAllocSearchLeft}
                      selectedKeys={selectedEmployees}
                      onToggle={toggleEmployee}
                      onToggleAll={toggleAllEmployees}
                    />
                    <MoveButton
                      title={allocateMutation.isPending ? 'Allocating…' : 'Allocate selected'}
                      disabled={selectedEmployees.length === 0 || allocateMutation.isPending}
                      onClick={handleAllocate}
                    />
                  </>
                )}
                <MappedPanel
                  rows={allocRightRows}
                  search={allocSearchRight}
                  onSearchChange={setAllocSearchRight}
                  renderToggle={(row) => (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked
                        disabled={!canManageResources || deallocateMutation.isPending}
                        onCheckedChange={(checked) => !checked && setRemoveTarget(row)}
                      />
                      <span className="text-[11px] font-medium text-green-600">Yes</span>
                    </div>
                  )}
                />
              </div>
              {!isActive && (
                <p className="text-xs text-muted-foreground">
                  This PO is closed — resource allocation is read-only.
                </p>
              )}
            </TabsContent>

            {/* Timesheet Mapping */}
            <TabsContent value="timesheet" className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Employees mapped here see this Service PO in their Timesheet's Project dropdown.
              </p>
              {isLoadingMappings ? (
                <Skeleton className="h-72 w-full" />
              ) : (
                <div className={cn('grid gap-2 items-start', canManageResources ? 'grid-cols-[1fr_auto_1fr]' : 'grid-cols-1')}>
                  {canManageResources && (
                    <>
                      <SelectPanel
                        rows={mapLeftRows}
                        search={mapSearchLeft}
                        onSearchChange={setMapSearchLeft}
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
                    rows={mapRightRows}
                    search={mapSearchRight}
                    onSearchChange={setMapSearchRight}
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
                          {canManageResources && (
                            <button
                              type="button"
                              className="ml-0.5 text-muted-foreground hover:text-destructive"
                              title="Remove mapping"
                              onClick={() => setDeleteMappingTarget(row.raw)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    }}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title="Remove resource?"
        description={`${removeTarget?.name ?? 'This employee'} will be removed from this service PO.`}
        confirmLabel="Remove"
        onConfirm={handleDeallocate}
        isLoading={deallocateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteMappingTarget}
        onOpenChange={(o) => !o && setDeleteMappingTarget(null)}
        title="Remove timesheet mapping?"
        description={`${deleteMappingTarget?.employee_name ?? 'This employee'} will no longer see this Service PO in their Timesheet's Project dropdown.`}
        confirmLabel="Remove"
        onConfirm={handleDeleteMapping}
        isLoading={deleteMappingMutation.isPending}
      />
    </>
  );
};

export default ServicePOMappingDialog;
