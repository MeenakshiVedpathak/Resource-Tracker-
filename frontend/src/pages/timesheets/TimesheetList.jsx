import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Upload } from 'lucide-react';
import { useTimesheetHistory } from '@/hooks/useTimesheets';
import { ROUTES, buildPath } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';

const columnHelper = createColumnHelper();


const TimesheetList = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const params = { page, limit };

  const { data, isPending } = useTimesheetHistory(params);

  const allRecords = Array.isArray(data?.data) ? data.data : [];
  const records    = allRecords.filter((r) => r.status === 'completed');
  const meta       = data?.meta ?? {};

  const columns = [
    columnHelper.accessor('file_name', {
      header: 'File Name',
      cell: (info) => (
        <span className="font-medium text-sm truncate max-w-[220px] block" title={info.getValue()}>
          {info.getValue() ?? '—'}
        </span>
      ),
    }),
    columnHelper.accessor('importer', {
      header: 'Imported By',
      cell: (info) => {
        const imp = info.getValue();
        const name = imp?.employee?.full_name ?? imp?.email ?? '—';
        const code = imp?.employee?.employee_code;
        return (
          <div>
            <p className="text-sm font-medium">{name}</p>
            {code && <p className="text-xs text-muted-foreground font-mono">{code}</p>}
          </div>
        );
      },
    }),
    columnHelper.accessor('total_rows', {
      header: 'Total',
      size: 70,
      cell: (info) => (
        <span className="tabular-nums text-sm">{info.getValue() ?? '—'}</span>
      ),
    }),
    columnHelper.accessor('valid_rows', {
      header: 'Valid',
      size: 70,
      cell: (info) => (
        <span className="tabular-nums text-sm text-green-600 font-medium">{info.getValue() ?? '—'}</span>
      ),
    }),
    columnHelper.accessor('error_rows', {
      header: 'Errors',
      size: 70,
      cell: (info) => {
        const v = info.getValue();
        return (
          <span className={`tabular-nums text-sm font-medium ${v > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {v ?? '—'}
          </span>
        );
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'Imported At',
      size: 150,
      cell: (info) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDate(info.getValue())}
        </span>
      ),
    }),
  ];

  return (
    <div>
      <PageHeader
        title="Timesheet Imports"
        description="History of all uploaded timesheet files"
        actions={
          <Button size="sm" onClick={() => navigate(ROUTES.TIMESHEET_UPLOAD)}>
            <Upload className="mr-1.5 h-4 w-4" />
            Upload Excel
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={records}
        isLoading={isPending}
        pagination={
          records.length > 0
            ? {
                page:  1,
                limit: records.length,
                total: records.length,
              }
            : undefined
        }
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        onRowClick={(row) => navigate(buildPath(ROUTES.TIMESHEET_IMPORT_DETAIL, { id: row.id }))}
      />
    </div>
  );
};

export default TimesheetList;
