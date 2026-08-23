import { Minus, Plus } from 'lucide-react';
import { TimeRangePicker } from '@/components/ui/time-range-picker';
import { Badge } from '@/components/ui/badge';
import { sumSegmentHours } from '@/utils/employeeTimeEntry';

export const BLANK_SEGMENT = { start_time: '', end_time: '' };

// "1h 30m" / "45m" / "2h" — matches the wording the Work Log Time Report uses for its own
// combined-hours rollup ("1 hr 50 mins"), just compact enough to sit in a row-level badge.
const formatDuration = (hours) => {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// One or more { start_time, end_time } rows for the Time Entry form — "Add segment" appends a
// blank row, each row past the first gets a remove control. A completed row shows its own
// duration as a badge (immediate per-segment feedback, not just the form's running total); a
// half-filled row (only one side picked) surfaces the same "both times required" message the
// backend would otherwise 400 on, without waiting for a submit attempt. `segments` is expected
// to always have at least one row (the parent seeds it with BLANK_SEGMENT); this component never
// drops the array down to empty on its own.
const TimeSegmentsInput = ({ segments, onChange, disabled }) => {
  const updateSegment = (index, start, end) => {
    onChange(segments.map((s, i) => (i === index ? { start_time: start, end_time: end } : s)));
  };
  const addSegment = () => onChange([...segments, BLANK_SEGMENT]);
  const removeSegment = (index) => onChange(segments.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {segments.map((segment, index) => {
        const isComplete = !!segment.start_time && !!segment.end_time;
        const isPartial = !segment.start_time !== !segment.end_time;
        const duration = isComplete ? sumSegmentHours([segment]) : 0;

        return (
          <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
              {index + 1}
            </span>
            <TimeRangePicker
              startValue={segment.start_time ?? ''}
              endValue={segment.end_time ?? ''}
              onChange={(start, end) => updateSegment(index, start, end)}
              disabled={disabled}
              className="flex-1 text-xs"
            />
            {isComplete && (
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {formatDuration(duration)}
              </Badge>
            )}
            {isPartial && (
              <span className="text-[11px] font-medium text-destructive">Both times required</span>
            )}
            {segments.length > 1 && (
              <button
                type="button"
                onClick={() => removeSegment(index)}
                disabled={disabled}
                title="Remove time segment"
                className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:pointer-events-none disabled:opacity-40"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={addSegment}
        disabled={disabled}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" /> Add segment
      </button>
    </div>
  );
};

export default TimeSegmentsInput;
