import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Users, XCircle, CheckCircle2 } from 'lucide-react';
import { useServicePO, useServicePOUtilisation, useCloseServicePO } from '@/hooks/useServicePOs';
import { useCanWrite } from '@/hooks/usePermissions';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { formatCurrency, formatDate, formatHours, formatPercentage } from '@/utils/formatters';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import ServicePOMappingDialog from './ServicePOMappingDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

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
  const { success, error: showError } = useNotification();

  const [confirmClose, setConfirmClose] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);

  const { data: po, isPending: isLoadingPO } = useServicePO(id);
  const { data: utilisation } = useServicePOUtilisation(id);
  const { data: serviceCategories = [] } = useActiveServiceCategories();
  const serviceTypeMap = Object.fromEntries(serviceCategories.map((c) => [c.id, c.name]));

  const closeMutation = useCloseServicePO();

  const canWrite = useCanWrite();
  const canManageResources = canWrite;
  const canClose = canWrite;
  const canEdit = canWrite;

  // Utilisation progress
  const loggedHours = Number(utilisation?.total_hours_logged ?? utilisation?.hours_logged ?? 0);
  const expectedHours = Number(po?.expected_man_hours ?? 0);
  const utilisationPct = expectedHours > 0 ? Math.min((loggedHours / expectedHours) * 100, 100) : 0;

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
            {canManageResources && (
              <Button variant="outline" size="sm" onClick={() => setMappingOpen(true)}>
                <Users className="mr-1.5 h-4 w-4" />
                Map Employees
              </Button>
            )}
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
            {canClose && po.status === 'active' && (
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

      {/* Employee allocation & timesheet mapping now live behind the "Map Employees" button above */}
      <ServicePOMappingDialog
        servicePO={po}
        open={mappingOpen}
        onOpenChange={setMappingOpen}
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
