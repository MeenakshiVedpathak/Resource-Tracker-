import * as React from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const pad = (n) => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));

// Selection/storage stays 24-hour "HH:MM" (what the backend/rest of the Work Log flow expects) —
// only the display box formats it as 12-hour + AM/PM, derived from whatever was picked.
const formatDisplay = (value) => {
  const [hh, mm] = (value || '').split(':');
  if (!hh || mm === undefined) return '--:-- --';
  const h24 = Number(hh);
  const period = h24 >= 12 ? 'PM' : 'AM';
  const hour12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${hour12}:${mm} ${period}`;
};

// One scrollable Hour or Minute column, styled to match the app (accent-highlighted selection,
// hover states, rounded) instead of the browser's own unstyled native spinner. Auto-scrolls the
// current value to the middle whenever the popover opens.
const TimeColumn = ({ items, value, onSelect, label, open }) => {
  const selectedRef = React.useRef(null);

  React.useEffect(() => {
    if (open) selectedRef.current?.scrollIntoView({ block: 'center' });
  }, [open]);

  return (
    <div className="flex flex-col items-center">
      <div className="pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="h-48 w-14 overflow-y-auto rounded-md border bg-muted/30">
        {items.map((item) => {
          const isSelected = item === value;
          return (
            <button
              key={item}
              type="button"
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onSelect(item)}
              className={cn(
                'block w-full px-2 py-1 text-center text-sm tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground',
                isSelected && 'bg-primary font-semibold text-primary-foreground hover:bg-primary',
              )}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Displays "h:mm AM/PM" (or a placeholder) in a plain, non-interactive box — only the trailing
// clock icon opens the picker, so clicking anywhere else in the box does nothing. The popover
// itself is two custom 24-hour Hour(00-23)/Minute(00-59) columns (any minute, not a fixed-step
// list) rather than the OS's native time-input spinner; the value stored/emitted is always
// 24-hour "HH:MM".
//
// `open`/`onOpenChange` let a parent (TimeRangePicker) control this picker's visibility so it can
// auto-open the next field; omit both for standalone/uncontrolled use. `onComplete` fires once
// per open session, the moment the user has clicked both an hour AND a minute (not just whenever
// the value happens to look complete — picking only the hour leaves minute defaulted to "00",
// which would otherwise look "complete" without the user ever touching the minute column).
export const TimeInput = ({
  value, onChange, disabled, className, label, open: openProp, onOpenChange, onComplete,
}) => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (next) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const [hh, mm] = (value || '').split(':');
  const pickedRef = React.useRef({ hour: false, minute: false });

  React.useEffect(() => {
    if (open) pickedRef.current = { hour: false, minute: false };
  }, [open]);

  const checkComplete = () => {
    if (pickedRef.current.hour && pickedRef.current.minute) {
      setOpen(false);
      onComplete?.();
    }
  };

  const setHour = (h) => {
    onChange(`${h}:${mm ?? '00'}`);
    pickedRef.current = { ...pickedRef.current, hour: true };
    checkComplete();
  };
  const setMinute = (m) => {
    onChange(`${hh ?? '00'}:${m}`);
    pickedRef.current = { ...pickedRef.current, minute: true };
    checkComplete();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            'flex h-9 items-center gap-1 rounded-md border bg-transparent pl-2 pr-1',
            disabled && 'pointer-events-none opacity-50',
            className,
          )}
        >
          <span className={cn('flex-1 text-xs tabular-nums', !(hh && mm !== undefined) && 'text-muted-foreground')}>
            {formatDisplay(value)}
          </span>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={label ? `Open ${label} time picker` : 'Open time picker'}
              disabled={disabled}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Clock className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex gap-2">
          <TimeColumn items={HOURS} value={hh} onSelect={setHour} label="HH" open={open} />
          <TimeColumn items={MINUTES} value={mm} onSelect={setMinute} label="MM" open={open} />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default TimeInput;
