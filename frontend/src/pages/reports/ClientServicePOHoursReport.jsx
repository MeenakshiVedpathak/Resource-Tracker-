import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ChevronDown, ChevronUp, ChevronsUpDown, Download, Filter, Search } from 'lucide-react';
import { useClientServicePOHours } from '@/hooks/useReports';
import { useActiveClients } from '@/hooks/useClients';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useActiveServiceTypes } from '@/hooks/useServiceTypes';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useCanViewOriginalData } from '@/hooks/usePermissions';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { formatDate, formatHours } from '@/utils/formatters';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { cn } from '@/utils/cn';

const now = new Date();
const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

const STATUS_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Pending', value: 'pending' },
  { label: 'On Hold', value: 'on-hold' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Closed', value: 'closed' },
];

const GRID_COLS = 'grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_110px]';

const HOURS_NUMFMT = '#,##0.00';

// The installed 'xlsx' package (SheetJS community edition) silently drops font/fill cell
// styling on write (confirmed by inspecting a written file's styles.xml — no bold/color
// survives) — only column widths, merges, and number formats actually persist. So this sticks
// to those: a merged title/period row, sized columns, and a real 2-decimal number format on
// Hours rather than a raw float.
const exportToExcel = (clientGroups, periodLabel) => {
  const header = ['Client', 'Service PO', 'Hours'];
  const aoa = [
    ['Client Service PO Hours Report'],
    [periodLabel ? `Period: ${periodLabel}` : ''],
    [],
    header,
  ];

  // One row per Service PO — the client name repeats on every row for that client rather than
  // collapsing into a separate subtotal row, so the Client column stays a plain, filterable list.
  clientGroups.forEach((group) => {
    (group.service_pos ?? []).forEach((po) => {
      aoa.push([group.client_name, po.service_po_name ?? '', Number(po.hours) || 0]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 30 }, { wch: 38 }, { wch: 12 }];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
  ];

  const HOURS_COL = 2;
  const HEADER_ROW = 3;
  for (let r = HEADER_ROW + 1; r < aoa.length; r++) {
    const ref = XLSX.utils.encode_cell({ r, c: HOURS_COL });
    if (ws[ref]) ws[ref].z = HOURS_NUMFMT;
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Client Service PO Hours');
  XLSX.writeFile(wb, 'Client_Service_PO_Hours_Report.xlsx');
};

const SortableHeader = ({ label, column, sortBy, sortOrder, onSort, align }) => {
  const isActive = sortBy === column;
  const Icon = isActive ? (sortOrder === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        'inline-flex items-center gap-1 hover:text-foreground transition-colors',
        align === 'right' && 'justify-end w-full'
      )}
    >
      {label}
      <Icon className={cn('h-3 w-3', !isActive && 'opacity-40')} />
    </button>
  );
};

const ClientServicePOHoursReport = () => {
  const [monthYear, setMonthYear] = useState({
    month: prevMonth.getMonth() + 1,
    year: prevMonth.getFullYear(),
  });

  const [clientId, setClientId] = useState('all');
  const [poId, setPoId] = useState('all');
  const [serviceTypeId, setServiceTypeId] = useState('all');
  const [employeeId, setEmployeeId] = useState('all');
  const [status, setStatus] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [collapsedClientIds, setCollapsedClientIds] = useState(() => new Set());
  const canViewOriginal = useCanViewOriginalData();
  const [hoursSource, setHoursSource] = useState('M');

  // Role no longer grants Original-data visibility (e.g. role reassigned mid-session) — force
  // back to Modified, same as every other report.
  useEffect(() => {
    if (!canViewOriginal) setHoursSource('M');
  }, [canViewOriginal]);
  // 'client' | 'servicePO' | 'hours'. 'client'/'hours' reorder the client groups; 'servicePO'
  // (and 'hours' too) also reorders each group's own service_pos rows.
  const [sortBy, setSortBy] = useState('client');
  const [sortOrder, setSortOrder] = useState('asc');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const { data: activeClients = [] } = useActiveClients();
  const { data: activePOs = [] } = useActiveServicePOs();
  const { data: activeServiceTypes = [] } = useActiveServiceTypes();
  const { data: activeEmployees = [] } = useActiveEmployees();

  // Service Type -> Project (Service PO), same cascade as ServicePOSummary's Category/Type/PO chain.
  const filteredPOs = serviceTypeId === 'all'
    ? activePOs
    : activePOs.filter((po) => String(po.serviceType?.id) === serviceTypeId);

  const handleServiceTypeChange = (v) => {
    setServiceTypeId(v);
    setPoId('all');
  };

  const params = {
    ...(monthYear && { month: monthYear.month, year: monthYear.year }),
    hoursSource,
    ...(clientId !== 'all' && { clientId }),
    ...(poId !== 'all' && { poId }),
    ...(serviceTypeId !== 'all' && { serviceTypeId }),
    ...(employeeId !== 'all' && { employeeId }),
    ...(status !== 'all' && { status }),
  };

  const periodReady = !!(monthYear?.month && monthYear?.year);

  const periodLabel = monthYear ? formatDate(`${monthYear.year}-${String(monthYear.month).padStart(2, '0')}-01`, 'MMMM YYYY') : '';

  const { data, isPending, isError, error } = useClientServicePOHours(params);
  const clientGroups = Array.isArray(data?.data) ? data.data : [];

  const sortedClientGroups = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    const groups = clientGroups.map((group) => ({
      ...group,
      service_pos: [...(group.service_pos ?? [])].sort((a, b) => {
        if (sortBy === 'servicePO') return dir * String(a.service_po_name ?? '').localeCompare(String(b.service_po_name ?? ''));
        if (sortBy === 'hours') return dir * ((Number(a.hours) || 0) - (Number(b.hours) || 0));
        return 0;
      }),
    }));
    groups.sort((a, b) => {
      if (sortBy === 'client') return dir * String(a.client_name ?? '').localeCompare(String(b.client_name ?? ''));
      if (sortBy === 'hours') return dir * ((Number(a.total_hrs_of_client) || 0) - (Number(b.total_hrs_of_client) || 0));
      return 0;
    });
    return groups;
  }, [clientGroups, sortBy, sortOrder]);

  // The API has no `search` query param, so this filters client-side over the already-fetched
  // (unpaginated) result set — matches on client name or Service PO name. A client-name match
  // keeps all its POs; a PO-name-only match narrows to just the matching POs, with that group's
  // displayed total recomputed to match what's actually shown.
  const visibleClientGroups = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return sortedClientGroups;
    return sortedClientGroups
      .map((group) => {
        const clientMatches = (group.client_name ?? '').toLowerCase().includes(q);
        const pos = clientMatches
          ? group.service_pos ?? []
          : (group.service_pos ?? []).filter((po) => (po.service_po_name ?? '').toLowerCase().includes(q));
        if (pos.length === 0) return null;
        const total = clientMatches
          ? group.total_hrs_of_client
          : pos.reduce((sum, po) => sum + (Number(po.hours) || 0), 0);
        return { ...group, service_pos: pos, total_hrs_of_client: total };
      })
      .filter(Boolean);
  }, [sortedClientGroups, debouncedSearch]);

  const grandTotal = visibleClientGroups.reduce((sum, g) => sum + (Number(g.total_hrs_of_client) || 0), 0);
  const errorMessage = isError ? extractApiError(error) : null;
  const showLoading = periodReady && isPending;

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const activeFilterCount = [
    clientId !== 'all',
    poId !== 'all',
    serviceTypeId !== 'all',
    employeeId !== 'all',
    status !== 'all',
  ].filter(Boolean).length;

  const toggleClient = (clientKey) => {
    setCollapsedClientIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientKey)) next.delete(clientKey);
      else next.add(clientKey);
      return next;
    });
  };

  return (
    <div>
      <PageHeader
        title="Client Service PO Hours Report"
        description="Hours delivered per Service PO, grouped by Client"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search client, project…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 w-56 text-sm"
              />
            </div>
            {canViewOriginal && (
              <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-muted border shrink-0">
                {[
                  { value: 'O', label: 'Original' },
                  { value: 'M', label: 'Published' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setHoursSource(value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                      hoursSource === value ? 'bg-card shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <Button
              size="sm"
              onClick={() => setFiltersOpen((p) => !p)}
              className="h-9 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {visibleClientGroups.length > 0 && (
              <Button variant="outline" size="sm" className="h-9" onClick={() => exportToExcel(visibleClientGroups, periodLabel)}>
                <Download className="mr-1.5 h-4 w-4" />Export Excel
              </Button>
            )}
          </div>
        }
      />

      {/* Collapsible filter panel */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${filtersOpen ? 'max-h-[480px] opacity-100 mb-5' : 'max-h-0 opacity-0 mb-0'}`}>
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Month &amp; Year <span className="text-destructive">*</span></Label>
              <MonthYearPicker
                value={monthYear}
                onChange={setMonthYear}
                placeholder="Select month"
                clearable={false}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Client</Label>
              <SearchableSelect
                options={[
                  { label: 'All Clients', value: 'all' },
                  ...activeClients.map((c) => ({ label: c.client_name, value: String(c.id) })),
                ]}
                value={clientId}
                onValueChange={setClientId}
                placeholder="All Clients"
                searchPlaceholder="Search client..."
                className="h-9 w-full text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Service Type</Label>
              <SearchableSelect
                options={[
                  { label: 'All Service Types', value: 'all' },
                  ...activeServiceTypes.map((st) => ({ label: st.service_type_name, value: String(st.id) })),
                ]}
                value={serviceTypeId}
                onValueChange={handleServiceTypeChange}
                placeholder="All Service Types"
                searchPlaceholder="Search service type..."
                className="h-9 w-full text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Project (Service PO)</Label>
              <SearchableSelect
                options={[
                  { label: 'All Projects', value: 'all' },
                  ...filteredPOs.map((po) => ({
                    label: po.service_po_name || po.service_po_code || String(po.id),
                    value: String(po.id),
                  })),
                ]}
                value={poId}
                onValueChange={setPoId}
                placeholder="All Projects"
                searchPlaceholder="Search project..."
                className="h-9 w-full text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Employee</Label>
              <SearchableSelect
                options={[
                  { label: 'All Employees', value: 'all' },
                  ...activeEmployees.map((e) => ({ label: e.full_name, value: String(e.id) })),
                ]}
                value={employeeId}
                onValueChange={setEmployeeId}
                placeholder="All Employees"
                searchPlaceholder="Search employee..."
                className="h-9 w-full text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Status</Label>
              <SearchableSelect
                showSearch={false}
                options={STATUS_OPTIONS}
                value={status}
                onValueChange={setStatus}
                placeholder="All"
                className="h-9 w-full text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="rounded-lg border overflow-hidden">
        <div className={cn('grid gap-2 bg-muted/50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b', GRID_COLS)}>
          <SortableHeader label="Client" column="client" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
          <SortableHeader label="Service PO" column="servicePO" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
          <SortableHeader label="Hours" column="hours" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} align="right" />
        </div>

        {!periodReady && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Select a month to load the report.</div>
        )}

        {showLoading && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</div>
        )}

        {periodReady && !showLoading && !errorMessage && clientGroups.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No data found for the selected filters.</div>
        )}

        {periodReady && !showLoading && !errorMessage && clientGroups.length > 0 && visibleClientGroups.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">No results match "{search}".</div>
        )}

        {periodReady && !showLoading && visibleClientGroups.map((group) => {
          const clientKey = group.client_id ?? group.client_name;
          const isExpanded = !collapsedClientIds.has(clientKey);
          const poCount = group.service_pos?.length ?? 0;

          return (
            <div key={clientKey} className="border-b last:border-b-0">
              <button
                type="button"
                onClick={() => toggleClient(clientKey)}
                className={cn('w-full grid gap-2 items-center px-4 py-2.5 text-left hover:bg-muted/30 transition-colors', GRID_COLS)}
              >
                <span className="flex items-center gap-2 font-semibold truncate">
                  <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', !isExpanded && '-rotate-90')} />
                  <span className="truncate">{group.client_name}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {!isExpanded && `${poCount} Service PO${poCount !== 1 ? 's' : ''}`}
                </span>
                <span className="text-right font-semibold tabular-nums">
                  {!isExpanded && formatHours(group.total_hrs_of_client)}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {(group.service_pos ?? []).map((po) => (
                      <div key={po.service_po_id} className={cn('grid gap-2 px-4 py-2 text-sm border-t', GRID_COLS)}>
                        <span className="pl-6 text-muted-foreground truncate">{group.client_name}</span>
                        <span className="truncate">{po.service_po_name}</span>
                        <span className="text-right tabular-nums">{formatHours(po.hours)}</span>
                      </div>
                    ))}
                    <div className={cn('grid gap-2 px-4 py-2 text-sm font-semibold bg-muted/20 border-t', GRID_COLS)}>
                      <span className="pl-6">Total</span>
                      <span />
                      <span className="text-right tabular-nums">{formatHours(group.total_hrs_of_client)}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {!showLoading && visibleClientGroups.length > 0 && (
        <div className="mt-4 flex justify-end rounded-lg border bg-muted/40 px-4 py-3">
          <span className="text-sm font-semibold tabular-nums">
            Grand Total: {formatHours(grandTotal)}
          </span>
        </div>
      )}
    </div>
  );
};

export default ClientServicePOHoursReport;
