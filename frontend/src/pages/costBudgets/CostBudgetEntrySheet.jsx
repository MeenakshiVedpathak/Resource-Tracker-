import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Building2 } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { useCreateCostBudget, useUpdateCostBudget } from '@/hooks/useCostBudgets';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { formatMonthYear } from '@/utils/formatters';
import { toApiMonth, fromApiMonth } from '@/utils/monthApi';

const FORM_ID = 'cost-budget-entry-form';

const requiredAmount = (label) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z
      .number({ required_error: `${label} is required.`, invalid_type_error: `${label} must be a number.` })
      .min(0, 'Amount cannot be negative.')
  );

const formSchema = z.object({
  invoice_amount: requiredAmount('Invoice Amount'),
  description: z.string().optional(),
});

const EMPTY_VALUES = { invoice_amount: '', description: '' };

const CurrencyInput = ({ disabled, ...props }) => (
  <div className="relative">
    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground">₹</span>
    <Input type="number" min="0" step="0.01" disabled={disabled} className="pl-7" {...props} />
  </div>
);

// The list page already scopes everything to one Service PO before this sheet ever opens, so
// there's no PO picker here — `servicePo` (create) / `initialData` (edit) supply its display
// info, and only the month (create-only — locked once created, same as invoice_amount/description
// are the only editable fields in edit mode) needs picking.
const CostBudgetEntrySheet = ({ open, onOpenChange, initialData, servicePo }) => {
  const isEdit = !!initialData;
  const { success, error: showError } = useNotification();

  const [period, setPeriod] = useState(null);

  const createMutation = useCreateCostBudget();
  const updateMutation = useUpdateCostBudget();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const form = useForm({ resolver: zodResolver(formSchema), defaultValues: EMPTY_VALUES });

  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setPeriod(fromApiMonth(initialData.month));
      form.reset({
        invoice_amount: initialData.invoice_amount ?? '',
        description: initialData.description ?? '',
      });
    } else {
      setPeriod(null);
      form.reset(EMPTY_VALUES);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialData]);

  const displayPo = isEdit
    ? { client: initialData.client, service_po_name: initialData.service_po_name, service_po_code: initialData.service_po_code }
    : servicePo;

  const onSubmit = (values) => {
    if (isEdit) {
      updateMutation.mutate(
        { id: initialData.id, payload: { invoice_amount: values.invoice_amount, description: values.description || '' } },
        {
          onSuccess: () => {
            success('Cost budget updated successfully.');
            onOpenChange(false);
          },
          onError: (err) => showError(extractApiError(err)),
        }
      );
      return;
    }

    createMutation.mutate(
      {
        service_po_id: servicePo.id,
        month: toApiMonth(period),
        invoice_amount: values.invoice_amount,
        description: values.description || '',
      },
      {
        onSuccess: () => {
          success('Cost budget created successfully.');
          onOpenChange(false);
        },
        onError: (err) => showError(extractApiError(err)),
      }
    );
  };

  const canSubmit = isEdit || !!period;

  return (
    <Sheet open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        onInteractOutside={(e) => isSaving && e.preventDefault()}
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle>{isEdit ? 'Edit Cost Budget' : 'New Cost Budget'}</SheetTitle>
          <SheetDescription>
            {displayPo?.service_po_name}
            {displayPo?.service_po_code ? ` (${displayPo.service_po_code})` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {displayPo?.client?.client_name && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="muted" className="gap-1.5 font-normal">
                <Building2 className="h-3 w-3" /> {displayPo.client.client_name}
              </Badge>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Month</Label>
            {isEdit ? (
              <p className="text-sm font-medium">{formatMonthYear(period?.month, period?.year)}</p>
            ) : (
              <MonthYearPicker value={period} onChange={setPeriod} placeholder="Select month" clearable={false} className="w-full" />
            )}
          </div>

          <Separator />

          <Form {...form}>
            <form id={FORM_ID} onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="invoice_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Amount <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <CurrencyInput placeholder="5,00,000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. August monthly cost" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <SheetFooter className="border-t px-5 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isSaving || !canSubmit}>
            <Save className="mr-1.5 h-4 w-4" />
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default CostBudgetEntrySheet;
