import React, { useRef, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TableChartIcon from '@mui/icons-material/TableChart';

const ICON_MAP = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': TableChartIcon,
  'application/vnd.ms-excel': TableChartIcon,
  'text/csv': TableChartIcon,
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileExtensions = (accept) => {
  if (!accept) return [];
  return accept
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.startsWith('.'));
};

/**
 * FileUploadZone — drag-and-drop file uploader with progress.
 *
 * @param {string}   accept         - MIME types / extensions (e.g. ".xlsx,.xls,.csv")
 * @param {number}   maxSize        - max file size in bytes (default 10 MB)
 * @param {bool}     multiple
 * @param {Array}    files          - controlled: [{ file, id, progress, status, error }]
 * @param {fn}       onChange       - (files: File[]) => void
 * @param {fn}       onRemove       - (fileId) => void
 * @param {bool}     disabled
 * @param {string}   helperText
 * @param {bool}     error
 * @param {string}   errorText
 */
const FileUploadZone = ({
  accept = '.xlsx,.xls,.csv',
  maxSize = 10 * 1024 * 1024,
  multiple = false,
  files = [],
  onChange,
  onRemove,
  disabled = false,
  helperText,
  error = false,
  errorText,
}) => {
  const theme = useTheme();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragError, setDragError] = useState('');

  const allowedExtensions = getFileExtensions(accept);

  const validateFile = useCallback(
    (file) => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
        return `File type not allowed. Accepted: ${allowedExtensions.join(', ')}`;
      }
      if (file.size > maxSize) {
        return `File too large. Maximum size: ${formatBytes(maxSize)}`;
      }
      return null;
    },
    [allowedExtensions, maxSize]
  );

  const handleFiles = useCallback(
    (fileList) => {
      const validFiles = [];
      let firstError = '';
      Array.from(fileList).forEach((file) => {
        const err = validateFile(file);
        if (err) {
          firstError = err;
        } else {
          validFiles.push(file);
        }
      });
      if (firstError) setDragError(firstError);
      else setDragError('');
      if (validFiles.length > 0 && onChange) {
        onChange(multiple ? validFiles : [validFiles[0]]);
      }
    },
    [multiple, onChange, validateFile]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dt = e.dataTransfer;
    if (dt.files.length > 0) handleFiles(dt.files);
  };

  const handleInputChange = (e) => {
    if (e.target.files?.length) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleZoneClick = () => {
    if (!disabled) inputRef.current?.click();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleZoneClick();
    }
  };

  const borderColor = dragging
    ? theme.palette.primary.main
    : error || dragError
    ? theme.palette.error.main
    : theme.palette.divider;

  const bgColor = dragging
    ? alpha(theme.palette.primary.main, 0.06)
    : disabled
    ? alpha(theme.palette.action.disabled, 0.04)
    : alpha(theme.palette.background.default, 0.5);

  return (
    <Box>
      {/* Drop zone */}
      <Box
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="File upload area. Click or drag files here."
        onClick={handleZoneClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          border: `2px dashed ${borderColor}`,
          borderRadius: 2,
          bgcolor: bgColor,
          py: 4,
          px: 3,
          textAlign: 'center',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.2s, background-color 0.2s',
          outline: 'none',
          '&:focus-visible': {
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.3)}`,
          },
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          style={{ display: 'none' }}
          disabled={disabled}
          tabIndex={-1}
        />

        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: '50%',
            bgcolor: dragging
              ? alpha(theme.palette.primary.main, 0.12)
              : alpha(theme.palette.action.selected, 0.08),
            mb: 1.5,
            transition: 'background-color 0.2s',
          }}
        >
          <CloudUploadIcon
            sx={{
              fontSize: 28,
              color: dragging ? 'primary.main' : 'text.secondary',
              transition: 'color 0.2s',
            }}
          />
        </Box>

        <Typography variant="body1" fontWeight={500} gutterBottom>
          {dragging ? 'Drop file here' : 'Drag & drop or click to upload'}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {helperText || `Supported: ${allowedExtensions.join(', ').toUpperCase()} — max ${formatBytes(maxSize)}`}
        </Typography>

        {/* Accepted type chips */}
        {allowedExtensions.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center', flexWrap: 'wrap' }}>
            {allowedExtensions.map((ext) => (
              <Chip
                key={ext}
                label={ext.toUpperCase()}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: 20 }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Validation error */}
      {(dragError || errorText) && (
        <Typography variant="caption" color="error" sx={{ mt: 0.75, display: 'block', pl: 0.5 }}>
          {dragError || errorText}
        </Typography>
      )}

      {/* File list */}
      {files.length > 0 && (
        <List dense disablePadding sx={{ mt: 1.5 }}>
          {files.map((fileEntry) => {
            const { id, file, progress, status, error: fileError } = fileEntry;
            const FileIcon = ICON_MAP[file?.type] || InsertDriveFileIcon;
            const isUploading = status === 'uploading';
            const isSuccess = status === 'success';
            const isFailed = status === 'error';

            return (
              <ListItem
                key={id}
                disablePadding
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 1.5,
                  mb: 0.75,
                  px: 1.5,
                  py: 0.75,
                  bgcolor: 'background.paper',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* Upload progress bar */}
                {isUploading && (
                  <LinearProgress
                    variant={progress !== undefined ? 'determinate' : 'indeterminate'}
                    value={progress}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 2,
                      borderRadius: '1.5px 1.5px 0 0',
                    }}
                  />
                )}

                <ListItemIcon sx={{ minWidth: 36 }}>
                  {isSuccess ? (
                    <CheckCircleOutlineIcon sx={{ fontSize: 20, color: 'success.main' }} />
                  ) : isFailed ? (
                    <ErrorOutlineIcon sx={{ fontSize: 20, color: 'error.main' }} />
                  ) : (
                    <FileIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
                  )}
                </ListItemIcon>

                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={500} noWrap>
                      {file?.name}
                    </Typography>
                  }
                  secondary={
                    isFailed ? (
                      <Typography variant="caption" color="error">
                        {fileError || 'Upload failed'}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        {formatBytes(file?.size || 0)}
                        {isUploading && progress !== undefined && ` — ${Math.round(progress)}%`}
                        {isSuccess && ' — Uploaded'}
                      </Typography>
                    )
                  }
                  disableTypography={false}
                />

                {!isUploading && onRemove && (
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => onRemove(id)}
                    aria-label={`Remove ${file?.name}`}
                    sx={{ color: 'text.secondary', flexShrink: 0 }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                )}
              </ListItem>
            );
          })}
        </List>
      )}
    </Box>
  );
};

export default FileUploadZone;
