import { useMemo, useState } from 'react';
import { Plus, Trash2, Users, Briefcase } from 'lucide-react';
import {
  useMyTeamEmployees, useMapMyTeamEmployee, useUnmapMyTeamEmployee,
  useMyTeamServicePos, useEmployeeServicePos, useGrantMyTeamServicePo, useRevokeMyTeamServicePo,
} from '@/hooks/useMyTeam';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// Manager's own team self-service (§8) — Primary manager is set by HR at Employee creation;
// a Manager can only claim/release the Secondary slot on an Employee already in the company.
const ServicePoPanel = ({ employee, onOpenChange }) => {
  const { success, error: showError } = useNotification();
  const [selectedPoId, setSelectedPoId] = useState('');

  const { data: myPos = [] } = useMyTeamServicePos();
  const { data: activePOs = [] } = useActiveServicePOs();
  const { data: grants = [], isPending } = useEmployeeServicePos(employee?.id);
  const grantMutation = useGrantMyTeamServicePo();
  const revokeMutation = useRevokeMyTeamServicePo();

  const poName = (id) => activePOs.find((po) => po.id === id)?.service_po_name
    ?? activePOs.find((po) => po.id === id)?.service_po_code ?? `PO #${id}`;

  const grantedIds = new Set(grants.map((g) => g.service_po_id));
  const poOptions = myPos
    .filter((g) => !grantedIds.has(g.service_po_id))
    .map((g) => ({ value: String(g.service_po_id), label: poName(g.service_po_id) }));

  const handleGrant = () => {
    if (!selectedPoId) return;
    grantMutation.mutate(
      { employeeId: employee.id, servicePOId: Number(selectedPoId) },
      {
        onSuccess: () => { success('Service PO granted.'); setSelectedPoId(''); },
        onError: (err) => showError(extractApiError(err)),
      }
    );
  };

  const handleRevoke = (servicePOId) => {
    revokeMutation.mutate(
      { employeeId: employee.id, servicePOId },
      { onError: (err) => showError(extractApiError(err)) }
    );
  };

  return (
    <Dialog open={!!employee} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Service POs</DialogTitle>
          <DialogDescription>Service POs granted to {employee?.full_name}.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <SearchableSelect
            options={poOptions}
            value={selectedPoId}
            onValueChange={setSelectedPoId}
            placeholder={poOptions.length ? 'Select Service PO' : 'No Service POs available to grant'}
            searchPlaceholder="Search…"
            className="flex-1"
          />
          <Button size="sm" onClick={handleGrant} disabled={!selectedPoId || grantMutation.isPending}>
            {grantMutation.isPending ? 'Granting…' : 'Grant'}
          </Button>
        </div>

        <div className="max-h-64 overflow-y-auto rounded-md border">
          {isPending ? (
            <div className="p-3"><Skeleton className="h-5 w-full" /></div>
          ) : grants.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No Service POs granted yet.</p>
          ) : (
            <ul className="divide-y">
              {grants.map((g) => (
                <li key={g.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  {poName(g.service_po_id)}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRevoke(g.service_po_id)}
                    disabled={revokeMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const MyTeamList = () => {
  const { success, error: showError } = useNotification();

  const [addOpen, setAddOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [unmapTarget, setUnmapTarget] = useState(null);
  const [servicePoTarget, setServicePoTarget] = useState(null);

  const { data: myEmployees = [], isPending } = useMyTeamEmployees();
  const { data: activeEmployees = [], isPending: isLoadingEmployees } = useActiveEmployees();
  const mapMutation = useMapMyTeamEmployee();
  const unmapMutation = useUnmapMyTeamEmployee();

  const onMyTeamIds = useMemo(() => new Set(myEmployees.map((e) => e.id)), [myEmployees]);

  const employeeOptions = useMemo(
    () =>
      activeEmployees
        .filter((e) => !onMyTeamIds.has(e.id))
        .map((e) => ({ value: String(e.id), label: e.full_name })),
    [activeEmployees, onMyTeamIds]
  );

  const handleMap = () => {
    if (!selectedEmployeeId) return;
    mapMutation.mutate(Number(selectedEmployeeId), {
      onSuccess: () => {
        success('Employee mapped successfully.');
        setAddOpen(false);
        setSelectedEmployeeId('');
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const handleUnmap = () => {
    unmapMutation.mutate(unmapTarget.id, {
      onSuccess: () => {
        success('Employee unmapped successfully.');
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
        title="My Team"
        description="Employees reporting to you, and the Service POs granted to each"
        actions={
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Map Employee
          </Button>
        }
      />

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Mapping</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><Skeleton className="h-5 w-full" /></TableCell>
                </TableRow>
              ))
            ) : myEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  No Employees reporting to you yet.
                </TableCell>
              </TableRow>
            ) : (
              myEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="text-sm font-medium">{employee.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{employee.designation ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{employee.mapping_type}</Badge>
                  </TableCell>
                  <TableCell><StatusBadge status={employee.status} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        title="Service POs"
                        className="h-6 w-6 p-0 bg-indigo-500 hover:bg-indigo-600 text-white rounded transition-colors"
                        onClick={() => setServicePoTarget(employee)}
                      >
                        <Briefcase className="h-3 w-3" />
                      </Button>
                      {employee.mapping_type === 'SECONDARY' && (
                        <Button
                          size="sm"
                          title="Unmap"
                          className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                          onClick={() => setUnmapTarget(employee)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setSelectedEmployeeId(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Map an Employee</DialogTitle>
          </DialogHeader>
          <SearchableSelect
            options={employeeOptions}
            value={selectedEmployeeId}
            onValueChange={setSelectedEmployeeId}
            disabled={isLoadingEmployees}
            placeholder="Select Employee"
            searchPlaceholder="Search employees…"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)} disabled={mapMutation.isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleMap} disabled={!selectedEmployeeId || mapMutation.isPending}>
              {mapMutation.isPending ? 'Mapping…' : 'Map Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!unmapTarget}
        onOpenChange={(open) => !open && setUnmapTarget(null)}
        title="Unmap Employee?"
        description={`${unmapTarget?.full_name} will be unmapped from you.`}
        confirmLabel="Unmap"
        onConfirm={handleUnmap}
        isLoading={unmapMutation.isPending}
      />

      <ServicePoPanel employee={servicePoTarget} onOpenChange={(open) => !open && setServicePoTarget(null)} />
    </div>
  );
};

export default MyTeamList;
