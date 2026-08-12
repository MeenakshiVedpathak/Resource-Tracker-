import { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { Save } from 'lucide-react';
import { useSaveServicePoMonthlyBudget } from '@/hooks/useServicePoMonthlyBudget';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatMonthYear, formatDateTime } from '@/utils/formatters';

const requiredAmount = (label) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z
      .number({ required_error: `${label} is required.`, invalid_type_error: `${label} must be a number.` })
      .min(0, 'Amount cannot be negative.')
  );

const rowSchema = z.object({
  service_po_id: z.number(),
  service_po_code: z.string().optional(),
  service_po_name: z.string(),
  client_name: z.string().optional(),
  updated_at: z.string().nullable().optional(),
  invoice_amount: requiredAmount('Invoice Amount'),
  invoice_description: z.string().optional(),
  billed_amount: requiredAmount('Billed Amount'),
  billed_remark: z.string().optional(),
});

const formSchema = z.object({ rows: z.array(rowSchema) });

const toDefaultRows = (servicePos) =>
  (servicePos ?? []).map((po) => ({
    service_po_id: po.service_po_id,
    service_po_code: po.service_po_code,
    service_po_name: po.service_po_name,
    // `/current`'s service_pos nest client info (`po.client.client_name`); the year-grid's
    // other-month rows come from the active-POs list instead, which has it flat (`po.client_name`).
    client_name: po.client?.client_name ?? po.client_name,
    updated_at: po.updated_at ?? null,
    invoice_amount: po.invoice_amount ?? '',
    invoice_description: po.invoice_description ?? '',
    billed_amount: po.billed_amount ?? '',
    billed_remark: po.billed_remark ?? '',
  }));

// Response data is the saved record plus a nested `deadline` object; surface an overdue toast
// when the save landed past the deadline instead of the generic success message.
const buildSaveToastMessage = (results) => {
  const deadlineInfo = results.find((r) => r?.deadline)?.deadline;
  if (deadlineInfo?.deadline_passed) {
    const deadlineLabel = dayjs(deadlineInfo.deadline).format('MMM D');
    const daysOverdue = Math.abs(deadlineInfo.days_remaining ?? 0);
    return `Saved. Deadline was ${deadlineLabel}, ${daysOverdue} ${daysOverdue === 1 ? 'day' : 'days'} overdue.`;
  }
  return 'Monthly Service PO data saved successfully.';
};

const ServicePoMonthlyBudgetModal = ({ open, onOpenChange, month, year, servicePos }) => {
  const { success, error: showError } = useNotification();
  const saveMutation = useSaveServicePoMonthlyBudget();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { rows: toDefaultRows(servicePos) },
  });

  const { fields } = useFieldArray({ control, name: 'rows' });

  // Re-seed only at the moment the modal opens, not on every background refetch of `servicePos`
  // while it's already open — otherwise an in-flight edit would get silently overwritten.
  useEffect(() => {
    if (open) reset({ rows: toDefaultRows(servicePos) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = (values) => {
    const rows = values.rows.map((r) => ({
      service_po_id: r.service_po_id,
      month,
      year,
      invoice_amount: r.invoice_amount,
      invoice_description: r.invoice_description || '',
      billed_amount: r.billed_amount,
      billed_remark: r.billed_remark || '',
    }));

    saveMutation.mutate(rows, {
      onSuccess: (results) => {
        success(buildSaveToastMessage(results));
        onOpenChange(false);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const isSaving = saveMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-5xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4 mb-0">
          <DialogTitle>{formatMonthYear(month, year)} — Service PO Monthly Data</DialogTitle>
          <DialogDescription>Enter this month's invoice and billed amounts for each Service PO.</DialogDescription>
        </DialogHeader>

        <form
          id="service-po-monthly-budget-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-6 py-4"
        >
          {fields.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No active Service POs for your company
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Service PO</TableHead>
                    <TableHead className="min-w-[160px]">Client</TableHead>
                    <TableHead className="min-w-[150px]">Invoice Amount</TableHead>
                    <TableHead className="min-w-[200px]">Invoice Description</TableHead>
                    <TableHead className="min-w-[150px]">Billed Amount</TableHead>
                    <TableHead className="min-w-[200px]">Billed Remark</TableHead>
                    <TableHead className="min-w-[160px]">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="align-top font-medium">
                        <div>{field.service_po_name}</div>
                        {field.service_po_code && (
                          <div className="font-mono text-xs font-normal text-muted-foreground">{field.service_po_code}</div>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-sm text-muted-foreground">
                        {field.client_name || '—'}
                      </TableCell>
                      <TableCell className="align-top">
                        <Controller
                          control={control}
                          name={`rows.${index}.invoice_amount`}
                          render={({ field: f }) => (
                            <Input type="number" min="0" step="0.01" placeholder="e.g. 100000" {...f} />
                          )}
                        />
                        {errors.rows?.[index]?.invoice_amount && (
                          <p className="mt-1 text-xs font-medium text-destructive">
                            {errors.rows[index].invoice_amount.message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <Controller
                          control={control}
                          name={`rows.${index}.invoice_description`}
                          render={({ field: f }) => <Input placeholder="e.g. August Invoice" {...f} />}
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Controller
                          control={control}
                          name={`rows.${index}.billed_amount`}
                          render={({ field: f }) => (
                            <Input type="number" min="0" step="0.01" placeholder="e.g. 95000" {...f} />
                          )}
                        />
                        {errors.rows?.[index]?.billed_amount && (
                          <p className="mt-1 text-xs font-medium text-destructive">
                            {errors.rows[index].billed_amount.message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <Controller
                          control={control}
                          name={`rows.${index}.billed_remark`}
                          render={({ field: f }) => <Input placeholder="e.g. August Billing" {...f} />}
                        />
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground">
                        {field.updated_at ? formatDateTime(field.updated_at) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </form>

        <DialogFooter className="border-t px-6 py-4 mt-0 gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form="service-po-monthly-budget-form" disabled={isSaving || fields.length === 0}>
            <Save className="mr-1.5 h-4 w-4" />
            {isSaving ? 'Saving…' : 'Save Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ServicePoMonthlyBudgetModal;
