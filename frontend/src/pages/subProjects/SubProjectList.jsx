import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const columnHelper = createColumnHelper();

const SubProjectList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
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
    columnHelper.accessor('sub_project_name', {
      header: 'Name',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('service_po_name', {
      header: 'Service PO',
      cell: (info) =>
        info.getValue() ? (
          <span className="text-sm">{info.getValue()}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      cell: (info) =>
        info.getValue() ? (
          <span className="text-sm text-muted-foreground line-clamp-1">
            {info.getValue()}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 110,
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
            onClick={() =>
              navigate(buildPath(ROUTES.SUB_PROJECT_EDIT, { id: row.original.id }))
            }
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          {canManage && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Delete"
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
        success(`"${deleteTarget.sub_project_name}" has been deactivated.`);
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
