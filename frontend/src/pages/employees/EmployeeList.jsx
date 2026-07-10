import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { useIsMutating } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, Download, Upload, CheckCircle2, AlertCircle, FileDown, FileText, Printer, FileSpreadsheet, ChevronDown, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEmployees, useDeleteEmployee, useImportEmployees, useToggleEmployeeStatus } from '@/hooks/useEmployees';
import { employeesApi } from '@/api/employees.api';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const columnHelper = createColumnHelper();

const TruncatedCell = ({ value, maxWidth = '150px', className }) => {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className={cn("text-sm truncate", className)} style={{ maxWidth }} title={value}>
      {value}
    </div>
  );
};

const StatusToggle = ({ employee }) => {
  const { mutate, isPending } = useToggleEmployeeStatus();
  const isActive = employee.status === 'active';
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Switch
        checked={isActive}
        disabled={isPending}
        onCheckedChange={(checked) =>
          mutate({ id: employee.id, status: checked ? 'active' : 'inactive' })
        }
      />
      <span className={cn('text-xs font-medium', isActive ? 'text-green-600' : 'text-slate-400')}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
};



const EmployeeList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const [sorting, setSorting] = useState([]);

  const params = {
    page,
    limit,
    status: statusFilter,
    ...(debouncedSearch && debouncedSearch.length >= 3 && { search: debouncedSearch }),
    ...(sorting[0] && { sortBy: sorting[0].id, sortOrder: sorting[0].desc ? 'desc' : 'asc' }),
  };

  const { data, isPending, isFetching } = useEmployees(params);
  const deleteMutation = useDeleteEmployee();
  const importMutation = useImportEmployees();
  const isMutating = useIsMutating();
  const fileInputRef = useRef(null);

  const [previewData, setPreviewData] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [previewLimit, setPreviewLimit] = useState(5);

  const employees = data?.data ?? [];
  const meta = data?.meta ?? {};
  const isHR = hasRole('HR', 'Management');

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 180,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) => (
        isHR ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              onClick={() => navigate(buildPath(ROUTES.EMPLOYEE_EDIT, { id: row.original.id }))}
              className="h-6 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-normal text-[11px] transition-colors"
            >
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
            <Button
              size="sm"
              className="h-6 px-2 bg-red-500 hover:bg-red-600 text-white rounded font-normal text-[11px] transition-colors"
              title="Delete"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        ) : null
      ),
    }),
    columnHelper.accessor('employee_code', {
      header: 'Employee ID',
      size: 130,
      meta: { sticky: true, left: 180 },
      cell: (info) => (
        <TruncatedCell value={info.getValue()} maxWidth="100px" className="font-medium" />
      ),
    }),
    columnHelper.accessor('full_name', {
      header: 'Name',
      size: 200,
      meta: { sticky: true, left: 310 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="160px" />,
    }),
    columnHelper.accessor('email_id', {
      header: 'Email ID',
      size: 220,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="190px" />,
    }),
    columnHelper.accessor('designation', {
      header: 'Designation',
      size: 180,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="160px" />,
    }),
    columnHelper.accessor('total_experience', {
      header: 'Total Experience',
      size: 120,
      cell: (info) => {
        const val = info.getValue();
        return val != null
          ? <span className="text-sm tabular-nums whitespace-nowrap">{val} yrs</span>
          : <span className="text-sm text-muted-foreground">—</span>;
      },
    }),
    columnHelper.accessor('company_experience', {
      header: 'Company Experience',
      size: 140,
      cell: (info) => {
        const val = info.getValue();
        return val != null
          ? <span className="text-sm tabular-nums whitespace-nowrap">{val} yrs</span>
          : <span className="text-sm text-muted-foreground">—</span>;
      },
    }),
    columnHelper.accessor('date_of_joining', {
      header: 'Joined',
      size: 110,
      cell: (info) => <span className="text-sm whitespace-nowrap">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 140,
      cell: (info) => <StatusToggle employee={info.row.original} />,
    }),
  ], [navigate, isHR]);

  const handleDelete = () => {
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success(`${deleteTarget.full_name} has been Deleted.`);
        setDeleteTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setDeleteTarget(null);
      },
    });
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleDownloadSample = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Employee Code': 'EMP-0076',
      'Full Name': 'Omkar Patil',
      'Designation': 'Software Engineer',
      'Total Experience': 5.2,
      'Company Experience': 2.1,
      'Email ID': 'omkar@example.com',
      'Resource Description': 'Java, React',
      'Date of Joining': '2023-01-15',
      'Date of Leaving': ''
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employee_sample.xlsx");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (data.length > 0) {
          setPreviewData(data);
          setPreviewLimit(5);
          setPreviewFile(file);
          setIsPreviewOpen(true);
        }
      } catch (error) {
        showError('Failed to parse Excel file');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = () => {
    if (!previewFile) return;
    
    importMutation.mutate(previewFile, {
      onSuccess: (res) => {
        setImportResult(res);
        setIsPreviewOpen(false);
        setPreviewFile(null);
        setPreviewData(null);
      },
      onError: (err) => {
        // If the backend returns a 400 with a detailed error array, capture it
        if (err.response?.data) {
          setImportResult(err.response.data);
          setIsPreviewOpen(false);
          setPreviewFile(null);
          setPreviewData(null);
        } else {
          showError(extractApiError(err));
        }
      }
    });
  };

  const handleExportExcel = async () => {
    try {
      const res = await employeesApi.getAll({ limit: 10000, status: statusFilter, search: debouncedSearch });
      const data = res?.data ?? [];
      if (data.length === 0) {
        showError("No data to export");
        return;
      }
      const exportData = data.map(emp => ({
        'Employee ID': emp.employee_code,
        'Name': emp.full_name,
        'Email ID': emp.email_id,
        'Designation': emp.designation,
        'Total Experience (yrs)': emp.total_experience,
        'Company Experience (yrs)': emp.company_experience,
        'Joined Date': formatDate(emp.date_of_joining),
        'Status': emp.status
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Employees");
      XLSX.writeFile(wb, "employees_export.xlsx");
      success("Exported to Excel successfully");
    } catch (error) {
      showError("Failed to export Excel");
    }
  };

  const handleExportPDF = async () => {
    try {
      const res = await employeesApi.getAll({ limit: 10000, status: statusFilter, search: debouncedSearch });
      const data = res?.data ?? [];
      if (data.length === 0) {
        showError("No data to export");
        return;
      }
      const doc = new jsPDF();
      doc.text("Employees List", 14, 15);
      
      const tableColumn = ["ID", "Name", "Email", "Designation", "Total Exp", "Comp Exp", "Status"];
      const tableRows = [];

      data.forEach(emp => {
        const rowData = [
          emp.employee_code,
          emp.full_name,
          emp.email_id,
          emp.designation,
          emp.total_experience || '-',
          emp.company_experience || '-',
          emp.status
        ];
        tableRows.push(rowData);
      });

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
      });
      doc.save("employees_export.pdf");
      success("Exported to PDF successfully");
    } catch (error) {
      console.error("PDF Export Error:", error);
      showError("Failed to export PDF");
    }
  };

  const handlePrint = async () => {
    try {
      const res = await employeesApi.getAll({ limit: 10000, status: statusFilter, search: debouncedSearch });
      const data = res?.data ?? [];
      if (data.length === 0) {
        showError("No data to print");
        return;
      }
      
      const printWindow = window.open('', '', 'width=800,height=600');
      printWindow.document.write(`
        <html>
          <head>
            <title>Employees List</title>
            <style>
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              body { font-family: sans-serif; padding: 20px; }
            </style>
          </head>
          <body>
            <h2>Employees List</h2>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Designation</th>
                  <th>Total Exp</th>
                  <th>Comp Exp</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.map(emp => `
                  <tr>
                    <td>${emp.employee_code || ''}</td>
                    <td>${emp.full_name || ''}</td>
                    <td>${emp.email_id || ''}</td>
                    <td>${emp.designation || ''}</td>
                    <td>${emp.total_experience || '-'}</td>
                    <td>${emp.company_experience || '-'}</td>
                    <td>${emp.status || ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } catch (error) {
      showError("Failed to print");
    }
  };

  const renderImportResults = () => {
    if (!importResult) return null;
    
    const data = importResult.data || importResult;
    const errors = data.error_rows || data.errors || data.failed || [];
    const total = data.total ?? data.total_processed ?? 0;
    const imported = data.imported ?? data.success_count ?? 0;
    const skipped = data.skipped ?? data.error_count ?? errors.length ?? 0;

    return (
      <div className="space-y-5">
        {/* Summary badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2">
            <span className="text-xs text-muted-foreground">Total rows:</span>
            <span className="font-mono text-xs font-semibold">{total}</span>
          </div>
          <Badge className="gap-1.5 bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {imported} imported
          </Badge>
          {skipped > 0 && (
            <Badge variant="destructive" className="gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {skipped} skipped
            </Badge>
          )}
        </div>

        {/* Error rows */}
        {skipped > 0 && errors.length > 0 && (
          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                Error Rows ({skipped})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-destructive/5">
                      <TableHead className="w-24 sticky top-0 bg-red-50">Row #</TableHead>
                      <TableHead className="sticky top-0 bg-red-50">Error Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-destructive/5">
                        <TableCell className="font-mono text-xs">
                          {row.row ?? row.rowNumber ?? row.row_number ?? idx + 1}
                        </TableCell>
                        <TableCell className="text-sm text-destructive">
                          {row.errors?.length > 0
                            ? row.errors.join(', ')
                            : row.message ?? row.error_message ?? row.error ?? '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
        
        {skipped === 0 && (
          <div className="text-center py-8 text-green-600 bg-green-50 rounded-md border border-green-100">
             All records were imported successfully!
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Employees"
        actions={
          <div className="flex items-center gap-3">
            {isHR && (
              <>
                <Button size="sm" variant="outline" className="bg-white" onClick={handleDownloadSample}>
                  <Download className="mr-1.5 h-4 w-4" /> Sample
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx,.csv"
                  onChange={handleFileUpload}
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="bg-white" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importMutation.isPending}
                >
                  <Upload className="mr-1.5 h-4 w-4" /> 
                  {importMutation.isPending ? 'Uploading...' : 'Upload'}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="bg-white">
                      <FileDown className="mr-1.5 h-4 w-4" /> Export <ChevronDown className="ml-1 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                      <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                      Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer">
                      <FileText className="mr-2 h-4 w-4 text-red-500" />
                      PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handlePrint} className="cursor-pointer">
                      <Printer className="mr-2 h-4 w-4 text-slate-600" />
                      Print / View
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code..."
                className="pl-9 w-[250px] h-9 text-sm bg-white"
                value={search}
                onChange={handleSearch}
              />
            </div>
            <Button
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setFiltersOpen((prev) => !prev)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {statusFilter !== 'all' && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  1
                </span>
              )}
            </Button>
            {isHR && !isPreviewOpen && !importResult && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(ROUTES.EMPLOYEE_NEW)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Employee
              </Button>
            )}
          </div>
        }
      />

      {/* Collapsible filter panel */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${filtersOpen ? 'max-h-[160px] opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Status</Label>
            <div className="flex items-center rounded-md border overflow-hidden h-9 text-sm bg-white">
              {[
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ].map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => { setStatusFilter(value); setPage(1); }}
                  className={cn(
                    'px-3 h-full font-medium transition-colors border-r last:border-r-0',
                    statusFilter === value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {importResult ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Import Results</h3>
            <Button variant="outline" onClick={() => setImportResult(null)}>
              Back to Employees
            </Button>
          </div>
          {renderImportResults()}
        </div>
      ) : isPreviewOpen ? (
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-lg font-medium text-slate-800">Preview Import Data</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[60vh]">
              {previewData && previewData.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {previewData[0]?.map((header, i) => (
                        <TableHead key={i} className="whitespace-nowrap font-semibold sticky top-0 bg-muted/50">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.slice(1, previewLimit + 1).map((row, i) => (
                      <TableRow key={i}>
                        {previewData[0].map((_, colIndex) => (
                          <TableCell key={colIndex} className="whitespace-nowrap py-3 text-sm">
                            {row[colIndex] != null ? row[colIndex].toString() : '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {previewData.length > previewLimit + 1 && (
                      <TableRow>
                        <TableCell colSpan={previewData[0].length} className="text-center bg-muted/10 py-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => setPreviewLimit(prev => Math.min(prev + 10, previewData.length - 1))}
                          >
                            Show more rows ({previewData.length - previewLimit - 1} remaining)
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-3 bg-muted/10">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)} disabled={importMutation.isPending}>
                Cancel
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleConfirmImport} disabled={importMutation.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {importMutation.isPending ? 'Importing...' : 'Confirm Import'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={employees}
          isLoading={isPending}
          toolbar={null}
          pagination={meta.total != null ? {
            page: meta.current_page ?? page,
            limit: meta.per_page ?? limit,
            total: meta.total,
          } : undefined}
          sorting={sorting}
          onSortingChange={(s) => { setSorting(s); setPage(1); }}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
          onRowClick={(row) => navigate(buildPath(ROUTES.EMPLOYEE_EDIT, { id: row.id }))}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete employee?"
        description={`${deleteTarget?.full_name} will be set to inactive. They won't be assignable to new Service POs.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />



      <Outlet />
    </div>
  );
};

export default EmployeeList;
