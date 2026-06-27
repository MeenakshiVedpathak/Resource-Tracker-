import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Pencil } from 'lucide-react';
import { useRoles } from '@/hooks/useRoles';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const columnHelper = createColumnHelper();

const RoleList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const debouncedSearch = useDebounce(search, 400);
  const isManagement = hasRole('Management');

  const params = {
    limit: 100,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useRoles(params);

  const roles = data?.data ?? [];

  const columns = [
    columnHelper.accessor('role_name', {
      header: 'Role Name',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 100,
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor('created_at', {
      header: 'Created',
      size: 140,
      cell: (info) => (
        <span className="text-xs text-muted-foreground">{formatDate(info.getValue())}</span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      size: 60,
      cell: ({ row }) =>
        isManagement ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Edit"
              onClick={() => navigate(buildPath(ROUTES.ROLES + '/' + row.original.id + '/edit'))}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null,
    }),
  ];

  return (
    <div>
      <PageHeader
        title="Roles"
        description="Manage user roles and access levels"
      />

      <DataTable
        columns={columns}
        data={roles}
        isLoading={isPending}
        searchValue={search}
        onSearchChange={(v) => setSearch(v)}
        searchPlaceholder="Search roles…"
        toolbar={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
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
      />
    </div>
  );
};

export default RoleList;
