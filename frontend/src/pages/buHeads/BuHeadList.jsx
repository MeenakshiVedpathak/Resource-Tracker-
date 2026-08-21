import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Link2, Search } from 'lucide-react';
import { useBuHeads, useUpdateBuHeadStatus, useBuHeadMappedCompanies } from '@/hooks/useBuHeads';
import { useDebounce } from '@/hooks/useDebounce';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';
import BuHeadForm from './BuHeadForm';
import MapBuModal from './MapBuModal';

const columnHelper = createColumnHelper();

const TruncatedCell = ({ value, maxWidth = '150px', className }) => {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className={cn('text-sm truncate', className)} style={{ maxWidth }} title={value}>
      {value}
    </div>
  );
};

// GET /bu-heads returns no mapped-BU count of its own (confirmed 2026-08-20) — fetched per row
// instead. Acceptable trade-off: BU Head accounts are a small senior-tier list (unlike
// Employees), and each query is cheap/cached via React Query.
const MappedBuCount = ({ buHeadId }) => {
  const { data, isLoading } = useBuHeadMappedCompanies(buHeadId);
  if (isLoading) return <span className="text-xs text-muted-foreground">…</span>;
  const count = data?.data?.length ?? 0;
  return <Badge variant={count > 0 ? 'info' : 'muted'}>{count}</Badge>;
};

const StatusToggle = ({ buHead }) => {
  const { mutate, isPending } = useUpdateBuHeadStatus();
  const isActive = buHead.status === 'active';
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Switch
        checked={isActive}
        disabled={isPending}
        onCheckedChange={(checked) => mutate({ id: buHead.id, status: checked ? 'active' : 'inactive' })}
      />
      <span className={cn('text-xs font-medium', isActive ? 'text-green-600' : 'text-slate-400')}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
};

// BU Head Master (§2-§7 of the BU Head spec) — additive peer of BU Admin Master, same list/
// create/status shell as BuAdminList.jsx/EntityAdminList.jsx. "Add BU Head" opens a Sheet
// (BuHeadForm), "Map" opens a Dialog (MapBuModal) — both same-screen, no extra routes (§24).
const BuHeadList = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [mapTarget, setMapTarget] = useState(null);

  const debouncedSearch = useDebounce(search, 400);

  const params = {
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sorting[0] && { sort_by: sorting[0].id, sort_order: sorting[0].desc ? 'DESC' : 'ASC' }),
  };

  const { data, isPending } = useBuHeads(params);

  const buHeads = data?.data ?? [];
  const meta = data?.meta ?? {};

  const columns = [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 80,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            title="Map BU"
            onClick={() => setMapTarget(row.original)}
            className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            <Link2 className="h-3 w-3" />
          </Button>
        </div>
      ),
    }),
    columnHelper.accessor('employee_code', {
      header: 'Employee ID',
      size: 130,
      meta: { sticky: true, left: 80 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="120px" className="font-medium" />,
    }),
    columnHelper.accessor('full_name', {
      header: 'Name',
      size: 200,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="180px" />,
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      size: 220,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="200px" />,
    }),
    columnHelper.display({
      id: 'mapped_bu_count',
      header: 'Mapped BUs',
      size: 120,
      cell: ({ row }) => <MappedBuCount buHeadId={row.original.id} />,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 140,
      cell: (info) => <StatusToggle buHead={info.row.original} />,
    }),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="BU Head Master"
        description="BU Heads mapped across multiple BUs"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search BU heads…"
                className="pl-9 w-[250px] h-9 text-sm bg-white"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setIsAddOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add BU Head
            </Button>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={buHeads}
        isLoading={isPending}
        toolbar={null}
        pagination={
          meta.total != null
            ? { page: meta.page ?? page, limit: meta.limit ?? limit, total: meta.total }
            : undefined
        }
        sorting={sorting}
        onSortingChange={(s) => { setSorting(s); setPage(1); }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        emptyState={
          !search ? (
            <EmptyState
              title="No BU Heads yet"
              description="Add a BU Head and map them to one or more BUs to get started."
              action={{ label: 'Add BU Head', icon: Plus, onClick: () => setIsAddOpen(true) }}
            />
          ) : undefined
        }
      />

      <BuHeadForm open={isAddOpen} onOpenChange={setIsAddOpen} />
      <MapBuModal buHead={mapTarget} open={!!mapTarget} onOpenChange={(open) => !open && setMapTarget(null)} />
    </div>
  );
};

export default BuHeadList;
