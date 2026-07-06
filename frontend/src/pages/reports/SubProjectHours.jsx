import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, Search, SlidersHorizontal } from 'lucide-react';
import { useSubProjectHours } from '@/hooks/useReports';
import { useDebounce } from '@/hooks/useDebounce';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useActiveClients } from '@/hooks/useClients';
import { formatHours, formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/utils/cn';

const columnHelper = createColumnHelper();

const exportToExcel = (rows) => {
  const header = ['Code', 'Sub-Project', 'Description', 'Client', 'Service PO', 'PO Code', 'Status', 'Start Date', 'End Date', 'Resources', 'Entries', 'Total Hours'];
  const dataRows = rows.map((r) => [
    r.sub_project_code ?? '',
    r.sub_project_name ?? '',
    r.description ?? '',
    r.client_name ?? '',
    r.service_po_name ?? '',
    r.service_po_code ?? '',
    r.status ?? '',
    r.start_date ?? '',
    r.end_date ?? '',
    r.distinct_resources != null ? Number(r.distinct_resources) : '',
    r.entry_count != null ? Number(r.entry_count) : '',
    r.total_hours != null ? Number(r.total_hours) : '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sub-Project Hours');
  XLSX.writeFile(wb, 'Sub_Project_Hours.xlsx');
};

const columns = [
  columnHelper.accessor('sub_project_code', {
    header: 'Code',
    meta: { sticky: true, left: 0 },
    size: 140,
    cell: (info) => (
      <span className="font-mono text-xs text-muted-foreground">{info.getValue() || '—'}</span>
    ),
  }),
  columnHelper.accessor('sub_project_name', {
    header: 'Sub-Project',
    meta: { sticky: true, left: 140 },
    size: 250,
    cell: (info) => (
      <div>
        <p className="font-medium text-xs">{info.getValue() || '—'}</p>
        {info.row.original.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-1">{info.row.original.description}</p>
        )}
      </div>
    ),
  }),
  columnHelper.accessor('client_name', {
    header: 'Client',
    size: 200,
    cell: (info) => info.getValue() || <span className="text-muted-foreground">—</span>,
  }),
  columnHelper.accessor('service_po_name', {
    header: 'Service PO',
    size: 220,
    cell: (info) => (
      <div>
        <p className="text-xs">{info.getValue() || '—'}</p>
        {info.row.original.service_po_code && (
          <p className="text-[10px] font-mono text-muted-foreground">{info.row.original.service_po_code}</p>
        )}
      </div>
    ),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    size: 110,
    cell: (info) => {
      const v = info.getValue();
      return v ? (
        <span className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
          v === 'active'
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            : v === 'completed'
            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
            : 'bg-muted text-muted-foreground'
        )}>
          {v}
        </span>
      ) : <span className="text-muted-foreground text-xs">—</span>;
    },
  }),
  columnHelper.accessor('start_date', {
    header: 'Start',
    size: 110,
    cell: (info) => (
      <span className="text-xs tabular-nums">{formatDate(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('end_date', {
    header: 'End',
    size: 110,
    cell: (info) => (
      <span className="text-xs tabular-nums">{formatDate(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('distinct_resources', {
    header: 'Resources',
    size: 110,
    cell: (info) => (
      <span className="tabular-nums">{info.getValue() ?? '—'}</span>
    ),
  }),
  columnHelper.accessor('entry_count', {
    header: 'Entries',
    size: 100,
    cell: (info) => (
      <span className="tabular-nums">{info.getValue() ?? '—'}</span>
    ),
  }),
  columnHelper.accessor('total_hours', {
    header: 'Total Hours',
    size: 130,
    cell: (info) => (
      <span className="tabular-nums font-semibold">{formatHours(info.getValue())}</span>
    ),
  }),
];

const SubProjectHours = () => {
  const [poId, setPoId] = useState('all');
  const [clientId, setClientId] = useState('all');
  const [status, setStatus] = useState('all');

  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const debouncedSearch = useDebounce(search, 400);
  const { data: activePOs = [] } = useActiveServicePOs();
  const { data: activeClients = [] } = useActiveClients();

  const params = {
    ...(poId !== 'all' && { poId }),
    ...(clientId !== 'all' && { clientId }),
    ...(status !== 'all' && { status }),

    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useSubProjectHours(params);

  // data.data = { records: [...], summary: { total_hours_on_page } }
  const rows    = Array.isArray(data?.data?.records) ? data.data.records : [];
  const summary = data?.data?.summary ?? {};
  const meta    = data?.meta ?? {};

  const activeFilterCount = [
    poId !== 'all' ? 1 : 0,
    clientId !== 'all' ? 1 : 0,
    status !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader
        title="Sub-Project Hours"
        description="View hours logged per sub-project across Service POs."
      />

      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sub-project, PO, client…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 w-56 pl-9 text-sm"
          />
        </div>

        <Button variant="outline" size="sm" className="h-9 gap-2" onClick={() => setFiltersOpen((o) => !o)}>
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">{activeFilterCount}</span>
          )}
        </Button>

        {rows.length > 0 && (
          <Button variant="outline" size="sm" className="h-9" onClick={() => exportToExcel(rows)}>
            <Download className="mr-1.5 h-4 w-4" />Export Excel
          </Button>
        )}
      </div>

      {/* Collapsible filter panel */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${filtersOpen ? 'max-h-[220px] opacity-100 mb-5' : 'max-h-0 opacity-0 mb-0'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Client</Label>
            <SearchableSelect
              options={[
                { label: "All Clients", value: "all" },
                ...activeClients.map((c) => ({
                  label: c.client_name,
                  value: String(c.id)
                }))
              ]}
              value={clientId}
              onValueChange={(v) => { setClientId(v); setPage(1); }}
              placeholder="All Clients"
              searchPlaceholder="Search client..."
              className="h-9 text-sm w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Service PO</Label>
            <SearchableSelect
              options={[
                { label: "All POs", value: "all" },
                ...activePOs.map((po) => ({
                  label: po.service_po_name || po.service_po_code || String(po.id),
                  value: String(po.id)
                }))
              ]}
              value={poId}
              onValueChange={(v) => { setPoId(v); setPage(1); }}
              placeholder="All POs"
              searchPlaceholder="Search PO..."
              className="h-9 text-sm w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Status</Label>
            <SearchableSelect showSearch={false}
              options={[
                { label: "All Status", value: "all" },
                { label: "Active", value: "active" },
                { label: "Completed", value: "completed" },
                { label: "On Hold", value: "on_hold" },
                { label: "Cancelled", value: "cancelled" },
              ]}
              value={status}
              onValueChange={(v) => { setStatus(v); setPage(1); }}
              placeholder="All Status"
              className="h-9 text-sm w-full"
            />
          </div>
        </div>
      </div>

      {/* Summary chip */}
      {!isPending && summary.total_hours_on_page != null && (
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="rounded-md border bg-blue-500/10 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-400">
            <span>Total Hours (this page) </span>
            <span className="font-semibold tabular-nums">{Number(summary.total_hours_on_page).toFixed(1)}</span>
          </div>
        </div>
      )}

      <DataTable
        tableContainerClassName="max-h-[50vh]"
        columns={columns}
        data={rows}
        isLoading={isPending}
        pagination={meta.total != null ? {
          page: meta.page ?? page,
          limit: meta.limit ?? limit,
          total: meta.total,
        } : undefined}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />
    </div>
  );
};

export default SubProjectHours;
