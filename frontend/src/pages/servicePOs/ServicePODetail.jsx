import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, X, UserPlus, XCircle, CheckCircle2 } from 'lucide-react';
import {
  useServicePO,
  useServicePOUtilisation,
  useCloseServicePO,
  useAllocateResources,
  useDeallocateResource,
} from '@/hooks/useServicePOs';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { formatCurrency, formatDate, formatHours, formatPercentage } from '@/utils/formatters';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

const DetailSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-64" />
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-28" />
        </div>
      ))}
    </div>
  </div>
);

const InfoRow = ({ label, value }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-sm font-medium">{value ?? '—'}</p>
  </div>
);

const ServicePODetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { hasRole } = useAuth();
  const { success, error: showError } = useNotification();

  const [confirmClose, setConfirmClose] = useState(false);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [removeTarget, setRemoveTarget] = useState(null);

  const { data: po, isPending: isLoadingPO } = useServicePO(id);
  const { data: utilisation } = useServicePOUtilisation(id);
  const { data: activeEmployees = [] } = useActiveEmployees();
  const { data: serviceCategories = [] } = useActiveServiceCategories();
  const serviceTypeMap = Object.fromEntries(serviceCategories.map((c) => [c.id, c.name]));

  const closeMutation = useCloseServicePO();
  const allocateMutation = useAllocateResources(id);
  const deallocateMutation = useDeallocateResource(id);

  const canManageResources = hasRole('Finance', 'HR', 'Project Manager', 'Management');
  const canClose = hasRole('Finance', 'Management');
  const canEdit = hasRole('Finance', 'Management');

  const isActive = po?.status === 'active';

  // Employees already allocated to this PO
  const allocatedEmployees = po?.employees ?? po?.allocated_employees ?? [];
  const allocatedIds = new Set(allocatedEmployees.map((e) => e.id ?? e.employee_id));

  // Available employees to allocate (active, not already allocated)
  const availableEmployees = activeEmployees.filter((e) => !allocatedIds.has(e.id));

  // Utilisation progress
  const loggedHours = Number(utilisation?.total_hours_logged ?? utilisation?.hours_logged ?? 0);
  const expectedHours = Number(po?.expected_man_hours ?? 0);
  const utilisationPct = expectedHours > 0 ? Math.min((loggedHours / expectedHours) * 100, 100) : 0;

  const toggleEmployee = (empId) => {
    setSelectedEmployees((prev) =>
      prev.includes(empId) ? prev.filter((x) => x !== empId) : [...prev, empId]
    );
  };

  const handleAllocate = () => {
    if (selectedEmployees.length === 0) return;
    allocateMutation.mutate(selectedEmployees, {
      onSuccess: () => {
        success('Resources allocated successfully.');
        setSelectedEmployees([]);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const handleDeallocate = () => {
    if (!removeTarget) return;
    deallocateMutation.mutate(removeTarget.id ?? removeTarget.employee_id, {
      onSuccess: () => {
        success(`${removeTarget.employee_name ?? removeTarget.name} removed from PO.`);
        setRemoveTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setRemoveTarget(null);
      },
    });
  };

  const handleClose = () => {
    closeMutation.mutate(id, {
      onSuccess: () => {
        success('Service PO closed successfully.');
        setConfirmClose(false);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setConfirmClose(false);
      },
    });
  };

  if (isLoadingPO) return <DetailSkeleton />;

  if (!po) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Service PO not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(ROUTES.SERVICE_POS)}>
          Back to Service POs
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <PageHeader
        title={po.service_po_name}
        description="View and manage PO resources"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.SERVICE_POS)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(buildPath(ROUTES.SERVICE_PO_EDIT, { id }))}
              >
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit
              </Button>
            )}
            {canClose && isActive && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmClose(true)}
                disabled={closeMutation.isPending}
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Close PO
              </Button>
            )}
          </div>
        }
      />

      {/* PO Overview card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant="outline" className="font-mono text-xs">
              {po.service_po_code}
            </Badge>
            <StatusBadge status={po.status} />
            {po.is_billable && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Billable
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
            <InfoRow label="Client" value={po.client_name} />
            <InfoRow label="Service Type" value={serviceTypeMap[po.service_type_id] ?? '—'} />
            <InfoRow label="PO Value" value={po.po_value != null ? formatCurrency(po.po_value) : '—'} />
            <InfoRow label="Expected Hours" value={po.expected_man_hours != null ? formatHours(po.expected_man_hours) : '—'} />
            <InfoRow label="Start Date" value={formatDate(po.start_date)} />
            <InfoRow label="End Date" value={formatDate(po.end_date)} />
          </div>
        </CardContent>
      </Card>

      {/* Utilisation card */}
      {(po.expected_man_hours != null || utilisation) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Utilisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatHours(loggedHours)} logged
                {expectedHours > 0 && ` of ${formatHours(expectedHours)} expected`}
              </span>
              {expectedHours > 0 && (
                <span className="font-semibold">{formatPercentage(utilisationPct)}</span>
              )}
            </div>
            {expectedHours > 0 && (
              <Progress value={utilisationPct} className="h-2" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Allocated Employees */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            Allocated Resources
            {allocatedEmployees.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {allocatedEmployees.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allocatedEmployees.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employees allocated yet.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Code</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Designation</th>
                    {canManageResources && (
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {allocatedEmployees.map((emp) => {
                    const empId = emp.id ?? emp.employee_id;
                    const empName = emp.employee_name ?? emp.name ?? '—';
                    const empCode = emp.employee_code ?? emp.code ?? '—';
                    const empDesig = emp.designation ?? '—';
                    return (
                      <tr key={empId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{empName}</td>
                        <td className="px-4 py-2.5">
                          <span className="font-mono text-xs text-muted-foreground">{empCode}</span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">{empDesig}</td>
                        {canManageResources && (
                          <td className="px-4 py-2.5 text-right">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              title="Remove"
                              onClick={() => setRemoveTarget({ ...emp, id: empId, name: empName })}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allocate Resources (only if PO is active) */}
      {isActive && canManageResources && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Allocate Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All active employees are already allocated to this PO.
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Select employees to add to this PO.
                </p>
                <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
                  {availableEmployees.map((emp) => (
                    <label
                      key={emp.id}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        id={`emp-${emp.id}`}
                        checked={selectedEmployees.includes(emp.id)}
                        onCheckedChange={() => toggleEmployee(emp.id)}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-none">
                          {emp.employee_name ?? emp.name}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <span className="font-mono">{emp.employee_code ?? emp.code}</span>
                          {emp.designation && ` · ${emp.designation}`}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    {selectedEmployees.length} selected
                  </span>
                  <Button
                    size="sm"
                    onClick={handleAllocate}
                    disabled={selectedEmployees.length === 0 || allocateMutation.isPending}
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    {allocateMutation.isPending ? 'Allocating…' : 'Allocate Selected'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirm remove employee */}
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove resource?"
        description={`${removeTarget?.name ?? 'This employee'} will be removed from this service PO.`}
        confirmLabel="Remove"
        onConfirm={handleDeallocate}
        isLoading={deallocateMutation.isPending}
      />

      {/* Confirm close PO */}
      <ConfirmDialog
        open={confirmClose}
        onOpenChange={(open) => !open && setConfirmClose(false)}
        title="Close Service PO?"
        description="This action will close the PO. It cannot be re-opened. Are you sure?"
        confirmLabel="Close PO"
        onConfirm={handleClose}
        isLoading={closeMutation.isPending}
      />
    </div>
  );
};

export default ServicePODetail;
