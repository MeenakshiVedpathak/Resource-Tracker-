import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

// Standard collapsible filter panel paired with FilterToggleButton — a plain CSS max-height
// transition (not AnimatePresence/framer-motion) matching every master list page.
//
// `maxHeightClass` must be a literal Tailwind arbitrary-value class (e.g. "max-h-[160px]"),
// passed as a full string at the call site — Tailwind's JIT scans source text for literal class
// names, so building this string at runtime (e.g. `max-h-[${n}px]`) would silently fail to
// generate the CSS and the panel would never visibly expand.
//
// `onClear`/`showClear`: pages that track an `activeFilterCount` (the same count already shown
// as a badge on FilterToggleButton) pass `showClear={activeFilterCount > 0}` and an
// `onClear` that resets exactly those optional filters — required filters (e.g. a report's
// month/year) are left alone so the page never ends up in a blank/broken state. Rendered as a
// trailing full-width grid item (not a separate wrapper row) so it never disturbs a caller's
// tuned `maxHeightClass`/`gridClassName` (e.g. Dashboard's fully custom override) when unused.
const FilterPanel = ({ isOpen, maxHeightClass = 'max-h-[160px]', gridClassName, onClear, showClear, children }) => (
  <div
    className={cn(
      'overflow-hidden transition-all duration-500 ease-in-out',
      isOpen ? `${maxHeightClass} opacity-100 mb-2` : 'max-h-0 opacity-0 mb-0'
    )}
  >
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4 w-full rounded-lg border bg-muted/30 p-4', gridClassName)}>
      {children}
      {showClear && (
        <button
          type="button"
          onClick={onClear}
          className="col-span-full -mt-1 flex items-center justify-end gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
        >
          <X className="h-3 w-3" /> Clear filters
        </button>
      )}
    </div>
  </div>
);

export default FilterPanel;
