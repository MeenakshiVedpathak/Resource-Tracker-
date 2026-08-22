import * as React from 'react';
import { cn } from '@/utils/cn';
import { TimeInput } from '@/components/ui/time-input';

// Pairs two TimeInput popovers (Start/End) so a Work Log row's exact-time block still reads as
// one combined "range" control. Each opens via its own clock icon, but finishing a full Start
// pick (both hour and minute chosen) auto-closes Start and opens End, so entering a range is one
// continuous flow instead of two separate manual opens. End's picker also disables any hour/minute
// at or before the chosen Start, so an invalid range can't be picked in the first place.
export const TimeRangePicker = ({
  startValue, endValue, onChange, disabled, className,
}) => {
  const [openField, setOpenField] = React.useState(null); // 'start' | 'end' | null

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <TimeInput
        value={startValue}
        onChange={(v) => onChange(v, endValue)}
        disabled={disabled}
        label="start"
        className="h-7 flex-1"
        open={openField === 'start'}
        onOpenChange={(o) => setOpenField((prev) => (o ? 'start' : (prev === 'start' ? null : prev)))}
        onComplete={() => setOpenField('end')}
      />
      <span className="shrink-0 text-muted-foreground">–</span>
      <TimeInput
        value={endValue}
        onChange={(v) => onChange(startValue, v)}
        disabled={disabled}
        label="end"
        className="h-7 flex-1"
        open={openField === 'end'}
        onOpenChange={(o) => setOpenField((prev) => (o ? 'end' : (prev === 'end' ? null : prev)))}
        minExclusive={startValue}
      />
    </div>
  );
};

export default TimeRangePicker;
