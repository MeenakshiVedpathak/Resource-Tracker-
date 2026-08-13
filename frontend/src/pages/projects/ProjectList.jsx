import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useProjects, useDeleteProject } from '@/hooks/useProjects';
import { useCanWrite } from '@/hooks/usePermissions';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const ProjectList = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const canManage = useCanWrite();

  const [sorting, setSorting] = useState([]);

  const params = {
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sorting[0] && { sort_by: sorting[0].id, sort_order: sorting[0].desc ? 'DESC' : 'ASC' }),
  };

  const { data, isPending } = useProjects(params);
  const deleteMutation = useDeleteProject();

  const projects = data?.data ?? [];
  const meta = data?.meta ?? {};

  const columns = [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 96,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) =>
        canManage ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              title="Edit"
              onClick={() => navigate(buildPath(ROUTES.PROJECT_EDIT, { id: row.original.id }))}
              className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              title="Delete"
              className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(buildPath(ROUTES.PROJECT_EDIT, { id: row.original.id }))}
              className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
    }),
    columnHelper.accessor('project_name', {
      header: 'Project Name',
      size: 250,
      meta: { sticky: true, left: 96 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="230px" className="font-medium" />,
    }),
    columnHelper.accessor('project_code', {
      header: 'Project Code',
      size: 190,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="170px" />,
    }),
    columnHelper.display({
      id: 'client',
      header: 'Client',
      size: 200,
      cell: ({ row }) => (
        <TruncatedCell value={row.original.client_name ?? row.original.client?.client_name} maxWidth="180px" />
      ),
    }),
    columnHelper.accessor('project_description', {
      header: 'Description',
      size: 220,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="200px" className="text-muted-foreground" />,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 120,
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('total_service_pos', {
      header: 'Total Service POs',
      size: 150,
      cell: (info) => <span className="text-sm font-medium">{info.getValue() ?? 0}</span>,
    }),
    columnHelper.accessor('created_at', {
      header: 'Created Date',
      size: 140,
      cell: (info) => formatDate(info.getValue()),
    }),
  ];

  const handleDelete = () => {
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success(`${deleteTarget.project_name} has been deleted.`);
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
        title="Projects"
        description="Manage projects"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects…"
                className="pl-9 w-[250px] h-9 text-sm bg-white"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((prev) => !prev)}
              activeCount={statusFilter !== 'all' ? 1 : 0}
            />
            {canManage && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(ROUTES.PROJECT_NEW)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Project
              </Button>
            )}
          </div>
        }
      />

      <FilterPanel isOpen={filtersOpen} maxHeightClass="max-h-[160px]">
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
      </FilterPanel>

      <DataTable
        columns={columns}
        data={projects}
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
        onRowClick={(row) => navigate(buildPath(ROUTES.PROJECT_EDIT, { id: row.id }))}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete project?"
        description={`${deleteTarget?.project_name} will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      <Outlet />
    </div>
  );
};

export default ProjectList;
