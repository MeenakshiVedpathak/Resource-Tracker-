import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { useIsMutating } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, UserCog, Search, Download, Upload, CheckCircle2, AlertCircle, FileDown, FileText, Printer, FileSpreadsheet, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEmployees, useImportEmployees, useToggleEmployeeStatus, useUpdateEmployee, useEmployeeMappings } from '@/hooks/useEmployees';
import { useEmployeeServicePOMappingOptions, useSaveEmployeeServicePOMapping } from '@/hooks/useEmployeeServicePOMapping';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useRoles } from '@/hooks/useRoles';
import { useCompanies } from '@/hooks/useCompanies';
import { employeesApi } from '@/api/employees.api';
import { useCanWrite } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { ROLE_NAMES, getAssignableRoleNames, ADDITIONAL_ROLE_NAMES, SENIOR_ROLE_NAMES } from '@/constants/roleHierarchy';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const columnHelper = createColumnHelper();

// Keeps each mapping list's header row in place while its body scrolls. Needs the list's scroll
// container to be the Table's own wrapper (via containerClassName) — sticky resolves against the
// nearest scrolling ancestor, so an extra overflow div around the Table would break it.
const STICKY_HEAD = 'sticky top-0 z-10 bg-background';

const TruncatedCell = ({ value, maxWidth = '150px', className }) => {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className={cn("text-sm truncate", className)} style={{ maxWidth }} title={value}>
      {value}
    </div>
  );
};

