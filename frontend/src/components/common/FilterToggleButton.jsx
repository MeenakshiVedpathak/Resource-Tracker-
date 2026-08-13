import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

// Standard "Filters" button used on every master/report toolbar (see PageHeader `actions`) —
// toggles a sibling FilterPanel's open/closed state and shows a count badge when any filter is
// non-default, so uniformity only needs `activeCount` computed per-page, not the button itself.
const FilterToggleButton = ({ isOpen, onToggle, activeCount = 0, label = 'Filters', className }) => (
  <Button
    size="sm"
    className={cn('gap-2 bg-blue-600 hover:bg-blue-700 text-white', className)}
    onClick={onToggle}
    aria-expanded={isOpen}
  >
    <Filter className="h-4 w-4" />
    {label}
    {activeCount > 0 && (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
        {activeCount}
      </span>
    )}
  </Button>
);

export default FilterToggleButton;
