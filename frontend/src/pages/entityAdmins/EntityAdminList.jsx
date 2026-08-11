import { useEffect, useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Search } from 'lucide-react';
import { useEntityAdmins, useUpdateEntityAdmin, useUpdateEntityAdminStatus } from '@/hooks/useEntityAdmins';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/utils/cn';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const columnHelper = createColumnHelper();

const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
});

const TruncatedCell = ({ value, maxWidth = '150px', className }) => {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className={cn("text-sm truncate", className)} style={{ maxWidth }} title={value}>
      {value}
    </div>
  );
};

const StatusToggle = ({ entityAdmin }) => {
  const { mutate, isPending } = useUpdateEntityAdminStatus();
  const isActive = entityAdmin.status === 'active';
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Switch
        checked={isActive}
        disabled={isPending}
        onCheckedChange={(checked) => mutate({ id: entityAdmin.id, status: checked ? 'active' : 'inactive' })}
      />
      <span className={cn('text-xs font-medium', isActive ? 'text-green-600' : 'text-slate-400')}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
};

// Admin tier, platform-wide (§6.2) — list/view/edit/status are new; create already existed.
const EntityAdminList = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState([]);
  const [editTarget, setEditTarget] = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  const params = {
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sorting[0] && { sort_by: sorting[0].id, sort_order: sorting[0].desc ? 'DESC' : 'ASC' }),
  };

  const { data, isPending } = useEntityAdmins(params);
  const updateMutation = useUpdateEntityAdmin(editTarget?.id);

  const entityAdmins = data?.data ?? [];
  const meta = data?.meta ?? {};

  const form = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  useEffect(() => {
    if (editTarget) form.reset({ email: editTarget.email ?? '' });
  }, [editTarget, form]);

  const columns = [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 80,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            title="Edit"
            onClick={() => setEditTarget(row.original)}
            className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
      ),
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      size: 280,
      meta: { sticky: true, left: 80 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="250px" className="font-medium" />,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 140,
      cell: (info) => <StatusToggle entityAdmin={info.row.original} />,
    }),
  ];

  const handleSaveEmail = (values) => {
    updateMutation.mutate(values, {
      onSuccess: () => {
        success('Entity Admin updated successfully.');
        setEditTarget(null);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Entity Admins"
        description="Entity Admins across the platform"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Entity Admins…"
                className="pl-9 w-[250px] h-9 text-sm bg-white"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(ROUTES.ENTITY_ADMIN_NEW)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Entity Admin
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={entityAdmins}
        isLoading={isPending}
        toolbar={null}
        pagination={
          meta.total != null
            ? { page: meta.page ?? page, limit: meta.limit ?? limit, total: meta.total }
            : undefined
        }
        sorting={sorting}
        onSortingChange={(s) => { setSorting(s); setPage(1); }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Entity Admin</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form id="entity-admin-edit-form" onSubmit={form.handleSubmit(handleSaveEmail)}>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[11px] text-muted-foreground font-medium">Email</FormLabel>
                    <FormControl>
                      <Input className="h-8 text-sm" {...field} />
                    </FormControl>
                    <FormMessage className="text-[10px]" />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditTarget(null)} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" form="entity-admin-edit-form" size="sm" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Outlet />
    </div>
  );
};

export default EntityAdminList;