// Roles and Business Units are no longer picked on the Add/Edit Employee form (see
// EmployeeForm.jsx and [[project_employee_identity_migration]]) — they're mapped here instead,
// as two checkbox tables, opened per-row from Employee List's "Map Roles & Business Units"
// action. Checking "Service PO Admin" reveals a third section here — no separate row action/
// icon for Service PO mapping — since that role gets company-wide, BU-unrestricted PO access
// (backend flag `unrestricted: true`), so there's nothing to pre-filter: it's just "pick from
// every active Service PO." (Delivery Head is NOT an RBAC role in this system — it's a per-PO
// field set via the Service PO Form's own "Delivery Head" dropdown — so it never appears as a
// checkbox here; once the backend adds it into the same unrestricted bucket as Service PO Admin,
// only the eligibility response's `unrestricted` flag changes, not this UI.)
const RoleBuMappingDialog = ({ employee, actorRoleName, allRoles, businessUnits, onOpenChange }) => {
  const { success, error: showError } = useNotification();
  const updateMutation = useUpdateEmployee(employee?.id);
  const saveServicePoMutation = useSaveEmployeeServicePOMapping(employee?.id);
  const { data: mappings, isLoading: mappingsLoading } = useEmployeeMappings(employee?.id);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [selectedBuIds, setSelectedBuIds] = useState([]);
  const [selectedPoIds, setSelectedPoIds] = useState([]);

  // GET /employees (list) carries no role/BU data, so the row this dialog opened from can't seed
  // the checkboxes — fetch the employee's actual mappings fresh instead (see
  // [[project_employee_identity_migration]]).
  useEffect(() => {
    if (mappings) {
      setSelectedRoleIds(mappings.role_ids ?? []);
      setSelectedBuIds(mappings.business_unit_ids ?? []);
    }
  }, [mappings]);

  // Every row here IS an employee, so plain Employee is a mandatory baseline role — pinned
  // checked & disabled, same standing bypass EmployeeForm.jsx used to apply for HR (whose
  // ROLE_CREATION_MATRIX entry is deliberately empty).
  const employeeRoleId = allRoles.find((r) => r.role_name === ROLE_NAMES.EMPLOYEE)?.id;
  const servicePoAdminRoleId = allRoles.find((r) => r.role_name === ROLE_NAMES.SERVICE_PO_ADMIN)?.id;
  const showServicePoSection = servicePoAdminRoleId != null && selectedRoleIds.includes(servicePoAdminRoleId);
  const assignableNames = [...new Set([...getAssignableRoleNames(actorRoleName), ROLE_NAMES.EMPLOYEE])];
  const roleRows = allRoles.filter(
    (r) => assignableNames.includes(r.role_name) || ADDITIONAL_ROLE_NAMES.includes(r.role_name)
  );

  // Full active PO list (company-wide) — Service PO Admin needs no BU-eligibility filtering, so
  // this doesn't call the employee-scoped options endpoint at all here.
  const { data: activePOs, isLoading: activePOsLoading } = useActiveServicePOs(showServicePoSection);
  // Still needed to seed which POs come pre-checked (existing mapping), separate from the list
  // of options itself.
  const { data: existingMapping } = useEmployeeServicePOMappingOptions(showServicePoSection ? employee?.id : null);

  useEffect(() => {
    if (existingMapping) {
      setSelectedPoIds(existingMapping.mapped_service_po_ids ?? []);
    }
  }, [existingMapping]);

  const toggleRole = (roleId) => {
    if (roleId === employeeRoleId) return;
    setSelectedRoleIds((prev) => {
      if (prev.includes(roleId)) return prev.filter((id) => id !== roleId);
      const isSenior = SENIOR_ROLE_NAMES.includes(allRoles.find((r) => r.id === roleId)?.role_name);
      // At most one senior tier (Platform Admin/Admin/Entity Admin/BU Admin/BU Head) at a time —
      // client-side UX guard only, the real enforcement is server-side.
      const base = isSenior
        ? prev.filter((id) => !SENIOR_ROLE_NAMES.includes(allRoles.find((r) => r.id === id)?.role_name))
        : prev;
      return [...base, roleId];
    });
  };

  const toggleBu = (buId) => {
    setSelectedBuIds((prev) => (prev.includes(buId) ? prev.filter((id) => id !== buId) : [...prev, buId]));
  };

  const togglePo = (poId) => {
    setSelectedPoIds((prev) => (prev.includes(poId) ? prev.filter((id) => id !== poId) : [...prev, poId]));
  };

  const isSaving = updateMutation.isPending || saveServicePoMutation.isPending;

  const handleSave = async () => {
    const roleIds = employeeRoleId != null && !selectedRoleIds.includes(employeeRoleId)
      ? [...selectedRoleIds, employeeRoleId]
      : selectedRoleIds;
    try {
      await updateMutation.mutateAsync({ role_ids: roleIds, business_unit_ids: selectedBuIds });
      if (showServicePoSection) {
        // Backend rejects the whole request wholesale if any id fails re-validation — let that
        // throw into the catch below so nothing here is treated as saved.
        await saveServicePoMutation.mutateAsync(selectedPoIds);
      }
      success(`Roles, Business Units${showServicePoSection ? ' & Service PO mapping' : ''} updated for ${employee.full_name}.`);
      onOpenChange(false);
    } catch (err) {
      showError(extractApiError(err));
    }
  };

  return (
    <Dialog open={!!employee} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl flex max-h-[90vh] flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Map Roles &amp; Business Units</DialogTitle>
          <DialogDescription>Assign roles and business units for {employee?.full_name}.</DialogDescription>
        </DialogHeader>
        {/* min-h-0 is what lets this flex child actually shrink and scroll instead of
            stretching the dialog past the viewport. */}
        <div className="flex-1 min-h-0 space-y-4 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Roles</Label>
            <Table containerClassName="border rounded-md max-h-[240px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn('w-10', STICKY_HEAD)}></TableHead>
                    <TableHead className={STICKY_HEAD}>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Checkbox
                          checked={r.id === employeeRoleId ? true : selectedRoleIds.includes(r.id)}
                          disabled={r.id === employeeRoleId}
                          onCheckedChange={() => toggleRole(r.id)}
                        />
                      </TableCell>
                      <TableCell className="text-sm">{r.role_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Business Units</Label>
            <Table containerClassName="border rounded-md max-h-[240px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn('w-10', STICKY_HEAD)}></TableHead>
                    <TableHead className={STICKY_HEAD}>Business Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businessUnits.map((bu) => (
                    <TableRow key={bu.id}>
                      <TableCell>
                        <Checkbox checked={selectedBuIds.includes(bu.id)} onCheckedChange={() => toggleBu(bu.id)} />
                      </TableCell>
                      <TableCell className="text-sm">{bu.company_name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
          </div>
        </div>
        {showServicePoSection && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Service POs</Label>
              <Badge variant="secondary" className="text-[10px]">Company-wide access</Badge>
            </div>
            <Table containerClassName="border rounded-md max-h-[260px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn('w-10', STICKY_HEAD)}></TableHead>
                    <TableHead className={STICKY_HEAD}>Service PO</TableHead>
                    <TableHead className={STICKY_HEAD}>Client</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activePOsLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : (activePOs ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">
                        No active Service POs found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (activePOs ?? []).map((po) => (
                      <TableRow key={po.id}>
                        <TableCell>
                          <Checkbox checked={selectedPoIds.includes(po.id)} onCheckedChange={() => togglePo(po.id)} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {po.service_po_name}
                          {po.service_po_code ? ` (${po.service_po_code})` : ''}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{po.client?.client_name ?? '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
            </Table>
          </div>
        )}
        </div>
        <DialogFooter className="shrink-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || mappingsLoading}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const StatusToggle = ({ employee }) => {
  const { mutate, isPending } = useToggleEmployeeStatus();
  const isActive = employee.status === 'active';
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Switch
        checked={isActive}
        disabled={isPending}
        onCheckedChange={(checked) =>
          mutate({ id: employee.id, status: checked ? 'active' : 'inactive' })
        }
      />
      <span className={cn('text-xs font-medium', isActive ? 'text-green-600' : 'text-slate-400')}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
};



const EmployeeList = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [mappingTarget, setMappingTarget] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const [sorting, setSorting] = useState([]);

  const params = {
    page,
    limit,
    status: statusFilter,
    ...(roleFilter !== 'all' && { role_id: roleFilter }),
    ...(debouncedSearch && debouncedSearch.length >= 3 && { search: debouncedSearch }),
    ...(sorting[0] && { sortBy: sorting[0].id, sortOrder: sorting[0].desc ? 'desc' : 'asc' }),
  };

  const { data, isPending, isFetching } = useEmployees(params);
  const { data: rolesData } = useRoles({ limit: 100 });
  // Sourced for the "Map Roles & Business Units" dialog's Business Units table.
  const { data: companiesData } = useCompanies({ status: 'active', limit: 200 });
  const importMutation = useImportEmployees();
  const isMutating = useIsMutating();
  const fileInputRef = useRef(null);

  const [previewData, setPreviewData] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [previewLimit, setPreviewLimit] = useState(5);

  const { role: actorRoleName } = useAuth();
  const employees = data?.data ?? [];
  const meta = data?.meta ?? {};
  // BU Admin sits below Admin/Entity Admin in the hierarchy and can't manage senior-tier
  // accounts, so those roles shouldn't appear as filter options for a BU Admin login.
  const roleFilterOptions =
    actorRoleName === ROLE_NAMES.BU_ADMIN
      ? (rolesData?.data ?? []).filter(
          (r) => ![ROLE_NAMES.ADMIN, ROLE_NAMES.BU_ADMIN, ROLE_NAMES.ENTITY_ADMIN].includes(r.role_name)
        )
      : rolesData?.data ?? [];
  const isHR = useCanWrite();

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (roleFilter !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter('all');
    setRoleFilter('all');
    setPage(1);
  };

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 150,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) => {
        return isHR ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              title="Edit"
              onClick={() => navigate(buildPath(ROUTES.EMPLOYEE_EDIT, { id: row.original.id }))}
              className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              className="h-6 w-6 p-0 bg-teal-600 hover:bg-teal-700 text-white rounded transition-colors"
              title="Map Roles & Business Units"
              onClick={() => setMappingTarget(row.original)}
            >
              <UserCog className="h-3 w-3" />
            </Button>
          </div>
        ) : null;
      },
    }),
    columnHelper.accessor('employee_code', {
      header: 'Employee ID',
      size: 130,
      meta: { sticky: true, left: 120 },
      cell: (info) => (
        <TruncatedCell value={info.getValue()} maxWidth="100px" className="font-medium" />
      ),
    }),
    columnHelper.accessor('full_name', {
      header: 'Name',
      size: 200,
      meta: { sticky: true, left: 250 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="160px" />,
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      size: 220,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="190px" />,
    }),
    columnHelper.accessor('designation', {
      header: 'Designation',
      size: 180,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="160px" />,
    }),
    columnHelper.accessor('businessUnits', {
      header: 'Business Units',
      size: 180,
      cell: (info) => {
        const list = info.row.original.businessUnits ?? [];
        if (!list.length) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {list.map((bu, i) => (
              <Badge key={bu.id ?? i} variant="outline" className="text-xs">
                {bu.name ?? bu.company_name}
              </Badge>
            ))}
          </div>
        );
      },
    }),
    columnHelper.accessor('total_experience', {
      header: 'Total Experience',
      size: 120,
      cell: (info) => {
        const val = info.getValue();
        return val != null
          ? <span className="text-sm tabular-nums whitespace-nowrap">{val} yrs</span>
          : <span className="text-sm text-muted-foreground">—</span>;
      },
    }),
    columnHelper.accessor('company_experience', {
      header: 'Company Experience',
      size: 140,
      cell: (info) => {
        const val = info.getValue();
        return val != null
          ? <span className="text-sm tabular-nums whitespace-nowrap">{val} yrs</span>
          : <span className="text-sm text-muted-foreground">—</span>;
      },
    }),
    columnHelper.accessor('date_of_joining', {
      header: 'Joined',
      size: 110,
      cell: (info) => <span className="text-sm whitespace-nowrap">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 140,
      cell: (info) => <StatusToggle employee={info.row.original} />,
    }),
    columnHelper.accessor('is_timesheet_approval_required', {
      header: 'Timesheet Approval',
      size: 150,
      // Straight from the API response, same as every other status-like column here — never
      // computed client-side.
      cell: (info) => {
        const required = info.getValue() ?? true;
        return (
          <Badge variant={required ? 'secondary' : 'outline'} className="text-xs">
            {required ? 'Required' : 'Not Required'}
          </Badge>
        );
      },
    }),
  ], [navigate, isHR]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleDownloadSample = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Employee Code': 'EMP-0076',
      'Full Name': 'Omkar Patil',
      'Designation': 'Software Engineer',
      'Total Experience': 5.2,
      'Company Experience': 2.1,
      'Email ID': 'omkar@example.com',
      'Resource Description': 'Java, React',
      'Date of Joining': '2023-01-15',
      'Date of Leaving': ''
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employee_sample.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (data.length > 0) {
          setPreviewData(data);
          setPreviewLimit(5);
          setPreviewFile(file);
          setIsPreviewOpen(true);
        }
      } catch (error) {
        showError('Failed to parse Excel file');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = () => {
    if (!previewFile) return;
    
    importMutation.mutate(previewFile, {
      onSuccess: (res) => {
        setImportResult(res);
        setIsPreviewOpen(false);
        setPreviewFile(null);
        setPreviewData(null);
      },
      onError: (err) => {
        // If the backend returns a 400 with a detailed error array, capture it
        if (err.response?.data) {
          setImportResult(err.response.data);
          setIsPreviewOpen(false);
          setPreviewFile(null);
          setPreviewData(null);
        } else {
          showError(extractApiError(err));
        }
      }
    });
  };

  const getExportParams = () => ({
    status: statusFilter,
    ...(roleFilter !== 'all' && { role_id: roleFilter }),
    ...(debouncedSearch && debouncedSearch.length >= 3 && { search: debouncedSearch }),
  });

  // The real backend caps `limit` at 200 per request (bakend/src/validations/employeeValidation.js)
  // and rejects anything higher outright, so exports/print page through it instead of asking for
  // everything in one call.
  const EXPORT_PAGE_LIMIT = 200;

  const fetchAllEmployeesForExport = async (filterParams) => {
    const all = [];
    let page = 1;
    let total = Infinity;
    while (all.length < total) {
      const res = await employeesApi.getAll({ ...filterParams, page, limit: EXPORT_PAGE_LIMIT });
      const batch = res?.data ?? [];
      if (!batch.length) break;
      all.push(...batch);
      total = res?.meta?.total ?? all.length;
      page += 1;
    }
    return all;
  };

  const handleExportExcel = async () => {
    try {
      const data = await fetchAllEmployeesForExport(getExportParams());
      if (data.length === 0) {
        showError("No data to export");
        return;
      }
      const exportData = data.map(emp => ({
        'Employee ID': emp.employee_code,
        'Name': emp.full_name,
        'Email ID': emp.email,
        'Designation': emp.designation,
        'Business Units': (emp.businessUnits ?? []).map(bu => bu.name ?? bu.company_name).join(', '),
        'Total Experience (yrs)': emp.total_experience,
        'Company Experience (yrs)': emp.company_experience,
        'Joined Date': formatDate(emp.date_of_joining),
        'Status': emp.status,
        'Timesheet Approval': (emp.is_timesheet_approval_required ?? true) ? 'Required' : 'Not Required'
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Employees");
      XLSX.writeFile(wb, "employees_export.xlsx");
      success("Exported to Excel successfully");
    } catch (error) {
      console.error("Excel Export Error:", error);
      showError("Failed to export Excel");
    }
  };

  const handleExportPDF = async () => {
    try {
      const data = await fetchAllEmployeesForExport(getExportParams());
      if (data.length === 0) {
        showError("No data to export");
        return;
      }
      const doc = new jsPDF();
      doc.text("Employees List", 14, 15);
      
      const tableColumn = ["ID", "Name", "Email", "Designation", "Total Exp", "Comp Exp", "Status"];
      const tableRows = [];

      data.forEach(emp => {
        const rowData = [
          emp.employee_code,
          emp.full_name,
          emp.email,
          emp.designation,
          emp.total_experience || '-',
          emp.company_experience || '-',
          emp.status
        ];
        tableRows.push(rowData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
      });
      doc.save("employees_export.pdf");
      success("Exported to PDF successfully");
    } catch (error) {
      console.error("PDF Export Error:", error);
      showError("Failed to export PDF");
    }
  };

  const handlePrint = async () => {
    try {
      const data = await fetchAllEmployeesForExport(getExportParams());
      if (data.length === 0) {
        showError("No data to print");
        return;
      }
      
      const printWindow = window.open('', '', 'width=800,height=600');
      printWindow.document.write(`
        <html>
          <head>
            <title>Employees List</title>
            <style>
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              body { font-family: sans-serif; padding: 20px; }
            </style>
          </head>
          <body>
            <h2>Employees List</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Designation</th>
                  <th>Total Exp</th>
                  <th>Comp Exp</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(emp => `
                  <tr>
                    <td>${emp.employee_code || ''}</td>
                    <td>${emp.full_name || ''}</td>
                    <td>${emp.email || ''}</td>
                    <td>${emp.designation || ''}</td>
                    <td>${emp.total_experience || '-'}</td>
                    <td>${emp.company_experience || '-'}</td>
                    <td>${emp.status || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } catch (error) {
      console.error("Print Error:", error);
      showError("Failed to print");
    }
  };

  const renderImportResults = () => {
    if (!importResult) return null;
    
    const data = importResult.data || importResult;
    const errors = data.error_rows || data.errors || data.failed || [];
    const total = data.total ?? data.total_processed ?? 0;
    const imported = data.imported ?? data.success_count ?? 0;
    const skipped = data.skipped ?? data.error_count ?? errors.length ?? 0;

    return (
      <div className="space-y-5">
        {/* Summary badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2">
            <span className="text-xs text-muted-foreground">Total rows:</span>
            <span className="font-mono text-xs font-semibold">{total}</span>
          </div>
          <Badge className="gap-1.5 bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {imported} imported
          </Badge>
          {skipped > 0 && (
            <Badge variant="destructive" className="gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {skipped} skipped
            </Badge>
          )}
        </div>

        {/* Error rows */}
        {skipped > 0 && errors.length > 0 && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                Error Rows ({skipped})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-destructive/5">
                      <TableHead className="w-24 sticky top-0 bg-red-50">Row #</TableHead>
                      <TableHead className="sticky top-0 bg-red-50">Error Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-destructive/5">
                        <TableCell className="font-mono text-xs">
                          {row.row ?? row.rowNumber ?? row.row_number ?? idx + 1}
                        </TableCell>
                        <TableCell className="text-sm text-destructive">
                          {row.errors?.length > 0
                            ? row.errors.join(', ')
                            : row.message ?? row.error_message ?? row.error ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
        
        {skipped === 0 && (
          <div className="text-center py-8 text-green-600 bg-green-50 rounded-md border border-green-100">
             All records were imported successfully!
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Employees"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code..."
                className="pl-9 w-[250px] h-9 text-sm bg-white"
                value={search}
                onChange={handleSearch}
              />
            </div>
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((prev) => !prev)}
              activeCount={activeFilterCount}
            />
            {isHR && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 bg-white">
                    <FileDown className="h-4 w-4" /> Export <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                    <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                    Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                    <FileText className="mr-2 h-4 w-4 text-red-500" />
                    PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
                    <Printer className="mr-2 h-4 w-4 text-slate-600" />
                    Print / View
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {isHR && (
              <Button variant="outline" size="sm" className="h-9 gap-1.5 bg-white" onClick={handleDownloadSample}>
                <Download className="h-4 w-4" /> Sample
              </Button>
            )}
            {isHR && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx,.csv"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 bg-white"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importMutation.isPending}
                >
                  <Upload className="h-4 w-4" />
                  {importMutation.isPending ? 'Importing…' : 'Import Excel'}
                </Button>
              </>
            )}
            {isHR && !isPreviewOpen && !importResult && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(ROUTES.EMPLOYEE_NEW)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Employee
              </Button>
            )}
          </div>
        }
      />

      <FilterPanel isOpen={filtersOpen} maxHeightClass="max-h-[200px]" onClear={clearFilters} showClear={activeFilterCount > 0}>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Status</Label>
          <div className="flex items-center rounded-md border overflow-hidden h-9 text-sm bg-white">
            {[
              { label: 'All', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ].map(({ label, value }) => (
              <button
                key={value}
                onClick={() => { setStatusFilter(value); setPage(1); }}
                className={cn(
                  'flex-1 px-3 h-full font-medium text-center transition-colors border-r last:border-r-0',
                  statusFilter === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Role</Label>
          <SearchableSelect
            options={[
              { label: "All roles", value: "all" },
              ...roleFilterOptions.map((r) => ({
                label: r.role_name,
                value: String(r.id)
              }))
            ]}
            value={roleFilter}
            onValueChange={(v) => { setRoleFilter(v); setPage(1); }}
            placeholder="All roles"
            searchPlaceholder="Search role..."
            className="h-9 w-full text-sm bg-white"
          />
        </div>
      </FilterPanel>

      {importResult ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Import Results</h3>
            <Button variant="outline" onClick={() => setImportResult(null)}>
              Back to Employees
            </Button>
          </div>
          {renderImportResults()}
        </div>
      ) : isPreviewOpen ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-lg font-medium text-slate-800">Preview Import Data</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[60vh]">
              {previewData && previewData.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {previewData[0]?.map((header, i) => (
                        <TableHead key={i} className="whitespace-nowrap font-semibold sticky top-0 bg-muted/50">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(1, previewLimit + 1).map((row, i) => (
                      <TableRow key={i}>
                        {previewData[0].map((_, colIndex) => (
                          <TableCell key={colIndex} className="whitespace-nowrap py-3 text-sm">
                            {row[colIndex] != null ? row[colIndex].toString() : '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {previewData.length > previewLimit + 1 && (
                      <TableRow>
                        <TableCell colSpan={previewData[0].length} className="text-center bg-muted/10 py-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => setPreviewLimit(prev => Math.min(prev + 10, previewData.length - 1))}
                          >
                            Show more rows ({previewData.length - previewLimit - 1} remaining)
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-3 bg-muted/10">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)} disabled={importMutation.isPending}>
                Cancel
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConfirmImport} disabled={importMutation.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {importMutation.isPending ? 'Importing…' : 'Confirm Import'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={employees}
          isLoading={isPending}
          toolbar={null}
          pagination={meta.total != null ? {
            page: meta.current_page ?? page,
            limit: meta.per_page ?? limit,
            total: meta.total,
          } : undefined}
          sorting={sorting}
          onSortingChange={(s) => { setSorting(s); setPage(1); }}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
          onRowClick={(row) => navigate(buildPath(ROUTES.EMPLOYEE_EDIT, { id: row.id }))}
        />
      )}

      <RoleBuMappingDialog
        employee={mappingTarget}
        actorRoleName={actorRoleName}
        allRoles={rolesData?.data ?? []}
        businessUnits={companiesData?.data ?? []}
        onOpenChange={(open) => !open && setMappingTarget(null)}
      />

      <Outlet />
    </div>
  );
};

export default EmployeeList;
