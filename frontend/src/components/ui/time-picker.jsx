import { SearchableSelect } from '@/components/ui/searchable-select';

const pad = (n) => String(n).padStart(2, '0');

// 96 options, 15-minute steps across the full day, labeled 12-hour ("9:00 AM") but valued as the
// 24-hour "HH:MM" string the backend and the rest of this form use — one click + one pick from a
// searchable list, instead of juggling separate hour/minute/AM-PM controls.
const buildTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${pad(h)}:${pad(m)}`;
      const period = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const label = `${hour12}:${pad(m)} ${period}`;
      options.push({ value, label, searchValue: `${label} ${value}` });
    }
  }
  return options;
};

const TIME_OPTIONS = buildTimeOptions();

export const TimePicker = ({ value, onChange, disabled, className, placeholder = 'Select time' }) => (
  <SearchableSelect
    options={TIME_OPTIONS}
    value={value || ''}
    onValueChange={(v) => v && onChange(v)}
    placeholder={placeholder}
    searchPlaceholder="Search time..."
    disabled={disabled}
    className={className}
  />
);

export default TimePicker;
