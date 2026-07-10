import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Upload, Info, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTimesheetHistory } from '@/hooks/useTimesheets';
import { ROUTES, buildPath } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const columnHelper = createColumnHelper();


const TimesheetList = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  
  const currentDate = new Date();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));

  const [sorting, setSorting] = useState([]);

  const params = {
    page,
    limit,
    ...(sorting[0] && { sortBy: sorting[0].id, sortOrder: sorting[0].desc ? 'desc' : 'asc' }),
  };

  const { data, isPending } = useTimesheetHistory(params);

  const allRecords = Array.isArray(data?.data) ? data.data : [];
  const records    = allRecords.filter((r) => r.status === 'completed');
  const meta       = data?.meta ?? {};

  const handleDownloadSample = () => {
    const wsData = [
      ['Employee Code', 'Name', 'Project 1', 'Project 2', 'Is Working'],
      ['EMP-0201', 'Aditya Uday patil', '00:00:00', '00:10:00', 'F'],
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    
    ws['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
    ];

    const currentMonth = new Date().toLocaleString('default', { month: 'short' });
    XLSX.utils.book_append_sheet(wb, ws, currentMonth);
    XLSX.writeFile(wb, 'Timesheet_Sample.xlsx');
  };

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
    // columnHelper.accessor('valid_rows', {
    //   header: 'Valid',
    //   size: 70,
    //   cell: (info) => (
    //     <span className="tabular-nums text-sm text-green-600 font-medium">{info.getValue() ?? '—'}</span>
    //   ),
    // }),
    // columnHelper.accessor('error_rows', {
    //   header: 'Errors',
    //   size: 70,
    //   cell: (info) => {
    //     const v = info.getValue();
    //     return (
    //       <span className={`tabular-nums text-sm font-medium ${v > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
    //         {v ?? '—'}
    //       </span>
    //     );
    //   },
    // }),
    columnHelper.accessor('total_employees', {
      header: 'Employees',
      size: 100,
      cell: (info) => {
        const v = info.getValue();
        return (
          <span className="tabular-nums text-sm font-medium text-blue-600">
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
    <div className="space-y-4">
      <PageHeader
        title="Timesheet Imports"
        description="History of all uploaded timesheet files"
        actions={
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs space-y-1">
                  <ul className="list-disc pl-3">
                    <li>Worksheet name should be short of month like Jan, Feb etc.</li>
                    <li>The employee and project should be present in their respective masters with status active</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="sm" onClick={handleDownloadSample}>
              <Download className="mr-1.5 h-4 w-4" />
              Download Sample
            </Button>
            <Button size="sm" onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              Upload Excel
            </Button>
          </div>
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
        sorting={sorting}
        onSortingChange={(s) => { setSorting(s); setPage(1); }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        onRowClick={(row) => navigate(buildPath(ROUTES.TIMESHEET_IMPORT_DETAIL, { id: row.id }))}
      />

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Select Period</DialogTitle>
            <DialogDescription>
              Choose the month and year for this timesheet import.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Month</Label>
              <SearchableSelect showSearch={false}
                options={Array.from({ length: 12 }, (_, i) => {
                  const m = i + 1;
                  return { label: new Date(0, m - 1).toLocaleString('default', { month: 'long' }), value: String(m) };
                })}
                value={selectedMonth}
                onValueChange={setSelectedMonth}
                placeholder="Select month"
                searchPlaceholder="Search month..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Year</Label>
              <SearchableSelect showSearch={false}
                options={Array.from({ length: 5 }, (_, i) => {
                  const y = currentDate.getFullYear() - 2 + i;
                  return { label: String(y), value: String(y) };
                })}
                value={selectedYear}
                onValueChange={setSelectedYear}
                placeholder="Select year"
                searchPlaceholder="Search year..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setIsUploadDialogOpen(false);
              navigate(ROUTES.TIMESHEET_UPLOAD, { state: { month: selectedMonth, year: selectedYear } });
            }}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimesheetList;
