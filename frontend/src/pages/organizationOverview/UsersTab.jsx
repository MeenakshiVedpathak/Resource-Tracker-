import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createColumnHelper } from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import DataTable from '@/components/common/DataTable';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotification } from '@/hooks/useNotification';
import { cn } from '@/utils/cn';
import { matchesUser } from '@/utils/organizationOverview';

const ALL = 'all';
const DEFAULT_LIMIT = 10;
const columnHelper = createColumnHelper();

// Exported as-is, respecting whatever the current search/filters show — not just the current page.
const toExportRows = (rows) => rows.map((u) => ({
  Name: u.name,
  Email: u.email,
  'Employee ID': u.employeeId,
  'Role(s)': u.roles.join(', '),
  BU: u.buName,
  Entity: u.entityName,
  Status: u.status,
}));

// Every column below declares an explicit `size` — DataTable renders with `table-fixed`, so
// columns left without one (as Email/Employee ID originally were) fight over layout and their
// text visually overlaps instead of truncating.
const TruncatedCell = ({ value, maxWidth = '150px', className }) => {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className={cn('text-sm truncate', className)} style={{ maxWidth }} title={value}>
      {value}
    </div>
  );
};

// Tab 4 — all data comes from the same normalized `users` array the parent already holds (one
// API call); search/filters below are pure client-side derivation, no requests.
const UsersTab = ({ users, search, isLoading, toolbarSlot }) => {
  const { success, error: showError } = useNotification();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [entityFilter, setEntityFilter] = useState(ALL);
  const [buFilter, setBuFilter] = useState(ALL);
  const [roleFilter, setRoleFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const entityOptions = useMemo(() => Array.from(new Set(users.map((u) => u.entityName))).sort(), [users]);
  // Narrowed by the Entity choice above it — offering another Entity's BUs here just produced
  // an empty table (no user is in both), the same cascade every other Entity+BU filter pair in
  // the app already does (see components/common/BusinessUnitFilter's `entityId` prop).
  const buOptions = useMemo(
    () => Array.from(new Set(
      users.filter((u) => entityFilter === ALL || u.entityName === entityFilter).map((u) => u.buName)
    )).sort(),
    [users, entityFilter]
  );
  const roleOptions = useMemo(() => Array.from(new Set(users.flatMap((u) => u.roles))).sort(), [users]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return users.filter((u) =>
      (!term || matchesUser(u, term)) &&
      (entityFilter === ALL || u.entityName === entityFilter) &&
      (buFilter === ALL || u.buName === buFilter) &&
      (roleFilter === ALL || u.roles.includes(roleFilter)) &&
      (statusFilter === ALL || u.status === statusFilter)
    );
  }, [users, search, entityFilter, buFilter, roleFilter, statusFilter]);

  // A filter/search change can strand `page` past the new (smaller) result set — reset back to
  // page 1 whenever the filtered set's own inputs change, same as every other paginated list.
  useEffect(() => setPage(1), [search, entityFilter, buFilter, roleFilter, statusFilter]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * limit, page * limit),
    [filtered, page, limit],
  );

  const activeCount = [entityFilter, buFilter, roleFilter, statusFilter].filter((v) => v !== ALL).length;

  const clearFilters = () => {
    setEntityFilter(ALL);
    setBuFilter(ALL);
    setRoleFilter(ALL);
    setStatusFilter(ALL);
  };

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      showError('No data to export');
      return;
    }
    try {
      const ws = XLSX.utils.json_to_sheet(toExportRows(filtered));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Users');
      XLSX.writeFile(wb, 'users_export.xlsx');
      success('Exported to Excel successfully');
    } catch (err) {
      console.error('Excel Export Error:', err);
      showError('Failed to export Excel');
    }
  };

  const handleExportPDF = () => {
    if (filtered.length === 0) {
      showError('No data to export');
      return;
    }
    try {
      const doc = new jsPDF();
      doc.text('Users', 14, 15);
      autoTable(doc, {
        head: [['Name', 'Email', 'Employee ID', 'Role(s)', 'BU', 'Entity', 'Status']],
        body: filtered.map((u) => [u.name, u.email, u.employeeId, u.roles.join(', '), u.buName, u.entityName, u.status]),
        startY: 20,
      });
      doc.save('users_export.pdf');
      success('Exported to PDF successfully');
    } catch (err) {
      console.error('PDF Export Error:', err);
      showError('Failed to export PDF');
    }
  };

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      size: 180,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="160px" className="font-medium" />,
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      size: 220,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="200px" />,
    }),
    columnHelper.accessor('employeeId', {
      header: 'Employee ID',
      size: 120,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="100px" />,
    }),
    columnHelper.accessor('roles', {
      header: 'Role(s)',
      size: 220,
      cell: (info) => {
        const roles = info.getValue();
        if (!roles.length) return <span className="text-sm text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {roles.map((role) => <Badge key={role} variant="secondary" className="text-[10px]">{role}</Badge>)}
          </div>
        );
      },
    }),
    columnHelper.accessor('buName', {
      header: 'BU',
      size: 170,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="150px" />,
    }),
    columnHelper.accessor('entityName', {
      header: 'Entity',
      size: 150,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="130px" />,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 100,
      cell: (info) => (
        <Badge variant={info.getValue() === 'active' ? 'success' : 'muted'} className="capitalize">
          {info.getValue()}
        </Badge>
      ),
    }),
  ];

  return (
    <div className="flex h-full min-h-0 flex-col space-y-3">
      {/* Rendered into the tab-bar row (see OrganizationOverview.jsx) instead of its own row here
          — this tab is only ever visible while its own portal target exists, so no fallback. */}
      {toolbarSlot && createPortal(
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="toolbar" className="bg-white">
                <FileDown className="h-4 w-4" /> Export
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
            </DropdownMenuContent>
          </DropdownMenu>
          <FilterToggleButton isOpen={filtersOpen} onToggle={() => setFiltersOpen((o) => !o)} activeCount={activeCount} />
        </div>,
        toolbarSlot
      )}
      <FilterPanel isOpen={filtersOpen} maxHeightClass="max-h-[200px]" gridClassName="grid-cols-2 sm:grid-cols-4" onClear={clearFilters} showClear={activeCount > 0}>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Entity</Label>
          <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setBuFilter(ALL); }}>
            <SelectTrigger className="h-9 bg-white text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Entities</SelectItem>
              {entityOptions.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">BU</Label>
          <Select value={buFilter} onValueChange={setBuFilter}>
            <SelectTrigger className="h-9 bg-white text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All BUs</SelectItem>
              {buOptions.map((bu) => <SelectItem key={bu} value={bu}>{bu}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Role</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-9 bg-white text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Roles</SelectItem>
              {roleOptions.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 bg-white text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FilterPanel>
      <DataTable
        columns={columns}
        data={paged}
        isLoading={isLoading}
        pagination={filtered.length > 0 ? { page, limit, total: filtered.length } : undefined}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setLimit(size); setPage(1); }}
      />
    </div>
  );
};

export default UsersTab;
