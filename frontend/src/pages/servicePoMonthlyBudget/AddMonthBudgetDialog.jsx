import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: dayjs().month(i).format('MMMM'),
}));

// Asks which month/year to fill before handing off to the real ServicePoMonthlyBudgetModal —
// the parent resolves that month's Service PO data first, so `isResolving` keeps this dialog
// open (with a spinner state) until the fill modal has data ready to show.
const AddMonthBudgetDialog = ({ open, onOpenChange, yearOptions, defaultMonth, defaultYear, isResolving, onConfirm }) => {
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);

  useEffect(() => {
    if (open) {
      setMonth(defaultMonth);
      setYear(defaultYear);
    }
  }, [open, defaultMonth, defaultYear]);

  return (
    <Dialog open={open} onOpenChange={(next) => !isResolving && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Fill Service PO Monthly Data</DialogTitle>
          <DialogDescription>Choose the month and year you want to fill data for.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Month</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Year</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-9 w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isResolving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onConfirm({ month, year })} disabled={isResolving}>
            {isResolving ? 'Loading…' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddMonthBudgetDialog;
