import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, Search } from 'lucide-react';
import { useSubProjectHours } from '@/hooks/useReports';
import { useDebounce } from '@/hooks/useDebounce';
import { formatHours, formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const debouncedSearch = useDebounce(search, 400);

  const params = {
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useSubProjectHours(params);

  // data.data = { records: [...], summary: { total_hours_on_page } }
  const rows    = Array.isArray(data?.data?.records) ? data.data.records : [];
  const summary = data?.data?.summary ?? {};
  const meta    = data?.meta ?? {};

  return (
    <div>
      <PageHeader
        title="Sub-Project Hours"
        description="View hours logged per sub-project across Service POs."
        actions={rows.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => exportToExcel(rows)}>
            <Download className="mr-1.5 h-4 w-4" />Export Excel
          </Button>
        ) : null}
      />

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sub-project, PO, client…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-9 pl-9 w-full sm:w-72 text-sm"
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
