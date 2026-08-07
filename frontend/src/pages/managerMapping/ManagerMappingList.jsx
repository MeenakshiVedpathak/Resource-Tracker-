import { useMemo, useState } from 'react';
import { Plus, Trash2, UserCog } from 'lucide-react';
import { useManagerMappings, useCreateManagerMapping, useDeleteManagerMapping } from '@/hooks/useManagerMappings';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { formatDateTime } from '@/utils/formatters';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const ManagerMappingList = () => {
  const { user } = useAuth();
  const { success, error: showError } = useNotification();

  const [addOpen, setAddOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [unmapTarget, setUnmapTarget] = useState(null);

  const { data: mappings = [], isPending } = useManagerMappings();
  const { data: usersData, isPending: isLoadingUsers } = useUsers({ status: 'active', limit: 200 });
  const createMutation = useCreateManagerMapping();
  const deleteMutation = useDeleteManagerMapping();

  const users = usersData?.data ?? [];

  const mappedUserIds = useMemo(() => new Set(mappings.map((m) => m.mapped_user_id)), [mappings]);

  const userOptions = useMemo(
    () =>
      users
        .filter((u) => u.id !== user?.id && !mappedUserIds.has(u.id))
        .map((u) => ({ value: String(u.id), label: u.email })),
    [users, user, mappedUserIds]
  );

  const handleAdd = () => {
    if (!selectedUserId) return;
    createMutation.mutate(Number(selectedUserId), {
      onSuccess: () => {
        success('User mapped successfully.');
        setAddOpen(false);
        setSelectedUserId('');
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const handleUnmap = () => {
    deleteMutation.mutate(unmapTarget.id, {
      onSuccess: () => {
        success('User unmapped successfully.');
        setUnmapTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setUnmapTarget(null);
      },
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Managers"
        description="Users mapped under you"
        actions={
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Map User
          </Button>
        }
      />

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mapped On</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}><Skeleton className="h-5 w-full" /></TableCell>
                </TableRow>
              ))
            ) : mappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  <UserCog className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  No users mapped yet.
                </TableCell>
              </TableRow>
            ) : (
              mappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell className="text-sm font-medium">{mapping.mapped_user_email}</TableCell>
                  <TableCell><StatusBadge status={mapping.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(mapping.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      title="Unmap"
                      className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                      onClick={() => setUnmapTarget(mapping)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setSelectedUserId(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Map a user</DialogTitle>
          </DialogHeader>
          <SearchableSelect
            options={userOptions}
            value={selectedUserId}
            onValueChange={setSelectedUserId}
            disabled={isLoadingUsers}
            placeholder="Select user"
            searchPlaceholder="Search users…"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)} disabled={createMutation.isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={!selectedUserId || createMutation.isPending}>
              {createMutation.isPending ? 'Mapping…' : 'Map User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!unmapTarget}
        onOpenChange={(open) => !open && setUnmapTarget(null)}
        title="Unmap user?"
        description={`${unmapTarget?.mapped_user_email} will be unmapped from you.`}
        confirmLabel="Unmap"
        onConfirm={handleUnmap}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default ManagerMappingList;
