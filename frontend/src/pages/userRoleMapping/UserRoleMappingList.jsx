import { useState, useMemo } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { ShieldCheck, Search, Filter } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useCanWrite } from '@/hooks/usePermissions';
import { isProtectedAccount } from '@/constants/protectedAccounts';
import { useDebounce } from '@/hooks/useDebounce';
import { buildPath, ROUTES } from '@/constants/routes';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

const UserRoleMappingList = () => {
  const navigate = useNavigate();
  const canWrite = useCanWrite();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sorting, setSorting] = useState([]);

  const debouncedSearch = useDebounce(search, 400);

  const params = {
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sorting[0] && { sortBy: sorting[0].id, sortOrder: sorting[0].desc ? 'desc' : 'asc' }),
  };

  const { data, isPending } = useUsers(params);

  const users = data?.data ?? [];
  const meta = data?.meta ?? {};
  const activeFilterCount = statusFilter !== 'all' ? 1 : 0;

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 96,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) => {
        const isProtected = isProtectedAccount(row.original.email);
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              title={isProtected ? 'Protected system account' : 'Manage Roles'}
              disabled={!canWrite || isProtected}
              onClick={() => navigate(buildPath(ROUTES.USER_ROLE_MAPPING_EDIT, { userId: row.original.id }))}
              className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-40"
            >
              <ShieldCheck className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      size: 250,
      meta: { sticky: true, left: 96 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="220px" className="font-medium" />,
    }),
    columnHelper.accessor('roles', {
      header: 'Current Roles',
      size: 320,
      cell: (info) => {
        const raw = info.getValue();
        const list = Array.isArray(raw) ? raw : [];
        if (!list.length) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {list.map((r) => (
              <Badge key={r.id ?? r} variant="secondary" className="text-xs">
                {r.role_name ?? r.name ?? '—'}
              </Badge>
            ))}
          </div>
        );
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 100,
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
  ], [navigate, canWrite]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="User ↔ Role Mapping"
        description="Assign or remove roles for a portal user"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email…"
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
          </div>
        }
      />

      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${filtersOpen ? 'max-h-[160px] opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full rounded-lg border bg-muted/30 p-4">
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
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isPending}
        toolbar={null}
        pagination={
          meta.total != null
            ? { page: meta.current_page ?? page, limit: meta.per_page ?? limit, total: meta.total }
            : undefined
        }
        sorting={sorting}
        onSortingChange={(s) => { setSorting(s); setPage(1); }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />

      <Outlet />
    </div>
  );
};

export default UserRoleMappingList;
