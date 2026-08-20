import { useCallback, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, RotateCcw, Search } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import ServicePoBudgetEntrySheet from './ServicePoBudgetEntrySheet';
import ServicePoMonthlyBudgetList from './ServicePoMonthlyBudgetList';
import MonthSummaryStrip from './MonthSummaryStrip';
import { useServicePoMonthlyBudgetList, useServicePoMonthlyBudgetYearSummary } from '@/hooks/useServicePoMonthlyBudget';
import { useActiveClients } from '@/hooks/useClients';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useActiveServiceTypes } from '@/hooks/useServiceTypes';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { useDebounce } from '@/hooks/useDebounce';
import { isInvoiceMasterPeriodWritable, INVOICE_MASTER_WINDOW_MESSAGE } from '@/utils/invoiceMasterWindow';

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();

const ServicePoMonthlyBudgetPage = () => {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT_MONTH);
  // null = sheet closed, otherwise { servicePoId, month, year } — servicePoId '' means "adding new".
  const [editSheet, setEditSheet] = useState(null);

  const monthlyListRef = useRef(null);
  const [canExport, setCanExport] = useState(false);
  const handleExportStateChange = useCallback((can) => setCanExport(can), []);

  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [poFilter, setPoFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  const { data: activeClients = [] } = useActiveClients();
  const { data: activePOs = [] } = useActiveServicePOs();
  const { data: activeServiceTypes = [] } = useActiveServiceTypes();
  const { data: activeServiceCategories = [] } = useActiveServiceCategories();
  const monthSummaries = useServicePoMonthlyBudgetYearSummary(year);
  const { data: records = [], isPending: isListLoading } = useServicePoMonthlyBudgetList(selectedMonth, year);

  const isCurrentPeriod = selectedMonth === CURRENT_MONTH && year === CURRENT_YEAR;
  const isPeriodWritable = isInvoiceMasterPeriodWritable(selectedMonth, year);

  // Type → Category, so a PO can be matched against a selected Category via its own Type.
  const typeCategoryMap = useMemo(() => {
    const map = new Map();
    activeServiceTypes.forEach((t) => map.set(String(t.id), String(t.service_category_id)));
    return map;
  }, [activeServiceTypes]);

  // Category → Type: only show types belonging to the selected category
  const filteredServiceTypes = categoryFilter === 'all'
    ? activeServiceTypes
    : activeServiceTypes.filter((t) => String(t.service_category_id) === categoryFilter);

  // Type (or Category, if no type chosen yet) → Service PO
  const filteredPOs = activePOs.filter((po) => {
    const poTypeId = po.serviceType?.id != null ? String(po.serviceType.id) : null;
    if (typeFilter !== 'all') return poTypeId === typeFilter;
    if (categoryFilter !== 'all') return poTypeId != null && typeCategoryMap.get(poTypeId) === categoryFilter;
    return true;
  });

  // Resolves Category/Type/PO into the concrete set of Service PO ids a budget record's own
  // `service_po_id` must belong to — null means "no restriction from these three filters".
  const allowedPoIds = useMemo(() => {
    if (categoryFilter === 'all' && typeFilter === 'all' && poFilter === 'all') {
      return null;
    }
    const ids = new Set();
    for (const po of activePOs) {
      if (poFilter !== 'all' && String(po.id) !== poFilter) continue;
      const poTypeId = po.serviceType?.id != null ? String(po.serviceType.id) : null;
      if (typeFilter !== 'all' && poTypeId !== typeFilter) continue;
      if (categoryFilter !== 'all' && (poTypeId == null || typeCategoryMap.get(poTypeId) !== categoryFilter)) continue;
      ids.add(po.id);
    }
    return ids;
  }, [activePOs, categoryFilter, typeFilter, poFilter, typeCategoryMap]);

  const handleCategoryChange = (v) => {
    setCategoryFilter(v);
    setTypeFilter('all');
    setPoFilter('all');
  };

  const handleTypeChange = (v) => {
    setTypeFilter(v);
    setPoFilter('all');
  };

  const activeFilterCount = [clientFilter, categoryFilter, typeFilter, poFilter]
    .filter((v) => v !== 'all').length;

  const handleYearChange = (next) => {
    setYear(next);
    // Jumping years keeps the same calendar month selected — only "This month" resets both.
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Monthly PO Reporting"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border px-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleYearChange(year - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-sm font-semibold">{year}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleYearChange(year + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {!isCurrentPeriod && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  setYear(CURRENT_YEAR);
                  setSelectedMonth(CURRENT_MONTH);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> This month
              </Button>
            )}

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search PO, code, client…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((p) => !p)}
              activeCount={activeFilterCount}
              className="h-9"
            />

            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              disabled={!canExport}
              onClick={() => monthlyListRef.current?.exportExcel()}
            >
              <Download className="h-4 w-4" /> Export Excel
            </Button>
          </div>
        }
      />

      <FilterPanel isOpen={filtersOpen} maxHeightClass="max-h-[420px]">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Client</Label>
          <SearchableSelect
            options={[
              { label: 'All Clients', value: 'all' },
              ...activeClients.map((c) => ({ label: c.client_name, value: String(c.id) })),
            ]}
            value={clientFilter}
            onValueChange={setClientFilter}
            placeholder="All Clients"
            searchPlaceholder="Search client..."
            className="h-9 w-full text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Category</Label>
          <SearchableSelect
            showSearch={false}
            options={[
              { label: 'All Categories', value: 'all' },
              ...activeServiceCategories.map((c) => ({ label: c.name, value: String(c.id) })),
            ]}
            value={categoryFilter}
            onValueChange={handleCategoryChange}
            placeholder="All Categories"
            className="h-9 w-full text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Service Type</Label>
          <SearchableSelect
            options={[
              { label: 'All Service Types', value: 'all' },
              ...filteredServiceTypes.map((t) => ({ label: t.service_type_name, value: String(t.id) })),
            ]}
            value={typeFilter}
            onValueChange={handleTypeChange}
            placeholder="All Service Types"
            searchPlaceholder="Search service type..."
            className="h-9 w-full text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Service PO</Label>
          <SearchableSelect
            options={[
              { label: 'All POs', value: 'all' },
              ...filteredPOs.map((po) => ({
                label: po.service_po_name || po.service_po_code || String(po.id),
                value: String(po.id),
              })),
            ]}
            value={poFilter}
            onValueChange={setPoFilter}
            placeholder="All POs"
            searchPlaceholder="Search PO..."
            className="h-9 w-full text-sm"
          />
        </div>
      </FilterPanel>

      <MonthSummaryStrip
        year={year}
        summaries={monthSummaries}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        currentMonth={CURRENT_MONTH}
        currentYear={CURRENT_YEAR}
        totalPOCount={activePOs.length}
      />

      <ServicePoMonthlyBudgetList
        ref={monthlyListRef}
        month={selectedMonth}
        year={year}
        records={records}
        isLoading={isListLoading}
        search={debouncedSearch}
        clientFilter={clientFilter}
        poFilterIds={allowedPoIds}
        onEdit={(poId) => setEditSheet({ servicePoId: String(poId), month: selectedMonth, year })}
        onAddEntry={() => setEditSheet({ servicePoId: '', month: selectedMonth, year })}
        canAddEntry={isPeriodWritable}
        addEntryDisabledReason={INVOICE_MASTER_WINDOW_MESSAGE}
        onExportStateChange={handleExportStateChange}
      />

      <ServicePoBudgetEntrySheet
        open={editSheet !== null}
        onOpenChange={(next) => !next && setEditSheet(null)}
        month={editSheet?.month ?? selectedMonth}
        year={editSheet?.year ?? year}
        initialServicePoId={editSheet?.servicePoId ?? ''}
      />
    </div>
  );
};

export default ServicePoMonthlyBudgetPage;
