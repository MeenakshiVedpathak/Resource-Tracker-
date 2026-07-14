import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, Filter, Search } from 'lucide-react';
import { useServicePOUtilisationReport } from '@/hooks/useReports';
import { reportsApi } from '@/api/reports.api';
import { useDebounce } from '@/hooks/useDebounce';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useActiveClients } from '@/hooks/useClients';
import { formatHours, formatPercentage } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';

const columnHelper = createColumnHelper();

const exportToExcel = (rows) => {
  const header = ['PO Code', 'PO Name', 'Client', 'Expected Hours', 'Actual Hours', 'Utilisation %'];
  const dataRows = rows.map((r) => [
    r.po_code ?? '',
    r.po_name ?? '',
    r.client_name ?? '',
    r.expected_hours != null ? Number(r.expected_hours) : '',
    r.actual_hours != null ? Number(r.actual_hours) : '',
    r.utilisation_percentage != null ? Number(r.utilisation_percentage) : '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'PO Utilisation');
  XLSX.writeFile(wb, 'Service_PO_Utilisation.xlsx');
};

const columns = [
  columnHelper.accessor('po_code', {
    header: 'PO Code',
    meta: { sticky: true, left: 0 },
    size: 140,
    cell: (info) => (
      <span className="font-mono text-xs font-semibold text-muted-foreground">
        {info.getValue() || '—'}
      </span>
    ),
  }),
  columnHelper.accessor('po_name', {
    header: 'PO Name',
    meta: { sticky: true, left: 140 },
    size: 250,
    cell: (info) => <span className="font-medium">{info.getValue() || '—'}</span>,
  }),
  columnHelper.accessor('client_name', {
    header: 'Client',
    size: 200,
    cell: (info) => info.getValue() || <span className="text-muted-foreground">—</span>,
  }),
  columnHelper.accessor('expected_hours', {
    header: 'Expected Hours',
    size: 140,
    cell: (info) => (
      <span className="tabular-nums">{formatHours(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('actual_hours', {
    header: 'Actual Hours',
    size: 140,
    cell: (info) => (
      <span className="tabular-nums">{formatHours(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('utilisation_percentage', {
    header: 'Utilisation',
    size: 160,
    cell: (info) => {
      const pct = Number(info.getValue() ?? 0);
      const capped = Math.min(pct, 100);
      return (
        <div className="flex items-center gap-2 min-w-[140px]">
          <Progress value={capped} className="h-2 flex-1" />
          <span className="tabular-nums text-xs font-medium w-12 text-right">
            {formatPercentage(pct)}
          </span>
        </div>
      );
    },
  }),
];

const ServicePOUtilisation = () => {
  const [poId, setPoId] = useState('all');
  const [clientId, setClientId] = useState('all');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const { data: activePOs = [] } = useActiveServicePOs();
  const { data: activeClients = [] } = useActiveClients();

  const params = {
    ...(clientId !== 'all' && { clientId }),
    ...(poId !== 'all' && { poId }),
    page,
    limit,
    sortBy: 'utilisation_percentage',
    sortOrder: 'desc',
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useServicePOUtilisationReport(params);

  const rows = data?.data ?? [];
  const meta = data?.meta ?? {};

  const activeFilterCount = [
    clientId !== 'all' ? clientId : null,
    poId !== 'all' ? poId : null,
  ].filter(Boolean).length;

  // Export pulls every matching record (not just the current page) with one extra request.
  const handleExport = async () => {
    setExporting(true);
    try {
      const total = meta.total > 0 ? meta.total : 1000;
      const res = await reportsApi.getServicePOUtilisation({ ...params, page: 1, limit: total });
      const allRows = Array.isArray(res?.data) ? res.data : [];
      exportToExcel(allRows);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Service PO Utilisation"
        description="Track hours consumed vs. expected for each Service PO."
      />

      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="PO code, name, client…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-56 h-9 pl-9 text-sm"
          />
        </div>
        <Button size="sm" className="h-9 gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setFiltersOpen((o) => !o)}>
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">{activeFilterCount}</span>
          )}
        </Button>
        {rows.length > 0 && (
          <Button variant="outline" size="sm" className="h-9" onClick={handleExport} disabled={exporting}>
            <Download className="mr-1.5 h-4 w-4" />{exporting ? 'Exporting…' : 'Export Excel'}
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
        </div>
      </div>

      <DataTable
        tableContainerClassName="max-h-[50vh]"
        columns={columns}
        data={rows}
        isLoading={isPending}
        pagination={meta.total != null ? {
          page: meta.current_page ?? page,
          limit: meta.per_page ?? limit,
          total: meta.total,
        } : undefined}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />
    </div>
  );
};

export default ServicePOUtilisation;
