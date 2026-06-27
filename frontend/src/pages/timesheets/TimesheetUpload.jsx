import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet, X, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { timesheetsApi } from '@/api/timesheets.api';
import { useConfirmImport } from '@/hooks/useTimesheets';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import { formatDate, formatFileSize } from '@/utils/formatters';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const TimesheetUpload = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();

  const [step, setStep] = useState(1); // 1 = upload, 2 = preview
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(null); // { importId, valid_rows, error_rows }

  const confirmMutation = useConfirmImport();

  // ── Dropzone ────────────────────────────────────────────────────────────────
  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) setSelectedFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    maxSize: MAX_SIZE,
    multiple: false,
    onDropRejected: (rejections) => {
      const first = rejections[0]?.errors?.[0];
      if (first?.code === 'file-too-large') {
        showError('File exceeds 10 MB limit.');
      } else {
        showError(first?.message ?? 'Invalid file. Please upload .xlsx or .csv.');
      }
    },
  });

  // ── Step 1 → Step 2 ─────────────────────────────────────────────────────────
  const handlePreview = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const result = await timesheetsApi.upload(selectedFile);
      setPreview({
        importId:   result?.importId,
        totalRows:  result?.totalRows  ?? 0,
        validCount: result?.validRows  ?? 0,
        errorCount: result?.errorRows  ?? 0,
        valid_rows: result?.preview    ?? [],   // array of row objects
        error_rows: result?.errors     ?? [],   // array of error objects
        canConfirm: result?.canConfirm ?? false,
      });
      setStep(2);
    } catch (err) {
      showError(extractApiError(err));
    } finally {
      setIsUploading(false);
    }
  };

  // ── Step 2 → Confirm ────────────────────────────────────────────────────────
  const handleConfirm = () => {
    confirmMutation.mutate(preview.importId, {
      onSuccess: () => {
        success('Timesheets imported successfully.');
        navigate(ROUTES.TIMESHEETS);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const handleCancel = () => {
    setStep(1);
    setSelectedFile(null);
    setPreview(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Upload Timesheets"
        description="Import employee timesheet data from an Excel or CSV file"
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.TIMESHEETS)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to Timesheets
          </Button>
        }
      />

      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-6">
        <StepBadge num={1} label="Upload File" active={step === 1} done={step > 1} />
        <div className="flex-1 h-px bg-border" />
        <StepBadge num={2} label="Preview &amp; Confirm" active={step === 2} done={false} />
      </div>

      {step === 1 && (
        <div className="space-y-5">
          {/* Drop zone */}
          <Card>
            <CardContent className="p-6">
              <div
                {...getRootProps()}
                className={cn(
                  'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer',
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                )}
              >
                <input {...getInputProps()} />
                <UploadCloud
                  className={cn(
                    'mb-3 h-10 w-10 transition-colors',
                    isDragActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
                {isDragActive ? (
                  <p className="text-sm font-medium text-primary">Drop it here…</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">Drag &amp; drop your file here</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      or click to browse — .xlsx or .csv, max 10 MB
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Selected file preview */}
          {selectedFile && (
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSelectedFile(null)}
                  title="Remove file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handlePreview}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? 'Uploading…' : 'Preview Import'}
            </Button>
          </div>
        </div>
      )}

      {step === 2 && preview && (
        <div className="space-y-5">
          {/* Summary badges */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2">
              <span className="text-xs text-muted-foreground">Import ID:</span>
              <span className="font-mono text-xs font-semibold">{preview.importId}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border bg-card px-3 py-2">
              <span className="text-xs text-muted-foreground">Total rows:</span>
              <span className="font-mono text-xs font-semibold">{preview.totalRows}</span>
            </div>
            <Badge className="gap-1.5 bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {preview.validCount} valid
            </Badge>
            {preview.errorCount > 0 && (
              <Badge variant="destructive" className="gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                {preview.errorCount} error{preview.errorCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Valid rows */}
          {preview.valid_rows.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Valid Rows ({preview.validCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Row</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Service PO</TableHead>
                        <TableHead>Sub-Project</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.valid_rows.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {row.rowNumber ?? idx + 1}
                          </TableCell>
                          <TableCell className="text-sm">
                            <p className="font-medium">{row.resourceName ?? '—'}</p>
                            {row.employeeId && (
                              <p className="text-xs text-muted-foreground font-mono">ID: {row.employeeId}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {row.servicePOName || (row.poId ? `PO #${row.poId}` : '—')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.subProjectName ?? '—'}
                          </TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {row.date ? formatDate(row.date) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums text-sm">
                            {row.hours != null ? `${Number(row.hours).toFixed(2)}h` : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error rows */}
          {preview.errorCount > 0 && (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Error Rows ({preview.errorCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-destructive/5">
                        <TableHead className="w-24">Row #</TableHead>
                        <TableHead>Error Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.error_rows.map((row, idx) => (
                        <TableRow key={idx} className="hover:bg-destructive/5">
                          <TableCell className="font-mono text-xs">
                            {row.rowNumber ?? row.row_number ?? idx + 1}
                          </TableCell>
                          <TableCell className="text-sm text-destructive">
                            {row.message ?? row.error_message ?? row.error ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={confirmMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirmMutation.isPending || !preview.canConfirm || preview.validCount === 0}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              {confirmMutation.isPending ? 'Importing…' : 'Confirm Import'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Step badge helper ─────────────────────────────────────────────────────────
const StepBadge = ({ num, label, active, done }) => (
  <div className="flex items-center gap-2 shrink-0">
    <div
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : done
          ? 'bg-green-500 text-white'
          : 'bg-muted text-muted-foreground'
      )}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : num}
    </div>
    <span
      className={cn(
        'text-sm font-medium',
        active ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      {label}
    </span>
  </div>
);

export default TimesheetUpload;
