import { useServicePoMonthlyBudgetMonth } from '@/hooks/useServicePoMonthlyBudget';

const now = new Date();
export const CURRENT_MONTH = now.getMonth() + 1;
export const CURRENT_YEAR = now.getFullYear();

// Shared by the year table and the "Fill Month Data" picker: resolves a month/year into its
// Service PO rows. The true current period reuses the `/current` payload (it's the only source
// of deadline/days_remaining); every other month fans out via useServicePoMonthlyBudgetMonth.
export const useResolvedMonthServicePos = (month, year, activePOs, currentData, isCurrentLoading) => {
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
