import { useMemo, useState } from 'react';
import PageHeader from '@/components/common/PageHeader';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import MonthBudgetCard from './MonthBudgetCard';
import ServicePoMonthlyBudgetModal from './ServicePoMonthlyBudgetModal';
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

// One card per calendar month. The true current period reuses the `/current` payload (it's the
// only source of deadline/days_remaining), every other month fetches via useServicePoMonthlyBudgetMonth.
const MonthGridCard = ({ month, year, activePOs, isCurrent, currentData, isCurrentLoading, onFillData }) => {
  const isOtherMonth = !isCurrent;
  const { data: monthData, isPending: isMonthPending } = useServicePoMonthlyBudgetMonth(
    isOtherMonth ? month : null,
    isOtherMonth ? year : null,
    activePOs
  );

  const servicePos = isCurrent ? currentData?.service_pos : monthData ?? (activePOs.length === 0 ? [] : undefined);
  const isLoading = isCurrent ? isCurrentLoading : activePOs.length > 0 && isMonthPending;
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

  const { data: currentData, isPending: isCurrentLoading } = useCurrentServicePoMonthlyBudget();
  const { data: activePOs = [] } = useActiveServicePOs();

  const months = useMemo(() => MONTH_NUMBERS.map((month) => ({
    month,
    year,
    isCurrent: month === CURRENT_MONTH && year === CURRENT_YEAR,
  })), [year]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Service PO Monthly Budget"
        description="Manage monthly invoice and billed amounts for Service POs."
        actions={(
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {months.map(({ month, year: y, isCurrent }) => (
          <MonthGridCard
            key={`${y}-${month}`}
            month={month}
            year={y}
            activePOs={activePOs}
            isCurrent={isCurrent}
            currentData={currentData}
            isCurrentLoading={isCurrentLoading}
            onFillData={setModalState}
          />
        ))}
      </div>

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
