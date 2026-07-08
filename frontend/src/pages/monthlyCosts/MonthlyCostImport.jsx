import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useImportMonthlyCosts } from '@/hooks/useMonthlyCosts';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/common/PageHeader';

// ---------------------------------------------------------------------------
// Column name aliases — maps header spellings to canonical field names
// ---------------------------------------------------------------------------
const COLUMN_MAP = {
  'name':                  'employee_name',
  'employee name':         'employee_name',
  'employee_name':         'employee_name',
  'month year':            'month_year',
  'month_year':            'month_year',
  'monthyear':             'month_year',
  'period':                'month_year',
  'salary cost':           'monthly_salary',
  'salary_cost':           'monthly_salary',
  'monthly salary':        'monthly_salary',
  'monthly_salary':        'monthly_salary',
  'ops cost':              'ops_cost_per_employee',
  'ops_cost':              'ops_cost_per_employee',
  'ops cost/employee':     'ops_cost_per_employee',
  'ops_cost_per_employee': 'ops_cost_per_employee',
  'total cost':            'total_cost',
  'total_cost':            'total_cost',
  'billable cost':         'billable_cost',
  'billable_cost':         'billable_cost',
};

const MONTH_NAMES = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

// Accepted formats: Jan 2025 · January 2025 · 01/2025 · 2025-01
// Also handles Excel serial date numbers
const parseMonthYear = (raw) => {
  if (raw == null || raw === '') return null;

  // Excel serial date number
  if (typeof raw === 'number') {
    const date = XLSX.SSF.parse_date_code(raw);
    if (date) return { month: date.m, year: date.y };
    return null;
  }

  const str = String(raw).trim();

  // "Jan 2025" or "January 2025" or "Jan-2025"
  const nameMatch = str.match(/^([A-Za-z]+)[\s-](\d{4})$/);
  if (nameMatch) {
    const m = MONTH_NAMES[nameMatch[1].toLowerCase()];
    const y = parseInt(nameMatch[2], 10);
    if (m && y >= 2000) return { month: m, year: y };
  }

  // "01/2025" or "01-2025"
  const numSlash = str.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (numSlash) {
    const m = parseInt(numSlash[1], 10);
    const y = parseInt(numSlash[2], 10);
    if (m >= 1 && m <= 12 && y >= 2000) return { month: m, year: y };
  }

  // "2025-01" or "2025/01"
  const isoMatch = str.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    if (m >= 1 && m <= 12 && y >= 2000) return { month: m, year: y };
  }

  return null;
};

const toNum = (v) => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/,/g, ''));
  return isNaN(n) ? null : n;
};

const validateRow = (row, index) => {
  const errors = [];
  if (!row.employee_name?.trim()) errors.push('Missing Name');
  if (!row.month_year)            errors.push('Missing / unreadable Month Year');
  if (row.monthly_salary == null) errors.push('Missing Salary Cost');
  return { ...row, _rowIndex: index + 1, _errors: errors, _valid: errors.length === 0 };
};

