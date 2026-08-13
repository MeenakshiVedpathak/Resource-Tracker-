import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import MonthBudgetCard from './MonthBudgetCard';
import ServicePoMonthlyBudgetModal from './ServicePoMonthlyBudgetModal';
import AddMonthBudgetDialog from './AddMonthBudgetDialog';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import {
  useCurrentServicePoMonthlyBudget,
  useServicePoMonthlyBudgetMonth,
} from '@/hooks/useServicePoMonthlyBudget';

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];
const MONTH_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

// Shared by the year grid and the "Fill Month Data" picker: resolves a month/year into its
// Service PO rows. The true current period reuses the `/current` payload (it's the only source
// of deadline/days_remaining); every other month fans out via useServicePoMonthlyBudgetMonth.
const useResolvedMonthServicePos = (month, year, activePOs, currentData, isCurrentLoading) => {
  const isCurrent = !!month && !!year && month === CURRENT_MONTH && year === CURRENT_YEAR;
  const isOtherMonth = !isCurrent && !!month && !!year;
  const { data: monthData, isPending: isMonthPending } = useServicePoMonthlyBudgetMonth(
    isOtherMonth ? month : null,
    isOtherMonth ? year : null,
    activePOs
  );

  const servicePos = isCurrent ? currentData?.service_pos : monthData ?? (activePOs.length === 0 ? [] : undefined);
  const isLoading = isCurrent ? isCurrentLoading : isOtherMonth && activePOs.length > 0 && isMonthPending;

  return { servicePos, isLoading, isCurrent };
};

// One card per calendar month, but only rendered once that month actually has saved data —
// unfilled months are reached via the "Fill Month Data" button instead of cluttering the grid.
const MonthGridCard = ({ month, year, activePOs, currentData, isCurrentLoading, onFillData }) => {
  const { servicePos, isLoading, isCurrent } = useResolvedMonthServicePos(
    month, year, activePOs, currentData, isCurrentLoading
  );

  const hasData = !isLoading && Array.isArray(servicePos) && servicePos.some((po) => po.updated_at != null);
  if (!isLoading && !hasData) return null;

  const deadline = isCurrent && currentData
    ? { deadline: currentData.deadline, days_remaining: currentData.days_remaining, deadline_passed: currentData.deadline_passed }
    : null;

  return (
    <MonthBudgetCard
      month={month}
      year={year}
      servicePos={servicePos}
      isLoading={isLoading}
      deadline={deadline}
      isCurrent={isCurrent}
      onFillData={() => onFillData({ month, year, servicePos })}
    />
  );
};

const ServicePoMonthlyBudgetPage = () => {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [modalState, setModalState] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [addMonthOpen, setAddMonthOpen] = useState(false);
  const [pendingSelection, setPendingSelection] = useState(null);

  const { data: currentData, isPending: isCurrentLoading } = useCurrentServicePoMonthlyBudget();
  const { data: activePOs = [] } = useActiveServicePOs();

  const months = useMemo(() => MONTH_NUMBERS.map((month) => ({ month, year })), [year]);

  const pendingResolved = useResolvedMonthServicePos(
    pendingSelection?.month ?? null,
    pendingSelection?.year ?? null,
    activePOs,
    currentData,
    isCurrentLoading
  );

  // Only opens the fill modal once the picked month's Service PO data has actually resolved —
  // opening it earlier would seed the form from a stale/undefined `servicePos` (the modal only
  // re-reads its rows at the moment it transitions open, not on later data changes).
  useEffect(() => {
    if (!pendingSelection || pendingResolved.isLoading) return;
    setModalState({ month: pendingSelection.month, year: pendingSelection.year, servicePos: pendingResolved.servicePos });
    setPendingSelection(null);
    setAddMonthOpen(false);
  }, [pendingSelection, pendingResolved.isLoading, pendingResolved.servicePos]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Service PO Monthly Budget"
        description="Manage monthly invoice and billed amounts for Service POs."
        actions={(
          <>
            <Button onClick={() => setAddMonthOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Fill Month Data
            </Button>
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((prev) => !prev)}
              activeCount={year !== CURRENT_YEAR ? 1 : 0}
            />
          </>
        )}
      />

      <p className="text-sm text-muted-foreground">
        Only months with saved data are shown below — use "Fill Month Data" to add a new month.
      </p>

      <FilterPanel isOpen={filtersOpen} maxHeightClass="max-h-[100px]" gridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Year</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-full h-9 text-sm bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FilterPanel>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {months.map(({ month, year: y }) => (
          <MonthGridCard
            key={`${y}-${month}`}
            month={month}
            year={y}
            activePOs={activePOs}
            currentData={currentData}
            isCurrentLoading={isCurrentLoading}
            onFillData={setModalState}
          />
        ))}
      </div>

      <AddMonthBudgetDialog
        open={addMonthOpen}
        onOpenChange={(open) => {
          setAddMonthOpen(open);
          if (!open) setPendingSelection(null);
        }}
        yearOptions={YEAR_OPTIONS}
        defaultMonth={CURRENT_MONTH}
        defaultYear={CURRENT_YEAR}
        isResolving={!!pendingSelection}
        onConfirm={(selection) => setPendingSelection(selection)}
      />

      <ServicePoMonthlyBudgetModal
        open={!!modalState}
        onOpenChange={(open) => !open && setModalState(null)}
        month={modalState?.month}
        year={modalState?.year}
        servicePos={modalState?.servicePos}
      />
    </div>
  );
};

export default ServicePoMonthlyBudgetPage;
