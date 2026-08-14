import { useMemo, useState } from 'react';
import { Plus, RotateCcw, Search } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ServicePoBudgetEntrySheet from './ServicePoBudgetEntrySheet';
import ServicePoMonthlyBudgetList from './ServicePoMonthlyBudgetList';
import ServicePoYearlyBudgetView from './ServicePoYearlyBudgetView';
import { useServicePoMonthlyBudgetList } from '@/hooks/useServicePoMonthlyBudget';
import { useActiveClients } from '@/hooks/useClients';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useActiveServiceTypes } from '@/hooks/useServiceTypes';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { useDebounce } from '@/hooks/useDebounce';

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();

const ServicePoMonthlyBudgetPage = () => {
  const [tab, setTab] = useState('monthly');
  const [period, setPeriod] = useState({ month: CURRENT_MONTH, year: CURRENT_YEAR });
  const [yearlyYear, setYearlyYear] = useState(CURRENT_YEAR);
  // null = sheet closed, '' = adding a new entry, otherwise the PO id being edited.
  const [sheetTarget, setSheetTarget] = useState(null);

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
  const { data: records = [], isPending: isListLoading } = useServicePoMonthlyBudgetList(period.month, period.year);

  const isCurrentPeriod = period.month === CURRENT_MONTH && period.year === CURRENT_YEAR;

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

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <div className="space-y-4">
        <PageHeader
          title="Invoice Master"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <TabsList>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
                <TabsTrigger value="yearly">Yearly</TabsTrigger>
              </TabsList>

              {tab === 'monthly' && (
                <>
                  <MonthYearPicker value={period} onChange={(v) => v && setPeriod(v)} clearable={false} />
                  {!isCurrentPeriod && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={() => setPeriod({ month: CURRENT_MONTH, year: CURRENT_YEAR })}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> This month
                    </Button>
                  )}
                </>
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

              {tab === 'monthly' && (
                <Button size="sm" className="gap-1.5" onClick={() => setSheetTarget('')}>
                  <Plus className="h-4 w-4" /> Add Entry
                </Button>
              )}
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

        <TabsContent value="monthly" className="mt-0 space-y-4">
          <ServicePoMonthlyBudgetList
            month={period.month}
            year={period.year}
            records={records}
            isLoading={isListLoading}
            search={debouncedSearch}
            clientFilter={clientFilter}
            poFilterIds={allowedPoIds}
            onEdit={(poId) => setSheetTarget(String(poId))}
            onAddEntry={() => setSheetTarget('')}
          />
        </TabsContent>

        <TabsContent value="yearly" className="mt-0">
          <ServicePoYearlyBudgetView
            year={yearlyYear}
            onYearChange={setYearlyYear}
            search={debouncedSearch}
            clientFilter={clientFilter}
            poFilterIds={allowedPoIds}
          />
        </TabsContent>
      </div>

      <ServicePoBudgetEntrySheet
        open={sheetTarget !== null}
        onOpenChange={(next) => !next && setSheetTarget(null)}
        month={period.month}
        year={period.year}
        initialServicePoId={sheetTarget || ''}
      />
    </Tabs>
  );
};

export default ServicePoMonthlyBudgetPage;
