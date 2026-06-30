import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useSubProjects, useDeleteSubProject } from '@/hooks/useSubProjects';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  const { hasRole } = useAuth();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [poFilter, setPoFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebounce(search, 400);
  const canManage = hasRole('Finance', 'Management', 'Project Manager');

  const params = {
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(poFilter !== 'all' && { service_po_id: poFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useSubProjects(params);
  const { data: activePOs = [] } = useActiveServicePOs();
  const deleteMutation = useDeleteSubProject();

  const subProjects = data?.data ?? [];
  const meta = data?.meta ?? {};

  const columns = [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 180,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            onClick={() => navigate(buildPath(ROUTES.SUB_PROJECT_EDIT, { id: row.original.id }))}
            className="h-6 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-normal text-[11px] transition-colors"
          >
            <Pencil className="h-3 w-3 mr-1" /> Edit
          </Button>
          {canManage && (
            <Button
              size="sm"
              className="h-6 px-2 bg-red-500 hover:bg-red-600 text-white rounded font-normal text-[11px] transition-colors"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('sub_project_name', {
      header: 'Name',
      size: 200,
      meta: { sticky: true, left: 150 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="180px" className="font-medium" />,
    }),
    columnHelper.accessor('service_po_name', {
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
    <div>
      <PageHeader
        title="Sub-Projects"
        description="Manage sub-projects linked to Service POs"
        actions={
          canManage && (
            <Button size="sm" onClick={() => navigate(ROUTES.SUB_PROJECT_NEW)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Sub-Project
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={subProjects}
        isLoading={isPending}
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search sub-projects…"
        toolbar={
          <>
            <Select
              value={poFilter}
              onValueChange={(v) => {
                setPoFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-44 text-sm">
                <SelectValue placeholder="All POs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All POs</SelectItem>
                {activePOs.map((po) => (
                  <SelectItem key={po.id} value={String(po.id)}>
                    {po.po_number ?? po.service_po_name ?? po.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-32 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        pagination={
          meta.total != null
            ? {
                page: meta.current_page ?? page,
                limit: meta.per_page ?? limit,
                total: meta.total,
              }
            : undefined
        }
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setLimit(s);
          setPage(1);
        }}
        onRowClick={(row) =>
          navigate(buildPath(ROUTES.SUB_PROJECT_EDIT, { id: row.id }))
        }
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