const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const MonthlyCostImport = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  const importMutation = useImportMonthlyCosts();

  const [rows, setRows] = useState([]);
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [importDone, setImportDone] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [removedDuplicates, setRemovedDuplicates] = useState(0);

  const handleDownloadSample = () => {
    const wsData = [
      ['Employee Code', 'Name', 'Month Year', 'Salary Cost', 'Ops Cost', 'Total Cost', 'Billable Cost'],
      ['EMP-0201', 'Rajdoot Herlekar', 'Jul 2026', 284.09, 0, 422.88, 0],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 16 },
      { wch: 25 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MonthlyCosts');
    XLSX.writeFile(wb, 'MonthlyCost_Sample.xlsx');
  };

  const parseFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: false });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (raw.length < 2) {
          showError('File has no data rows.');
          return;
        }

        const headers = raw[0].map((h) => COLUMN_MAP[String(h).toLowerCase().trim()] ?? null);

        const parsed = raw.slice(1).map((rowArr, i) => {
          const obj = {};
          headers.forEach((key, col) => {
            if (key) obj[key] = rowArr[col];
          });

          const my = parseMonthYear(obj.month_year);
          return validateRow(
            {
              employee_name:         String(obj.employee_name ?? '').trim(),
              month:                 my?.month ?? null,
              year:                  my?.year ?? null,
              month_year:            my ? `${MONTH_LABELS[my.month]} ${my.year}` : String(obj.month_year ?? ''),
              monthly_salary:        toNum(obj.monthly_salary),
              ops_cost_per_employee: toNum(obj.ops_cost_per_employee),
              total_cost:            toNum(obj.total_cost),
              billable_cost:         toNum(obj.billable_cost),
            },
            i
          );
        }).filter((r) => r.employee_name || r.monthly_salary || r.month);

        const seen = new Set();
        const deduped = parsed.filter((r) => {
          const key = [
            r.employee_name,
            r.month,
            r.year,
            r.monthly_salary,
            r.ops_cost_per_employee,
            r.total_cost,
            r.billable_cost,
          ].join('|');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setRemovedDuplicates(parsed.length - deduped.length);
        setRows(deduped);
        setFile(file);
        setFileName(file.name);
        setImportDone(false);
        setImportResult(null);
      } catch {
        showError('Could not parse the file. Make sure it is a valid .xlsx or .csv file.');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [showError]);

  const onDrop = useCallback((accepted) => {
    if (accepted.length) parseFile(accepted[0]);
  }, [parseFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  const validRows   = rows.filter((r) => r._valid);
  const invalidRows = rows.filter((r) => !r._valid);

  const handleImport = () => {
    importMutation.mutate(file, {
      onSuccess: (res) => {
        const data     = res?.data ?? res ?? {};
        const imported = data.imported ?? 0;
        const updated  = data.updated  ?? 0;
        const failed   = data.failed   ?? 0;
        const results  = data.results  ?? [];

        if (failed > 0) {
          const failedRows = results.filter((r) => r.status === 'error');
          setImportResult({ failed, failedRows, hasError: true });
          setImportDone(true);
          showError(`Import failed: ${failed} row${failed !== 1 ? 's' : ''} could not be imported.`);
          return;
        }

        setImportResult({ imported, updated, hasError: false });
        setImportDone(true);
        success(`${imported + updated} record${imported + updated !== 1 ? 's' : ''} imported successfully.`);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-5"
    >
      <PageHeader
        title="Import Monthly Costs"
        description="Upload an Excel or CSV file to bulk-import monthly cost records"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadSample}>
              <Download className="mr-1.5 h-4 w-4" />
              Download Sample
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.MONTHLY_COSTS)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      {/* Expected format hint */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Expected Column Headers</CardTitle>
          <CardDescription>Your file must have these columns (order doesn't matter):</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['Name', 'Month Year', 'Salary Cost', 'Ops Cost', 'Total Cost', 'Billable Cost'].map((col) => (
              <Badge key={col} variant="secondary" className="font-mono text-xs">{col}</Badge>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            <strong>Month Year</strong> formats accepted — Jan 2025 · January 2025 · 01/2025 · 2025-01
            &nbsp;·&nbsp; Required columns: <strong>Name</strong>, <strong>Month Year</strong>, <strong>Salary Cost</strong>
          </p>
        </CardContent>
      </Card>

      {/* Drop zone */}
      <Card>
        <CardContent className="pt-6">
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40'}`}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className={`h-10 w-10 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
            {isDragActive ? (
              <p className="text-sm font-medium text-primary">Drop the file here…</p>
            ) : (
              <>
                <p className="text-sm font-medium">Drag &amp; drop your Excel file here</p>
                <p className="text-xs text-muted-foreground">or click to browse · .xlsx, .xls, .csv accepted</p>
              </>
            )}
          </div>
          {fileName && !importDone && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              <span className="truncate">{fileName}</span>
              <span className="shrink-0">— {rows.length} row{rows.length !== 1 ? 's' : ''} detected</span>
              {removedDuplicates > 0 && (
                <span className="shrink-0 text-amber-600 font-medium">
                  · {removedDuplicates} duplicate{removedDuplicates !== 1 ? 's' : ''} removed
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import result banner */}
      {importDone && importResult && !importResult.hasError && (
        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          <div className="text-sm">
            <p className="font-medium text-green-700 dark:text-green-400">
              Import complete — {importResult.imported} inserted, {importResult.updated} updated
            </p>
            <button
              className="mt-1 text-xs underline text-green-600 dark:text-green-500"
              onClick={() => navigate(ROUTES.MONTHLY_COSTS)}
            >
              View Monthly Costs →
            </button>
          </div>
        </div>
      )}

      {importDone && importResult?.hasError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Import failed — {importResult.failed} row{importResult.failed !== 1 ? 's' : ''} could not be processed. Please fix the errors and re-import the file.
            </p>
          </div>
          {importResult.failedRows?.length > 0 && (
            <div className="space-y-1.5">
              {importResult.failedRows.map((r) => (
                <div key={r.row} className="flex items-start gap-2 text-xs text-destructive/80">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    <strong>Row {r.row}:</strong> {r.errors?.join(', ')}
                    {r.data?.['Employee Code'] && ` (${r.data['Employee Code']} — ${r.data?.Name ?? ''})`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && !importDone && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm">Preview — {rows.length} rows</CardTitle>
              <CardDescription className="mt-0.5">
                <span className="text-green-600 font-medium">{validRows.length} valid</span>
                {invalidRows.length > 0 && (
                  <span className="ml-2 text-destructive font-medium">{invalidRows.length} with errors</span>
                )}
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={handleImport}
              disabled={importMutation.isPending || !file || validRows.length === 0 || invalidRows.length > 0}
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  <Upload className="mr-1.5 h-4 w-4" />
                  Import {validRows.length} record{validRows.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground w-10">#</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Month Year</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Salary Cost</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Ops Cost</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Total Cost</th>
                    <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Billable Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row._rowIndex}
                      className={`border-b last:border-0 ${!row._valid ? 'bg-destructive/5' : ''}`}
                    >
                      <td className="px-4 py-2 text-muted-foreground">{row._rowIndex}</td>
                      <td className="px-4 py-2">
                        {row._valid ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-destructive">
                            <XCircle className="h-4 w-4 shrink-0" />
                            {row._errors.join(', ')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {row.employee_name || <span className="text-destructive">—</span>}
                      </td>
                      <td className="px-4 py-2">{row.month_year || <span className="text-destructive">—</span>}</td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.monthly_salary != null ? formatCurrency(row.monthly_salary) : <span className="text-destructive">—</span>}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                        {row.ops_cost_per_employee != null ? formatCurrency(row.ops_cost_per_employee) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.total_cost != null ? formatCurrency(row.total_cost) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {row.billable_cost != null ? formatCurrency(row.billable_cost) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidRows.length > 0 && (
              <div className="flex items-start gap-2 border-t bg-destructive/5 p-4 text-xs text-destructive">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong>Import blocked.</strong> Fix the {invalidRows.length} row{invalidRows.length !== 1 ? 's' : ''} with errors before importing. All rows must be valid to proceed.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

export default MonthlyCostImport;
