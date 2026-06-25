import { useState, useCallback } from 'react';
import { PAGINATION } from '../utils/constants';

/**
 * usePagination — manages MUI TablePagination state.
 *
 * @param {object} options
 * @param {number} options.initialPage         — 0-based page index (default 0)
 * @param {number} options.initialRowsPerPage  — rows per page (default 10)
 *
 * @returns {{
 *   page: number,
 *   rowsPerPage: number,
 *   handlePageChange: (event, newPage) => void,
 *   handleRowsPerPageChange: (event) => void,
 *   reset: () => void,
 *   // Convenience helpers for API calls
 *   apiPage: number,       — 1-based page number for server-side pagination
 *   offset: number,        — (page * rowsPerPage) for offset-based APIs
 * }}
 *
 * Usage with MUI TablePagination:
 *   const { page, rowsPerPage, handlePageChange, handleRowsPerPageChange } = usePagination();
 *   <TablePagination
 *     rowsPerPageOptions={PAGINATION.ROWS_PER_PAGE_OPTIONS}
 *     count={totalCount}
 *     page={page}
 *     rowsPerPage={rowsPerPage}
 *     onPageChange={handlePageChange}
 *     onRowsPerPageChange={handleRowsPerPageChange}
 *   />
 */
export function usePagination({
  initialPage = PAGINATION.DEFAULT_PAGE,
  initialRowsPerPage = PAGINATION.DEFAULT_ROWS_PER_PAGE,
} = {}) {
  const [page, setPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  const handlePageChange = useCallback((_event, newPage) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page when page size changes
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
    setRowsPerPage(initialRowsPerPage);
  }, [initialPage, initialRowsPerPage]);

  return {
    page,
    rowsPerPage,
    handlePageChange,
    handleRowsPerPageChange,
    reset,
    // Server-side helpers
    apiPage: page + 1,
    offset: page * rowsPerPage,
  };
}

export default usePagination;
