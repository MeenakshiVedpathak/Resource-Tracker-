import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Search } from 'lucide-react';
import { useSubProjects, useToggleSubProjectStatus } from '@/hooks/useSubProjects';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useCanWrite } from '@/hooks/usePermissions';
import { useDebounce } from '@/hooks/useDebounce';
import { buildPath, ROUTES } from '@/constants/routes';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

const StatusToggle = ({ subProject }) => {
  const { mutate, isPending } = useToggleSubProjectStatus();
  const isActive = subProject.status === 'active';
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Switch
        checked={isActive}
        disabled={isPending}
        onCheckedChange={(checked) =>
          mutate({ id: subProject.id, status: checked ? 'active' : 'inactive' })
        }
      />
      <span className={cn('text-xs font-medium', isActive ? 'text-green-600' : 'text-slate-400')}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
};

const SubProjectList = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [poFilter, setPoFilter] = useState('all');
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
      size: 200,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="180px" className="text-muted-foreground" />,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 140,
      cell: (info) => <StatusToggle subProject={info.row.original} />,
    }),
  ];

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
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((prev) => !prev)}
              activeCount={activeFilterCount}
            />
            {canManage && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(ROUTES.SUB_PROJECT_NEW)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Sub-Project
              </Button>
            )}
          </div>
        }
      />

      <FilterPanel isOpen={filtersOpen} maxHeightClass="max-h-[160px]">
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
      </FilterPanel>

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
    </div>
  );
};

export default SubProjectList;
