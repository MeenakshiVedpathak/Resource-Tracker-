import { cn } from '@/utils/cn';

// Standard collapsible filter panel paired with FilterToggleButton — a plain CSS max-height
// transition (not AnimatePresence/framer-motion) matching every master list page.
//
// `maxHeightClass` must be a literal Tailwind arbitrary-value class (e.g. "max-h-[160px]"),
// passed as a full string at the call site — Tailwind's JIT scans source text for literal class
// names, so building this string at runtime (e.g. `max-h-[${n}px]`) would silently fail to
// generate the CSS and the panel would never visibly expand.
const FilterPanel = ({ isOpen, maxHeightClass = 'max-h-[160px]', gridClassName, children }) => (
  <div
    className={cn(
      'overflow-hidden transition-all duration-500 ease-in-out',
      isOpen ? `${maxHeightClass} opacity-100 mb-2` : 'max-h-0 opacity-0 mb-0'
    )}
  >
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4 w-full rounded-lg border bg-muted/30 p-4', gridClassName)}>
      {children}
    </div>
  </div>
);

export default FilterPanel;
