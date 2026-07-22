import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useNavigate, useSearchParams, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Eye, Trash2, Search, Filter, Download, Upload } from 'lucide-react';
import { useServicePOs, useDeleteServicePO } from '@/hooks/useServicePOs';
import { servicePOsApi } from '@/api/servicePOs.api';
import { useActiveClients } from '@/hooks/useClients';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useActiveServiceTypes } from '@/hooks/useServiceTypes';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatCurrency, formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/utils/cn';

const columnHelper = createColumnHelper();

const exportToExcel = (rows, categoryByTypeId) => {
  const header = [
    'PO Code', 'PO Name', 'Client', 'Service Category', 'Service Type', 'Account Manager',
    'Description', 'PO Value', 'Invoice Frequency', 'Invoice Amount',
    'Start Date', 'End Date', 'Status',
  ];
  const dataRows = rows.map((r) => [
    r.service_po_code ?? '',
    r.service_po_name ?? '',
    r.client?.client_name ?? '',
    categoryByTypeId.get(String(r.serviceType?.id)) ?? '',
    r.serviceType?.service_type_name ?? '',
    r.account_manager ?? '',
    r.service_description ?? '',
    r.po_value != null ? Number(r.po_value) : '',
    r.invoice_frequency ?? '',
    r.invoice_amount != null ? Number(r.invoice_amount) : '',
    r.start_date ? formatDate(r.start_date) : '',
    r.end_date ? formatDate(r.end_date) : '',
    r.status ?? '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Service POs');
  XLSX.writeFile(wb, 'Service_POs.xlsx');
};

// Mirrors the fields on the "New Service PO" form (ServicePOForm.jsx) in the same order.
const SAMPLE_COLUMNS = [
  'PO Code', 'PO Name', 'Client', 'Service Category', 'Service Type',
  'Account Manager', 'Status', 'Service Description', 'PO Value',
  'Expected Man Hours', 'Start Date', 'End Date', 'Invoice Frequency', 'Invoice Amount',
];

const downloadSampleExcel = () => {
  const wsData = [
    SAMPLE_COLUMNS,
    [
      '', 'Annual Support Contract', 'Acme Technologies', 'Billable', 'Managed Services',
      'Jane Doe', 'in-progress', 'Ongoing L1/L2 support', 500000,
      2000, '2026-01-01', '2026-12-31', 'monthly', 41666.67,
    ],
    [
      '', 'Internal Tooling POC', 'Zenith Retail', 'Non-Billable', 'Project',
      'John Smith', 'pending', 'Proof of concept, no client invoicing', '',
      400, '2026-02-01', '2026-04-30', 'internal-no-invoice', 0,
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = SAMPLE_COLUMNS.map(() => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Service POs');
  XLSX.writeFile(wb, 'ServicePO_Sample.xlsx');
};

const TruncatedCell = ({ value, maxWidth = '150px', className }) => {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className={cn("text-sm truncate", className)} style={{ maxWidth }} title={value}>
      {value}
    </div>
  );
};

const ServicePOList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [searchParams] = useSearchParams();
  const categoryIdParam = searchParams.get('service_category_id');
  const servicePoIdParam = searchParams.get('service_po_id');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState(categoryIdParam || 'all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [poFilter, setPoFilter] = useState(servicePoIdParam || 'all');
  const [filtersOpen, setFiltersOpen] = useState(!!categoryIdParam || !!servicePoIdParam);
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const canManage = hasRole('Finance', 'Management');
  const { success, error: showError } = useNotification();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const deleteMutation = useDeleteServicePO();

  const [sorting, setSorting] = useState([]);

  const params = {
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(clientFilter !== 'all' && { client_id: clientFilter }),
    ...(categoryFilter !== 'all' && { service_category_id: categoryFilter }),
    ...(typeFilter !== 'all' && { service_type_id: typeFilter }),
    ...(poFilter !== 'all' && { service_po_id: poFilter }),
    ...(sorting[0] && { sortBy: sorting[0].id, sortOrder: sorting[0].desc ? 'desc' : 'asc' }),
  };

  const { data, isPending } = useServicePOs(params);
  const { data: clients = [] } = useActiveClients();
  const { data: activePOs = [] } = useActiveServicePOs();
  const { data: serviceTypes = [] } = useActiveServiceTypes();
  const { data: serviceCategories = [] } = useActiveServiceCategories();

  const servicePOs = data?.data ?? [];
  const meta = data?.meta ?? {};

  // Category → Type: only show types belonging to the selected category
  const filteredServiceTypes = categoryFilter === 'all'
    ? serviceTypes
    : serviceTypes.filter((t) => String(t.service_category_id) === categoryFilter);

  // Type (or Category, if no type chosen yet) → Service PO
  const typeCategoryMap = useMemo(() => {
    const map = new Map();
    serviceTypes.forEach((t) => map.set(String(t.id), String(t.service_category_id)));
    return map;
  }, [serviceTypes]);

  // Service type id → category name, for the export (list API doesn't nest category under serviceType)
  const categoryNameByTypeId = useMemo(() => {
    const categoryNameById = new Map(serviceCategories.map((c) => [String(c.id), c.name]));
    const map = new Map();
    serviceTypes.forEach((t) => map.set(String(t.id), categoryNameById.get(String(t.service_category_id)) ?? ''));
    return map;
  }, [serviceTypes, serviceCategories]);

  const filteredPOs = activePOs.filter((po) => {
    const poTypeId = po.serviceType?.id != null ? String(po.serviceType.id) : null;
    if (typeFilter !== 'all') return poTypeId === typeFilter;
    if (categoryFilter !== 'all') return poTypeId != null && typeCategoryMap.get(poTypeId) === categoryFilter;
    return true;
  });

  const handleCategoryChange = (v) => {
    setCategoryFilter(v);
    setTypeFilter('all');
    setPoFilter('all');
    setPage(1);
  };

  const handleTypeChange = (v) => {
    setTypeFilter(v);
    setPoFilter('all');
    setPage(1);
  };

  const activeFilterCount = [
    clientFilter !== 'all' ? 1 : 0,
    categoryFilter !== 'all' ? 1 : 0,
    typeFilter !== 'all' ? 1 : 0,
    poFilter !== 'all' ? 1 : 0,
    statusFilter !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Export pulls every matching record (not just the current page) with one extra request.
  const handleExport = async () => {
    setExporting(true);
    try {
      const total = meta.total > 0 ? meta.total : 1000;
      const res = await servicePOsApi.getAll({ ...params, page: 1, limit: total });
      const all = Array.isArray(res?.data) ? res.data : [];
      exportToExcel(all, categoryNameByTypeId);
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 250,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            title="View"
            onClick={() => navigate(buildPath(ROUTES.SERVICE_PO_DETAIL, { id: row.original.id }))}
            className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            <Eye className="h-3 w-3" />
          </Button>
          {canManage && (
            <>
              <Button
                size="sm"
                title="Edit"
                onClick={() => navigate(buildPath(ROUTES.SERVICE_PO_EDIT, { id: row.original.id }))}
                className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                title="Delete"
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('service_po_code', {
      header: 'PO Code',
      size: 180,
      meta: { sticky: true, left: 250 },
      cell: (info) => (
        <div className="font-mono text-xs font-semibold text-muted-foreground truncate" style={{ maxWidth: "160px" }} title={info.getValue()}>
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('service_po_name', {
      header: 'PO Name',
      size: 300,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="280px" className="font-medium" />,
    }),
    columnHelper.accessor('client.client_name', {
      header: 'Client',
      size: 220,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="200px" />,
    }),
    columnHelper.accessor('serviceType.service_type_name', {
      header: 'Service Type',
      size: 220,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="200px" />,
    }),
    columnHelper.accessor('account_manager', {
      header: 'Account Manager',
      size: 180,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="160px" />,
    }),
    columnHelper.accessor('service_description', {
      header: 'Description',
      size: 300,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="280px" className="text-muted-foreground" />,
    }),
    columnHelper.accessor('po_value', {
      header: 'PO Value',
      size: 160,
      cell: (info) =>
        info.getValue() != null ? (
          formatCurrency(info.getValue())
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
    columnHelper.accessor('invoice_frequency', {
      header: 'Invoice Freq.',
      size: 160,
      cell: (info) => info.getValue() || <span className="text-muted-foreground">—</span>,
    }),
    columnHelper.accessor('invoice_amount', {
      header: 'Invoice Amount',
      size: 160,
      cell: (info) =>
        info.getValue() != null ? (
          <span className="tabular-nums font-medium">{formatCurrency(info.getValue())}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
    columnHelper.accessor('start_date', {
      header: 'Start Date',
      size: 130,
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('end_date', {
      header: 'End Date',
      size: 130,
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 160,
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
  ];

  const handleDelete = () => {
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success('Service PO deleted successfully.');
        setDeleteTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
      },
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Service POs"
        // description="Manage service purchase orders"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search POs…"
                className="pl-9 w-[250px] h-9 text-sm bg-white"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Button
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setFiltersOpen((prev) => !prev)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {servicePOs.length > 0 && (
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExport} disabled={exporting}>
                <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export Excel'}
              </Button>
            )}
            {canManage && (
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={downloadSampleExcel}>
                <Download className="h-4 w-4" /> Sample
              </Button>
            )}
            {canManage && (
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => navigate(ROUTES.SERVICE_PO_IMPORT)}>
                <Upload className="h-4 w-4" /> Import Excel
              </Button>
            )}
            {canManage && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(ROUTES.SERVICE_PO_NEW)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Service PO
              </Button>
            )}
          </div>
        }
      />

      {/* Collapsible filter panel */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${filtersOpen ? 'max-h-[420px] opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Client</Label>
            <SearchableSelect
              options={[
                { label: "All Clients", value: "all" },
                ...clients.map((c) => ({
                  label: c.client_name,
                  value: String(c.id)
                }))
              ]}
              value={clientFilter}
              onValueChange={(v) => { setClientFilter(v); setPage(1); }}
              placeholder="All Clients"
              searchPlaceholder="Search client..."
              className="h-9 w-full text-sm bg-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Service Category</Label>
            <SearchableSelect
              options={[
                { label: "All Categories", value: "all" },
                ...serviceCategories.map((sc) => ({
                  label: sc.name,
                  value: String(sc.id)
                }))
              ]}
              value={categoryFilter}
              onValueChange={handleCategoryChange}
              placeholder="All Categories"
              searchPlaceholder="Search category..."
              className="h-9 w-full text-sm bg-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Service Type</Label>
            <SearchableSelect
              options={[
                { label: "All Service Types", value: "all" },
                ...filteredServiceTypes.map((t) => ({
                  label: t.service_type_name,
                  value: String(t.id)
                }))
              ]}
              value={typeFilter}
              onValueChange={handleTypeChange}
              placeholder="All Service Types"
              searchPlaceholder="Search type..."
              className="h-9 w-full text-sm bg-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Service PO</Label>
            <SearchableSelect
              options={[
                { label: "All POs", value: "all" },
                ...filteredPOs.map((po) => ({
                  label: po.service_po_name || po.service_po_code || String(po.id),
                  value: String(po.id)
                }))
              ]}
              value={poFilter}
              onValueChange={(v) => { setPoFilter(v); setPage(1); }}
              placeholder="All POs"
              searchPlaceholder="Search PO..."
              className="h-9 w-full text-sm bg-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Status</Label>
            <SearchableSelect
              showSearch={false}
              options={[
                { label: "All status", value: "all" },
                { label: "In Progress", value: "in-progress" },
                { label: "Completed", value: "completed" },
                { label: "On Hold", value: "on-hold" },
                { label: "Pending", value: "pending" },
                { label: "Cancelled", value: "cancelled" },
                { label: "Closed", value: "closed" },
              ]}
              value={statusFilter}
              onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
              placeholder="All status"
              className="h-9 w-full text-sm bg-white"
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={servicePOs}
        isLoading={isPending}
        toolbar={null}
        pagination={
          meta.total != null
            ? {
              page: meta.page ?? page,
              limit: meta.limit ?? limit,
              total: meta.total,
            }
            : undefined
        }
        sorting={sorting}
        onSortingChange={(s) => { setSorting(s); setPage(1); }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        onRowClick={(row) => navigate(buildPath(ROUTES.SERVICE_PO_DETAIL, { id: row.id }))}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Service PO?"
        description={`Are you sure you want to delete ${deleteTarget?.service_po_code}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      <Outlet />
    </div>
  );
};

export default ServicePOList;
