import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useEmployees, useDeleteEmployee } from '@/hooks/useEmployees';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const columnHelper = createColumnHelper();

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
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useEmployees(params);
  const deleteMutation = useDeleteEmployee();

  const employees = data?.data ?? [];
  const meta = data?.meta ?? {};
  const isHR = hasRole('HR', 'Management');

  const columns = [
    columnHelper.accessor('employee_code', {
      header: 'Code',
      size: 110,
      cell: (info) => (
        <span className="font-mono text-xs font-semibold text-muted-foreground">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('full_name', {
      header: 'Name',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('designation', {
      header: 'Designation',
      cell: (info) => info.getValue() || <span className="text-muted-foreground">—</span>,
    }),
    columnHelper.accessor('total_experience', {
      header: 'Experience',
      size: 110,
      cell: (info) => {
        const val = info.getValue();
        return val != null
          ? <span className="tabular-nums">{val} yrs</span>
          : <span className="text-muted-foreground">—</span>;
      },
    }),
    columnHelper.accessor('date_of_joining', {
      header: 'Joined',
      size: 120,
      cell: (info) => <span className="text-xs">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 100,
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.display({
      id: 'actions',
      size: 88,
      cell: ({ row }) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon-sm"
            title="Edit"
            onClick={() => navigate(buildPath(ROUTES.EMPLOYEE_EDIT, { id: row.original.id }))}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {isHR && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Deactivate"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    }),
  ];

  const handleDelete = () => {
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success(`${deleteTarget.full_name} has been deactivated.`);
        setDeleteTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setDeleteTarget(null);
      },
    });
  };

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Manage your workforce — view, add, and update employee records"
        actions={
          isHR && (
            <Button size="sm" onClick={() => navigate(ROUTES.EMPLOYEE_NEW)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Employee
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={employees}
        isLoading={isPending}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by name, code, designation…"
        toolbar={
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-32 text-sm">
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
        title="Deactivate employee?"
        description={`${deleteTarget?.full_name} will be set to inactive. They won't be assignable to new Service POs.`}
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default EmployeeList;
