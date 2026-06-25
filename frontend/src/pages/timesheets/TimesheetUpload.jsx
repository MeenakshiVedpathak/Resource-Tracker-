import React, { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  CardHeader,
  Button,
  Typography,
  Divider,
  Alert,
  Stack,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Chip,
  Paper,
  LinearProgress,
  Tooltip,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/DownloadOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ArrowBackIcon from '@mui/icons-material/ArrowBackOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ReplayIcon from '@mui/icons-material/Replay';

import PageHeader from '../../components/PageHeader';
import FileUploadZone from '../../components/FileUploadZone';

import {
  uploadTimesheet,
  confirmImport,
  cancelImport,
  clearImportState,
  selectCurrentImport,
  selectPreviewData,
  selectImportErrors,
  selectTimesheetUploading,
  selectTimesheetLoading,
  selectTimesheetError,
} from '../../redux/slices/timesheetSlice';

const STEPS = ['Upload File', 'Review & Validate', 'Confirm Import'];

const PREVIEW_COLUMNS = [
  { id: 'employee_name', label: 'Employee' },
  { id: 'date', label: 'Date' },
  { id: 'hours', label: 'Hours' },
  { id: 'po_number', label: 'PO Number' },
  { id: 'sub_project_code', label: 'Sub-Project' },
  { id: 'description', label: 'Description' },
];

// ---- Summary Stat ----
const SummaryCard = ({ label, value, color, icon }) => {
  const theme = useTheme();
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        flex: 1,
        minWidth: 130,
        borderColor: color ? alpha(theme.palette[color]?.main || '#000', 0.35) : undefined,
        bgcolor: color ? alpha(theme.palette[color]?.main || '#000', 0.04) : undefined,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        {icon && (
          <Box sx={{ color: `${color}.main` }}>{icon}</Box>
        )}
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
      </Stack>
      <Typography
        variant="h4"
        fontWeight={700}
        sx={{ fontVariantNumeric: 'tabular-nums', color: color ? `${color}.main` : 'text.primary' }}
      >
        {value ?? '—'}
      </Typography>
    </Paper>
  );
};

