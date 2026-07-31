import { useState } from 'react';
import dayjs from 'dayjs';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import { employeeReportsApi } from '@/api/employeeReports.api';
import { useEmployeeDailyReport, useEmployeeMonthlyReport, useEmployeeRangeReport } from '@/hooks/useEmployeeReports';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { downloadBlob } from '@/utils/download';
import { formatDate } from '@/utils/formatters';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import EmptyState from '@/components/common/EmptyState';

const EXPORTS = [
  { format: 'excel', label: 'Excel', icon: FileSpreadsheet },
  { format: 'csv', label: 'CSV', icon: Download },
  { format: 'pdf', label: 'PDF', icon: FileText },
];

// Shared table for all three tabs — Date/Project/Service PO/Hours/Description/Status, per the
// employee-reports row shape: { date, project, servicePO, hours, description, status }.
const ReportTable = ({ data, isLoading, isError }) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Unable to load report data. Please try again.
      </div>
    );
  }

  const rows = data?.rows ?? [];

  if (rows.length === 0) {
    return <EmptyState title="No work log entries for this period." />;
  }

  return (
    <div className="space-y-3">
      <Table containerClassName="bg-white border rounded-lg overflow-auto">
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Service PO</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={idx}>
              <TableCell className="whitespace-nowrap">{formatDate(row.date)}</TableCell>
              <TableCell>{row.project}</TableCell>
              <TableCell>{row.servicePO}</TableCell>
              <TableCell>{row.hours}</TableCell>
              <TableCell className="max-w-xs truncate">{row.description}</TableCell>
              <TableCell>
                <Badge variant={row.status === 'synced' ? 'success' : 'muted'}>
                  {row.status === 'synced' ? 'Synced' : 'Pending'}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-sm font-medium">Total Hours: {data?.totalHours ?? 0} hrs</p>
    </div>
  );
};

// Each tab fetches its own export Blob on click (not cached via React Query, since a file
// download isn't reusable "data") and shows its own spinner while in flight, since these can
// take longer than the JSON call per the spec.
const DailyTab = () => {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const { data, isLoading, isError } = useEmployeeDailyReport(date);
  const { error: showError } = useNotification();
  const [exportingFormat, setExportingFormat] = useState(null);

  const handleExport = async (format) => {
    setExportingFormat(format);
    try {
      const { blob, filename } = await employeeReportsApi.getDaily({ date, format });
      downloadBlob(blob, filename);
    } catch (err) {
      showError(extractApiError(err));
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input type="date" value={date} max={dayjs().format('YYYY-MM-DD')} onChange={(e) => setDate(e.target.value)} className="w-44" />
        <div className="flex items-center gap-2">
          {EXPORTS.map(({ format, label, icon: Icon }) => (
            <Button key={format} variant="outline" size="sm" disabled={!date || !!exportingFormat} onClick={() => handleExport(format)}>
              <Icon className="mr-1.5 h-4 w-4" />
              {exportingFormat === format ? 'Exporting…' : label}
            </Button>
          ))}
        </div>
      </div>
      <ReportTable data={data} isLoading={isLoading} isError={isError} />
    </div>
  );
};

const MonthlyTab = () => {
  const now = dayjs();
  const [monthYear, setMonthYear] = useState({ month: now.month() + 1, year: now.year() });
  const { data, isLoading, isError } = useEmployeeMonthlyReport(monthYear?.month, monthYear?.year);
  const { error: showError } = useNotification();
  const [exportingFormat, setExportingFormat] = useState(null);

  const handleExport = async (format) => {
    setExportingFormat(format);
    try {
      const { blob, filename } = await employeeReportsApi.getMonthly({ month: monthYear.month, year: monthYear.year, format });
      downloadBlob(blob, filename);
    } catch (err) {
      showError(extractApiError(err));
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonthYearPicker value={monthYear} onChange={setMonthYear} className="w-44" />
        <div className="flex items-center gap-2">
          {EXPORTS.map(({ format, label, icon: Icon }) => (
            <Button key={format} variant="outline" size="sm" disabled={!monthYear || !!exportingFormat} onClick={() => handleExport(format)}>
              <Icon className="mr-1.5 h-4 w-4" />
              {exportingFormat === format ? 'Exporting…' : label}
            </Button>
          ))}
        </div>
      </div>
      <ReportTable data={data} isLoading={isLoading} isError={isError} />
    </div>
  );
};

const RangeTab = () => {
  const [range, setRange] = useState(null);
  const { data, isLoading, isError } = useEmployeeRangeReport(range?.startDate, range?.endDate);
  const { error: showError } = useNotification();
  const [exportingFormat, setExportingFormat] = useState(null);

  const handleExport = async (format) => {
    if (!range) return;
    setExportingFormat(format);
    try {
      const { blob, filename } = await employeeReportsApi.getRange({ startDate: range.startDate, endDate: range.endDate, format });
      downloadBlob(blob, filename);
    } catch (err) {
      showError(extractApiError(err));
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DateRangePicker value={range} onChange={setRange} placeholder="Select a date range" className="w-64" clearable />
        <div className="flex items-center gap-2">
          {EXPORTS.map(({ format, label, icon: Icon }) => (
            <Button key={format} variant="outline" size="sm" disabled={!range || !!exportingFormat} onClick={() => handleExport(format)}>
              <Icon className="mr-1.5 h-4 w-4" />
              {exportingFormat === format ? 'Exporting…' : label}
            </Button>
          ))}
        </div>
      </div>
      {!range ? (
        <EmptyState title="Select a date range to view your work log report." />
      ) : (
        <ReportTable data={data} isLoading={isLoading} isError={isError} />
      )}
    </div>
  );
};

const EmployeeReports = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-xl font-bold tracking-tight">Reports</h1>
      <p className="text-sm text-muted-foreground">
        Your work log entries — each row shows whether it's still pending sync or has been added to the official Timesheet.
      </p>
    </div>

    <Tabs defaultValue="daily">
      <TabsList>
        <TabsTrigger value="daily">Daily</TabsTrigger>
        <TabsTrigger value="monthly">Monthly</TabsTrigger>
        <TabsTrigger value="range">Date Range</TabsTrigger>
      </TabsList>
      <TabsContent value="daily"><DailyTab /></TabsContent>
      <TabsContent value="monthly"><MonthlyTab /></TabsContent>
      <TabsContent value="range"><RangeTab /></TabsContent>
    </Tabs>
  </div>
);

export default EmployeeReports;
