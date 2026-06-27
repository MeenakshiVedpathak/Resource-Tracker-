import { useNavigate, useParams } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { useTimesheetImportRows } from '@/hooks/useTimesheets';
import { useTimesheetHistory } from '@/hooks/useTimesheets';
import { ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const columnHelper = createColumnHelper();

const TimesheetImportDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: rowsData, isPending } = useTimesheetImportRows(id);
  // fetch history to get the import metadata (file name, importer, etc.)
  const { data: historyData } = useTimesheetHistory({ page: 1, limit: 100 });

  const rows = Array.isArray(rowsData?.data) ? rowsData.data : [];
  const importRecord = (historyData?.data ?? []).find((r) => String(r.id) === String(id));

  const columns = [
    columnHelper.accessor('employee', {
      header: 'Employee',
      cell: (info) => {
        const e = info.getValue();
        return (
          <div>
            <p className="text-sm font-medium">{e?.full_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground font-mono">{e?.employee_code ?? ''}</p>
          </div>
        );
      },
    }),
    columnHelper.accessor('servicePO', {
      header: 'Service PO',
      cell: (info) => {
        const po = info.getValue();
        return (
          <div>
            <p className="text-sm font-medium">{po?.service_po_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground font-mono">{po?.service_po_code ?? ''}</p>
          </div>
        );
      },
    }),
    columnHelper.accessor('servicePO.client', {
      id: 'client',
      header: 'Client',
      cell: (info) => {
        const client = info.getValue();
        return client ? (
          <span className="text-sm">{client.client_name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    }),
    columnHelper.accessor('subProject', {
      header: 'Sub-Project',
      cell: (info) => {
        const sp = info.getValue();
        return sp ? (
          <div>
            <p className="text-sm">{sp.sub_project_name}</p>
            <p className="text-xs text-muted-foreground font-mono">{sp.sub_project_code}</p>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    }),
    columnHelper.accessor('timesheet_date', {
      header: 'Date',
      size: 120,
      cell: (info) => (
        <span className="text-sm tabular-nums">{formatDate(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('hours_logged', {
      header: 'Hours',
      size: 90,
      cell: (info) => (
        <span className="tabular-nums font-semibold text-sm">
          {info.getValue() != null ? `${Number(info.getValue()).toFixed(2)}h` : '—'}
        </span>
      ),
    }),
    columnHelper.accessor('servicePO.is_billable', {
      id: 'billable',
      header: 'Billable',
      size: 90,
      cell: (info) =>
        info.getValue() ? (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 text-xs">
            Billable
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">Non-billable</Badge>
        ),
    }),
  ];

  return (
    <div>
      <PageHeader
        title="Import Details"
        description={importRecord?.file_name ?? `Import #${id}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.TIMESHEETS)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* Import summary card */}
      {importRecord && (
        <Card className="mb-5">
          <CardContent className="flex flex-wrap gap-6 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">File</p>
                <p className="text-sm font-medium truncate max-w-[240px]">{importRecord.file_name}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Imported By</p>
              <p className="text-sm font-medium">
                {importRecord.importer?.employee?.full_name ?? importRecord.importer?.email ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Imported At</p>
              <p className="text-sm tabular-nums">{formatDate(importRecord.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rows</p>
              <p className="text-sm tabular-nums">
                <span className="text-green-600 font-semibold">{importRecord.valid_rows}</span>
                <span className="text-muted-foreground"> / {importRecord.total_rows}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={false}
        />
      )}
    </div>
  );
};

export default TimesheetImportDetail;