const TimesheetUpload = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();

  const currentImport = useSelector(selectCurrentImport);
  const previewData = useSelector(selectPreviewData);
  const importErrors = useSelector(selectImportErrors);
  const uploading = useSelector(selectTimesheetUploading);
  const confirming = useSelector(selectTimesheetLoading);
  const apiError = useSelector(selectTimesheetError);

  const [activeStep, setActiveStep] = useState(0);
  const [files, setFiles] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const handleFileChange = useCallback((newFiles) => {
    setFiles(
      newFiles.map((f, i) => ({
        id: `${f.name}-${i}`,
        file: f,
        status: 'idle',
      }))
    );
    setUploadError('');
  }, []);

  const handleFileRemove = (fileId) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Step 1 -> Step 2: upload and get preview
  const handleUpload = async () => {
    if (!files.length) {
      setUploadError('Please select a file before continuing.');
      return;
    }
    setUploadError('');
    const formData = new FormData();
    formData.append('file', files[0].file);

    // Mark file as uploading
    setFiles((prev) =>
      prev.map((f) => ({ ...f, status: 'uploading', progress: undefined }))
    );

    try {
      await dispatch(uploadTimesheet(formData)).unwrap();
      setFiles((prev) => prev.map((f) => ({ ...f, status: 'success' })));
      setActiveStep(1);
    } catch (err) {
      setFiles((prev) => prev.map((f) => ({ ...f, status: 'error', error: String(err) })));
      setUploadError(typeof err === 'string' ? err : err?.message || 'Upload failed');
    }
  };

  // Step 2 -> Step 3: confirm import
  const handleConfirm = async () => {
    if (!currentImport?.importId) return;
    try {
      await dispatch(confirmImport(currentImport.importId)).unwrap();
      setConfirmed(true);
      setActiveStep(2);
    } catch (err) {
      // error shown via apiError selector
    }
  };

  const handleCancel = async () => {
    if (currentImport?.importId) {
      await dispatch(cancelImport(currentImport.importId));
    }
    dispatch(clearImportState());
    resetWizard();
  };

  const resetWizard = () => {
    setActiveStep(0);
    setFiles([]);
    setUploadError('');
    setConfirmed(false);
    dispatch(clearImportState());
  };

  const handleDownloadTemplate = () => {
    // In production this calls timesheetService.downloadTemplate()
    const csvContent =
      'employee_code,date,hours,po_number,sub_project_code,description\n' +
      'EMP001,2024-06-01,8,PO-001,SP-001,Development work\n';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timesheet_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Render helpers ----

  const renderStep0 = () => (
    <Card>
      <CardHeader
        title="Select Timesheet File"
        subheader="Upload an Excel (.xlsx) or CSV file with timesheet data"
        action={
          <Tooltip title="Download the expected import template">
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadTemplate}
            >
              Download Template
            </Button>
          </Tooltip>
        }
      />
      <Divider />
      <CardContent>
        <FileUploadZone
          accept=".xlsx,.xls,.csv"
          maxSize={20 * 1024 * 1024}
          multiple={false}
          files={files}
          onChange={handleFileChange}
          onRemove={handleFileRemove}
          disabled={uploading}
          helperText="Accepted: .xlsx, .xls, .csv — max 20 MB"
          error={Boolean(uploadError)}
          errorText={uploadError}
        />

        <Alert severity="info" sx={{ mt: 2.5, fontSize: '0.8125rem' }}>
          <strong>Expected columns:</strong> employee_code, date (YYYY-MM-DD), hours,
          po_number, sub_project_code (optional), description (optional).
        </Alert>
      </CardContent>
    </Card>
  );

  const renderStep1 = () => {
    const validCount = currentImport?.validRows ?? 0;
    const errorCount = currentImport?.errorRows ?? 0;
    const totalCount = currentImport?.totalRows ?? 0;
    const hasErrors = errorCount > 0;

    return (
      <Box>
        {/* Summary stats */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
          <SummaryCard label="Total Rows" value={totalCount} />
          <SummaryCard
            label="Valid Rows"
            value={validCount}
            color="success"
            icon={<CheckCircleIcon fontSize="small" />}
          />
          <SummaryCard
            label="Error Rows"
            value={errorCount}
            color={hasErrors ? 'error' : 'success'}
            icon={hasErrors ? <ErrorIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
          />
        </Stack>

        {hasErrors && (
          <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
            {errorCount} row{errorCount !== 1 ? 's' : ''} have validation errors and will be
            skipped. Only the {validCount} valid row{validCount !== 1 ? 's' : ''} will be imported.
          </Alert>
        )}

        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}

        {/* Preview table */}
        <Card>
          <CardHeader
            title="Row Preview"
            subheader={`Showing ${previewData?.length ?? 0} of ${totalCount} rows`}
            titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
          />
          <Divider />
          <TableContainer sx={{ overflowX: 'auto', maxHeight: 480 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 50, fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    #
                  </TableCell>
                  {PREVIEW_COLUMNS.map((col) => (
                    <TableCell
                      key={col.id}
                      sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}
                    >
                      {col.label}
                    </TableCell>
                  ))}
                  <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Status
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(previewData || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={PREVIEW_COLUMNS.length + 2} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No preview data available
                    </TableCell>
                  </TableRow>
                ) : (
                  (previewData || []).map((row, idx) => {
                    const rowErrors = (importErrors || []).filter(
                      (e) => e.row === (row.row_number ?? idx + 1)
                    );
                    const isError = row.is_valid === false || rowErrors.length > 0;

                    return (
                      <TableRow
                        key={idx}
                        sx={{
                          bgcolor: isError
                            ? alpha(theme.palette.error.main, 0.06)
                            : alpha(theme.palette.success.main, 0.04),
                          '&:hover': {
                            bgcolor: isError
                              ? alpha(theme.palette.error.main, 0.1)
                              : alpha(theme.palette.success.main, 0.08),
                          },
                        }}
                      >
                        <TableCell sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.secondary' }}>
                          {row.row_number ?? idx + 1}
                        </TableCell>
                        {PREVIEW_COLUMNS.map((col) => (
                          <TableCell key={col.id} sx={{ fontSize: '0.8125rem' }}>
                            {row[col.id] ?? '—'}
                          </TableCell>
                        ))}
                        <TableCell>
                          {isError ? (
                            <Tooltip
                              title={rowErrors.map((e) => e.message).join('; ') || 'Invalid row'}
                            >
                              <Chip
                                label="Error"
                                size="small"
                                color="error"
                                sx={{ fontWeight: 600, fontSize: '0.7rem', cursor: 'help' }}
                              />
                            </Tooltip>
                          ) : (
                            <Chip
                              label="Valid"
                              size="small"
                              color="success"
                              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>
    );
  };

  const renderStep2 = () => {
    const validCount = currentImport?.validRows ?? 0;
    const errorCount = currentImport?.errorRows ?? 0;

    return (
      <Card sx={{ textAlign: 'center' }}>
        <CardContent sx={{ py: 6 }}>
          <CheckCircleIcon
            sx={{ fontSize: 72, color: 'success.main', mb: 2 }}
          />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Import Successful
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {validCount} timesheet record{validCount !== 1 ? 's' : ''} have been imported
            successfully.
            {errorCount > 0 && ` ${errorCount} row${errorCount !== 1 ? 's' : ''} were skipped due to errors.`}
          </Typography>

          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
            <Chip
              label={`${validCount} imported`}
              color="success"
              icon={<CheckCircleIcon />}
              sx={{ fontWeight: 600 }}
            />
            {errorCount > 0 && (
              <Chip
                label={`${errorCount} skipped`}
                color="warning"
                icon={<WarningAmberIcon />}
                sx={{ fontWeight: 600 }}
              />
            )}
          </Stack>

          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 4 }}>
            <Button
              variant="outlined"
              startIcon={<ReplayIcon />}
              onClick={resetWizard}
            >
              Import Another File
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/timesheets')}
            >
              View Timesheets
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="Import Timesheets"
        subtitle="Upload an Excel or CSV file to bulk-import timesheet entries"
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Timesheets', to: '/timesheets' },
          { label: 'Import' },
        ]}
        action={{
          label: 'View All Timesheets',
          variant: 'outlined',
          onClick: () => navigate('/timesheets'),
        }}
      />

      {/* Stepper */}
      <Stepper activeStep={activeStep} sx={{ mt: 3, mb: 4 }}>
        {STEPS.map((label, idx) => (
          <Step key={label} completed={activeStep > idx || (idx === 2 && confirmed)}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step content */}
      <Box>
        {activeStep === 0 && renderStep0()}
        {activeStep === 1 && renderStep1()}
        {activeStep === 2 && renderStep2()}
      </Box>

      {/* Navigation buttons */}
      {activeStep < 2 && (
        <Stack
          direction="row"
          spacing={2}
          justifyContent="space-between"
          sx={{ mt: 3 }}
        >
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={activeStep === 0 ? () => navigate('/timesheets') : handleCancel}
            disabled={uploading || confirming}
          >
            {activeStep === 0 ? 'Back to Timesheets' : 'Cancel & Discard'}
          </Button>

          {activeStep === 0 && (
            <Button
              variant="contained"
              endIcon={
                uploading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <ArrowForwardIcon />
                )
              }
              onClick={handleUpload}
              disabled={uploading || !files.length}
              startIcon={<UploadFileIcon />}
            >
              {uploading ? 'Uploading…' : 'Upload & Preview'}
            </Button>
          )}

          {activeStep === 1 && (
            <Button
              variant="contained"
              color="success"
              endIcon={
                confirming ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <CheckCircleIcon />
                )
              }
              onClick={handleConfirm}
              disabled={confirming || !currentImport?.validRows}
            >
              {confirming
                ? 'Importing…'
                : `Confirm Import (${currentImport?.validRows ?? 0} rows)`}
            </Button>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default TimesheetUpload;
