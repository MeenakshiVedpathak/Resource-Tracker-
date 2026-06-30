import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { useIsMutating } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useEmployees, useDeleteEmployee } from '@/hooks/useEmployees';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const columnHelper = createColumnHelper();

const TruncatedCell = ({ value, maxWidth = '150px', className }) => {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className={cn("text-sm truncate", className)} style={{ maxWidth }} title={value}>
      {value}
    </div>
  );
};



const EmployeeList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  const params = {
    page,
    limit,
    status: statusFilter,
    ...(debouncedSearch && debouncedSearch.length >= 3 && { search: debouncedSearch }),
  };

  const { data, isPending, isFetching } = useEmployees(params);
  const deleteMutation = useDeleteEmployee();
  const isMutating = useIsMutating();

  const employees = data?.data ?? [];
  const meta = data?.meta ?? {};
  const isHR = hasRole('HR', 'Management');

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 160,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) => (
        isHR ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              onClick={() => navigate(buildPath(ROUTES.EMPLOYEE_EDIT, { id: row.original.id }))}
              className="h-6 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-normal text-[11px] transition-colors"
            >
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Delete"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        ) : null
      ),
    }),
    columnHelper.accessor('employee_code', {
      header: 'Employee ID',
      size: 130,
      meta: { sticky: true, left: 160 },
      cell: (info) => (
        <TruncatedCell value={info.getValue()} maxWidth="100px" className="font-medium" />
      ),
    }),
    columnHelper.accessor('full_name', {
      header: 'Name',
      size: 200,
      meta: { sticky: true, left: 290 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="160px" />,
    }),
    columnHelper.accessor('email_id', {
      header: 'Email ID',
      size: 220,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="190px" />,
    }),
    columnHelper.accessor('designation', {
      header: 'Designation',
      size: 180,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="160px" />,
    }),
    columnHelper.accessor('total_experience', {
      header: 'Total Experience',
      size: 120,
      cell: (info) => {
        const val = info.getValue();
        return val != null
          ? <span className="text-sm tabular-nums whitespace-nowrap">{val} yrs</span>
          : <span className="text-sm text-muted-foreground">—</span>;
      },
    }),
    columnHelper.accessor('company_experience', {
      header: 'Company Experience',
      size: 140,
      cell: (info) => {
        const val = info.getValue();
        return val != null
          ? <span className="text-sm tabular-nums whitespace-nowrap">{val} yrs</span>
          : <span className="text-sm text-muted-foreground">—</span>;
      },
    }),
    columnHelper.accessor('date_of_joining', {
      header: 'Joined',
      size: 110,
      cell: (info) => <span className="text-sm whitespace-nowrap">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 100,
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
  ], [navigate, isHR]);

  const handleDelete = () => {
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success(`${deleteTarget.full_name} has been Deleted.`);
        setDeleteTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setDeleteTarget(null);
      },
    });
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Employees"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code..."
                className="pl-9 w-[250px] h-9 text-sm bg-white"
                value={search}
                onChange={handleSearch}
              />
            </div>
            {isHR && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(ROUTES.EMPLOYEE_NEW)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Employee
              </Button>
            )}
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={employees}
        isLoading={isPending}
        toolbar={
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-32 text-sm bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        }
        pagination={meta.total != null ? {
          page: meta.current_page ?? page,
          limit: meta.per_page ?? limit,
          total: meta.total,
        } : undefined}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        onRowClick={(row) => navigate(buildPath(ROUTES.EMPLOYEE_EDIT, { id: row.id }))}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete employee?"
        description={`${deleteTarget?.full_name} will be set to inactive. They won't be assignable to new Service POs.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
      <Outlet />
    </div>
  );
};

export default EmployeeList;
