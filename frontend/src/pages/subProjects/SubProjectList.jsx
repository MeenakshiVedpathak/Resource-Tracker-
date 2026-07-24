import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import { useSubProjects, useDeleteSubProject } from '@/hooks/useSubProjects';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useCanWrite } from '@/hooks/usePermissions';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
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

const TruncatedCell = ({ value, maxWidth = '150px', className }) => {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className={cn("text-sm truncate", className)} style={{ maxWidth }} title={value}>
      {value}
    </div>
  );
};

const SubProjectList = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [poFilter, setPoFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const canManage = useCanWrite();

  const [sorting, setSorting] = useState([]);

  const params = {
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(poFilter !== 'all' && { service_po_id: poFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sorting[0] && { sortBy: sorting[0].id, sortOrder: sorting[0].desc ? 'desc' : 'asc' }),
  };

  const { data, isPending } = useSubProjects(params);
  const { data: activePOs = [] } = useActiveServicePOs();
  const deleteMutation = useDeleteSubProject();

  const subProjects = data?.data ?? [];
  const meta = data?.meta ?? {};

  const activeFilterCount = [
    poFilter !== 'all' ? 1 : 0,
    statusFilter !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const columns = [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 96,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            title="Edit"
            onClick={() => navigate(buildPath(ROUTES.SUB_PROJECT_EDIT, { id: row.original.id }))}
            className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          {canManage && (
            <Button
              size="sm"
              title="Delete"
              className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('sub_project_name', {
      header: 'Name',
      size: 200,
      meta: { sticky: true, left: 96 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="180px" className="font-medium" />,
    }),
    columnHelper.accessor('servicePO.service_po_name', {
      header: 'Service PO',
      size: 200,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="180px" />,
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      size: 250,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="230px" className="text-muted-foreground" />,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 110,
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
  ];

  const handleDelete = () => {
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success(`"${deleteTarget.sub_project_name}" has been Deleted.`);
        setDeleteTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setDeleteTarget(null);
      },
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sub-Projects"
        description="Manage sub-projects linked to Service POs"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sub-projects…"
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
            {canManage && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(ROUTES.SUB_PROJECT_NEW)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Sub-Project
              </Button>
            )}
          </div>
        }
      />

      {/* Collapsible filter panel */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${filtersOpen ? 'max-h-[160px] opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Service PO</Label>
            <SearchableSelect
              options={[
                { label: "All POs", value: "all" },
                ...activePOs.map((po) => ({
                  label: po.po_number ?? po.service_po_name ?? String(po.id),
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
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
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
        data={subProjects}
        isLoading={isPending}
        toolbar={null}
        pagination={
          meta.total != null
            ? {
                page: meta.current_page ?? page,
                limit: meta.per_page ?? limit,
                total: meta.total,
              }
            : undefined
        }
        sorting={sorting}
        onSortingChange={(s) => { setSorting(s); setPage(1); }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        onRowClick={(row) => navigate(buildPath(ROUTES.SUB_PROJECT_EDIT, { id: row.id }))}
      />

      <Outlet />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete sub-project?"
        description={`"${deleteTarget?.sub_project_name}" will be set to inactive. This action cannot be undone if timesheets reference it.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default SubProjectList;
