import React from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Paper,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Typography,
  Skeleton,
  Button,
  Toolbar,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import InboxIcon from '@mui/icons-material/Inbox';
import ClearIcon from '@mui/icons-material/Clear';

/**
 * DataTable — reusable server-side paginated table.
 *
 * @param {Array}  columns           - [{ id, label, minWidth, align, sortable, render }]
 * @param {Array}  rows              - data rows
 * @param {number} total             - total record count (server-side)
 * @param {number} page              - 0-indexed page
 * @param {number} rowsPerPage
 * @param {fn}     onPageChange      - (event, newPage)
 * @param {fn}     onRowsPerPageChange
 * @param {bool}   loading
 * @param {string} sortBy
 * @param {string} sortDir           - 'asc' | 'desc'
 * @param {fn}     onSort            - (columnId)
 * @param {string} searchValue
 * @param {fn}     onSearchChange    - (value)
 * @param {string} searchPlaceholder
 * @param {Array}  actions           - [{ label, icon, onClick(row), color, tooltip }]
 * @param {string} title
 * @param {node}   headerActions     - JSX rendered right of the search bar
 * @param {bool}   exportable        - show export button
 * @param {fn}     onExport
 * @param {string} rowKey            - field used as React key (default: 'id')
 */
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const SkeletonRows = ({ columns, rows = 8 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <TableRow key={i}>
        {columns.map((col) => (
          <TableCell key={col.id}>
            <Skeleton variant="text" width="80%" height={20} />
          </TableCell>
        ))}
      </TableRow>
    ))}
  </>
);

const EmptyState = ({ searchValue }) => (
  <TableRow>
    <TableCell colSpan={100}>
      <Box
        sx={{
          py: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1.5,
          color: 'text.secondary',
        }}
      >
        <InboxIcon sx={{ fontSize: 48, opacity: 0.4 }} />
        <Typography variant="body1" fontWeight={500}>
          {searchValue ? 'No results found' : 'No records yet'}
        </Typography>
        <Typography variant="body2" color="text.disabled">
          {searchValue
            ? `No records match "${searchValue}"`
            : 'Records will appear here once added.'}
        </Typography>
      </Box>
    </TableCell>
  </TableRow>
);

const DataTable = ({
  columns = [],
  rows = [],
  total = 0,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  loading = false,
  sortBy,
  sortDir = 'asc',
  onSort,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search…',
  actions = [],
  title,
  headerActions,
  exportable = false,
  onExport,
  rowKey = 'id',
  stickyHeader = true,
  maxHeight = 600,
}) => {
  const theme = useTheme();

  const effectiveColumns = [
    ...columns,
    ...(actions.length > 0
      ? [{ id: '_actions', label: 'Actions', align: 'right', sortable: false }]
      : []),
  ];

  const handleSearchClear = () => {
    if (onSearchChange) onSearchChange('');
  };

  return (
    <Paper
      elevation={0}
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Toolbar */}
      {(title || onSearchChange || headerActions || exportable) && (
        <Toolbar
          disableGutters
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 1.25,
            gap: 1.5,
            flexWrap: 'wrap',
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.background.default, 0.5),
            minHeight: '0 !important',
          }}
        >
          {title && (
            <Typography
              variant="subtitle1"
              fontWeight={600}
              sx={{ flexShrink: 0, mr: 1 }}
            >
              {title}
            </Typography>
          )}

          {onSearchChange && (
            <TextField
              size="small"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              sx={{ minWidth: 220, maxWidth: 320 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                endAdornment: searchValue ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleSearchClear} edge="end">
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
          )}

          <Box sx={{ flexGrow: 1 }} />

          {headerActions}

          {exportable && (
            <Tooltip title="Export CSV">
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={onExport}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Export
              </Button>
            </Tooltip>
          )}
        </Toolbar>
      )}

      {/* Table */}
      <TableContainer sx={{ maxHeight: stickyHeader ? maxHeight : undefined, overflowX: 'auto' }}>
        <Table stickyHeader={stickyHeader} size="medium" aria-label={title || 'data table'}>
          <TableHead>
            <TableRow>
              {effectiveColumns.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align || 'left'}
                  style={{ minWidth: col.minWidth }}
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: 'text.secondary',
                    bgcolor: alpha(theme.palette.background.default, 0.9),
                    py: 1.25,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.sortable !== false && onSort && col.id !== '_actions' ? (
                    <TableSortLabel
                      active={sortBy === col.id}
                      direction={sortBy === col.id ? sortDir : 'asc'}
                      onClick={() => onSort(col.id)}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <SkeletonRows columns={effectiveColumns} rows={rowsPerPage} />
            ) : rows.length === 0 ? (
              <EmptyState searchValue={searchValue} />
            ) : (
              rows.map((row, rowIndex) => (
                <TableRow
                  key={row[rowKey] ?? rowIndex}
                  hover
                  sx={{
                    '&:last-child td': { border: 0 },
                    transition: 'background-color 0.1s',
                  }}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align || 'left'}
                      sx={{
                        fontSize: '0.875rem',
                        py: 1.25,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {col.render ? col.render(row[col.id], row) : row[col.id] ?? '—'}
                    </TableCell>
                  ))}

                  {actions.length > 0 && (
                    <TableCell align="right" sx={{ py: 0.5, whiteSpace: 'nowrap' }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        {actions.map((action) => {
                          const isVisible =
                            typeof action.visible === 'function'
                              ? action.visible(row)
                              : action.visible !== false;
                          if (!isVisible) return null;

                          return (
                            <Tooltip key={action.label} title={action.tooltip || action.label}>
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => action.onClick(row)}
                                  disabled={
                                    typeof action.disabled === 'function'
                                      ? action.disabled(row)
                                      : action.disabled
                                  }
                                  color={action.color || 'default'}
                                  aria-label={action.label}
                                  sx={{ borderRadius: 1 }}
                                >
                                  {action.icon}
                                </IconButton>
                              </span>
                            </Tooltip>
                          );
                        })}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        onPageChange={onPageChange}
        onRowsPerPageChange={onRowsPerPageChange}
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
          '.MuiTablePagination-toolbar': { flexWrap: 'wrap' },
          '.MuiTablePagination-displayedRows': { fontVariantNumeric: 'tabular-nums' },
        }}
      />
    </Paper>
  );
};

export default DataTable;
