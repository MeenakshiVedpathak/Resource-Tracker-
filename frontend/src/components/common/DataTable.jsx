import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from './EmptyState';
import { cn } from '@/utils/cn';

const SortIcon = ({ column }) => {
  const sorted = column.getIsSorted();
  if (sorted === 'asc') return <ChevronUp className="ml-1 h-3 w-3" />;
  if (sorted === 'desc') return <ChevronDown className="ml-1 h-3 w-3" />;
  return <ChevronsUpDown className="ml-1 h-3 w-3 opacity-40" />;
};

const DataTable = ({
  columns,
  data = [],
  isLoading = false,
  // Server-side pagination props
  pagination,
  onPageChange,
  onPageSizeChange,
  // Search
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  // Misc
  emptyState,
  toolbar,
  className,
  tableContainerClassName,
  rowClassName,
  onRowClick,
}) => {
  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualFiltering: true,
  });

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;
  const currentPage = pagination ? pagination.page : 1;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Toolbar */}
      {(onSearchChange || toolbar) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {onSearchChange && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchValue ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {toolbar && <div className="flex items-center gap-2 w-full">{toolbar}</div>}
        </div>
      )}

      {/* Table */}
      <Table 
        className="data-table"
        containerClassName={cn("bg-white border rounded-lg overflow-auto", tableContainerClassName || "max-h-[50vh]")}
      >
        <TableHeader className="sticky top-0 z-20 bg-slate-50 shadow-[0_1px_3px_0_rgb(0,0,0,0.1)]">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent border-b bg-slate-50">
              {headerGroup.headers.map((header) => {
                  const isSticky = header.column.columnDef.meta?.sticky;
                  const left = header.column.columnDef.meta?.left || 0;
                  const w = (header.getSize() !== 150 || isSticky) ? header.getSize() : undefined;
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(isSticky && 'sticky-col')}
                      style={{
                        ...(w ? { width: w, minWidth: w, maxWidth: w } : {}),
                        ...(isSticky ? { left } : {})
                      }}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon column={header.column} />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((col, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  {emptyState ?? <EmptyState title="No records found" description="Try adjusting your search or filters." />}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className={cn(
                    'border-b transition-colors hover:bg-muted/40 data-[state=selected]:bg-muted',
                    onRowClick && 'cursor-pointer',
                    rowClassName?.(row.original)
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => {
                    const isSticky = cell.column.columnDef.meta?.sticky;
                    const left = cell.column.columnDef.meta?.left || 0;
                    const w = (cell.column.getSize() !== 150 || isSticky) ? cell.column.getSize() : undefined;
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(isSticky && 'sticky-col')}
                        style={{
                          ...(w ? { width: w, minWidth: w, maxWidth: w } : {}),
                          ...(isSticky ? { left } : {})
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>

      {/* Pagination */}
      {pagination && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm">
          <p className="text-muted-foreground text-xs">
            Showing {((currentPage - 1) * pagination.limit) + 1}–{Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} results
          </p>
          <div className="flex items-center gap-3">
            {onPageSizeChange && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                <Select value={String(pagination.limit)} onValueChange={(v) => onPageSizeChange(Number(v))}>
                  <SelectTrigger className="h-8 w-16 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set([10, 20, 50, 100, Number(pagination.limit)])).sort((a,b) => a - b).map((size) => (
                      <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => onPageChange?.(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => onPageChange?.(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
