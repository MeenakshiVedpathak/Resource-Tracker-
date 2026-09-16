import { cn } from '@/utils/cn';

// Shared 2-3 way pill toggle (e.g. Status: Active/Inactive/All, Mode: Date/Month) — previously
// hand-rolled near-identically on several master/report pages (EmployeeList, ClientList,
// EmployeeWorkLogComplianceReport). `options` is `[{ value, label }]`; height matches the
// standard h-9 toolbar/input row (grows via min-h-9 if a label wraps) so it drops straight into a
// FilterPanel grid cell.
//
// Every option gets an equal 1/3 (or 1/2) share via `flex-1 basis-0` regardless of label length —
// `min-w-0` is what makes that share actually enforceable: without it, a long one-word label like
// "Overallocated" (TeamCapacityTable's status filter) has an intrinsic min-width equal to its own
// unbroken text width, which the button refused to shrink below, so it kept its full width and
// visually spilled over the next segment ("Bench") instead of respecting the equal split.
// `break-words` then lets that same long label wrap onto a second line within its now-enforced
// narrow share, rather than overflowing or needing truncation.
const SegmentedToggle = ({ options, value, onChange, className }) => (
  <div className={cn('flex min-h-9 items-stretch overflow-hidden rounded-md border bg-background text-sm', className)}>
    {options.map((opt) => (
      <button
        key={opt.value}
        type="button"
        onClick={() => onChange(opt.value)}
        className={cn(
          'min-w-0 flex-1 basis-0 border-r px-2 py-1.5 text-center font-medium capitalize leading-tight break-words transition-colors last:border-r-0',
          value === opt.value
            ? 'bg-primary text-primary-foreground'
            : 'bg-background text-muted-foreground hover:bg-muted'
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default SegmentedToggle;
