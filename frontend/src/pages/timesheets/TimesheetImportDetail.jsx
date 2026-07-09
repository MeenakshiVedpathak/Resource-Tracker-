import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { useTimesheetImportRows } from '@/hooks/useTimesheets';
import { useTimesheetHistory } from '@/hooks/useTimesheets';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useActiveServiceTypes } from '@/hooks/useServiceTypes';
import { ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const columnHelper = createColumnHelper();

const TimesheetImportDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: rowsData, isPending } = useTimesheetImportRows(id);
  // fetch history to get the import metadata (file name, importer, etc.)
  const { data: historyData } = useTimesheetHistory({ page: 1, limit: 100 });

  const rows = Array.isArray(rowsData?.data) ? rowsData.data : [];
  console.log('rowsData full response:', rowsData);
  console.log('first row sample:', rows[0]);
  const importRecord = (historyData?.data ?? []).find((r) => String(r.id) === String(id));

  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [poFilter, setPoFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('all');

  const { data: activeServiceCategories = [] } = useActiveServiceCategories();
  const { data: activePOs = [] } = useActiveServicePOs();
  const { data: activeServiceTypes = [] } = useActiveServiceTypes();

  const poCategoryMap = useMemo(() => {
    const typeToCategory = Object.fromEntries(
      activeServiceTypes.map((st) => [String(st.id), String(st.service_category_id ?? '')])
    );
    const map = Object.fromEntries(
      activePOs.map((po) => [String(po.id), typeToCategory[String(po.serviceType?.id)] ?? ''])
    );
    console.log('activePOs sample:', activePOs[0]);
    console.log('activeServiceTypes sample:', activeServiceTypes[0]);
    console.log('activeServiceCategories:', activeServiceCategories);
    console.log('poCategoryMap:', map);
    return map;
  }, [activePOs, activeServiceTypes, activeServiceCategories]);

  const { employees, pos, clients } = useMemo(() => {
    return {
      employees: Array.from(new Set(rows.map(r => r.employee?.full_name).filter(Boolean))).sort(),
      pos: Array.from(new Set(rows.map(r => r.servicePO?.service_po_name).filter(Boolean))).sort(),
      clients: Array.from(new Set(rows.map(r => r.servicePO?.client?.client_name).filter(Boolean))).sort(),
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (employeeFilter !== 'all' && row.employee?.full_name !== employeeFilter) return false;
      if (poFilter !== 'all' && row.servicePO?.service_po_name !== poFilter) return false;
      if (clientFilter !== 'all' && row.servicePO?.client?.client_name !== clientFilter) return false;
      if (serviceCategoryFilter !== 'all' && poCategoryMap[String(row.servicePO?.id)] !== serviceCategoryFilter) return false;
      return true;
    });
  }, [rows, employeeFilter, poFilter, clientFilter, serviceCategoryFilter, poCategoryMap]);

  const columns = [
    columnHelper.accessor('employee', {
      header: 'Employee',
      cell: (info) => {
        const e = info.getValue();
        return (
          <div>
            <p className="text-sm font-medium">{e?.full_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground font-mono">{e?.employee_code ?? ''}</p>
          </div>
        );
      },
    }),
    columnHelper.accessor('servicePO', {
      header: 'Service PO',
      cell: (info) => {
        const po = info.getValue();
        return (
          <div>
            <p className="text-sm font-medium">{po?.service_po_name ?? '—'}</p>
            <p className="text-xs text-muted-foreground font-mono">{po?.service_po_code ?? ''}</p>
          </div>
        );
      },
    }),
    columnHelper.accessor('servicePO.client', {
      id: 'client',
      header: 'Client',
      cell: (info) => {
        const client = info.getValue();
        return client ? (
          <span className="text-sm">{client.client_name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    }),
    columnHelper.accessor('subProject', {
      header: 'Sub-Project',
      cell: (info) => {
        const sp = info.getValue();
        return sp ? (
          <div>
            <p className="text-sm">{sp.sub_project_name}</p>
            <p className="text-xs text-muted-foreground font-mono">{sp.sub_project_code}</p>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    }),
    columnHelper.accessor('timesheet_date', {
      header: 'Date',
      size: 120,
      cell: (info) => (
        <span className="text-sm tabular-nums">{formatDate(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('hours_logged', {
      header: 'Hours',
      size: 90,
      cell: (info) => (
        <span className="tabular-nums font-semibold text-sm">
          {info.getValue() != null ? `${Number(info.getValue()).toFixed(2)}h` : '—'}
        </span>
      ),
    }),
    columnHelper.accessor('servicePO.is_billable', {
      id: 'billable',
      header: 'Billable',
      size: 90,
      cell: (info) =>
        info.getValue() ? (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 text-xs">
            Billable
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">Non-billable</Badge>
        ),
    }),
  ];

  return (
    <div>
      <PageHeader
        title="Import Details"
        description={importRecord?.file_name ?? `Import #${id}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.TIMESHEETS)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* Import summary card */}
      {importRecord && (
        <Card className="mb-5">
          <CardContent className="flex flex-wrap gap-6 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">File</p>
                <p className="text-sm font-medium truncate max-w-[240px]">{importRecord.file_name}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Imported By</p>
              <p className="text-sm font-medium">
                {importRecord.importer?.employee?.full_name ?? importRecord.importer?.email ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Imported At</p>
              <p className="text-sm tabular-nums">{formatDate(importRecord.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rows</p>
              <p className="text-sm tabular-nums">
                <span className="text-green-600 font-semibold">{importRecord.valid_rows}</span>
                <span className="text-muted-foreground"> / {importRecord.total_rows}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Employees</p>
              <p className="text-sm font-semibold tabular-nums">{employees.length}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredRows}
          isLoading={false}
          toolbar={
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full mb-2">
              <SearchableSelect
                options={[
                  { label: "All Employees", value: "all" },
                  ...employees.map(emp => ({ label: emp, value: emp }))
                ]}
                value={employeeFilter}
                onValueChange={setEmployeeFilter}
                placeholder="All Employees"
                searchPlaceholder="Search employee..."
                className="w-full h-9"
              />
              
              <SearchableSelect
                options={[
                  { label: "All Service POs", value: "all" },
                  ...pos.map(po => ({ label: po, value: po }))
                ]}
                value={poFilter}
                onValueChange={setPoFilter}
                placeholder="All Service POs"
                searchPlaceholder="Search PO..."
                className="w-full h-9"
              />

              <SearchableSelect
                options={[
                  { label: "All Clients", value: "all" },
                  ...clients.map(client => ({ label: client, value: client }))
                ]}
                value={clientFilter}
                onValueChange={setClientFilter}
                placeholder="All Clients"
                searchPlaceholder="Search client..."
                className="w-full h-9"
              />

              <SearchableSelect
                options={[
                  { label: "All Categories", value: "all" },
                  ...activeServiceCategories.map((sc) => ({
                    label: sc.name,
                    value: String(sc.id),
                  })),
                ]}
                value={serviceCategoryFilter}
                onValueChange={setServiceCategoryFilter}
                placeholder="All Categories"
                searchPlaceholder="Search category..."
                className="w-full h-9"
              />
            </div>
          }
        />
      )}
    </div>
  );
};

export default TimesheetImportDetail;
