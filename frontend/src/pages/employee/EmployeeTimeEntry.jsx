import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import {
  Save, RotateCcw, FolderKanban, CalendarDays, FileText, AlertCircle, Hourglass,
  Lightbulb, ListPlus, CircleCheck,
} from 'lucide-react';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ProjectSelect from '@/components/employee/ProjectSelect';
import TimeSegmentsInput, { BLANK_SEGMENT } from '@/components/employee/TimeSegmentsInput';
import PageHeader from '@/components/common/PageHeader';
import { employeeWorkLogApi } from '@/api/employeeWorkLog.api';
import { useEmployeeMappedProjects } from '@/hooks/useEmployeeProjects';
import { useEmployeeDailyWorkLog, useSaveWorkLogDay, useUpdateWorkLogEntry } from '@/hooks/useEmployeeWorkLog';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError, extractFieldErrors } from '@/services/apiClient';
import { cn } from '@/utils/cn';
import { flattenHierarchyTree } from '@/utils/servicePOHierarchy';
import { findExistingLine, buildOtherDayEntries, validateSegments, sumSegmentHours } from '@/utils/employeeTimeEntry';
import { DAILY_HOURS_CAP } from '@/components/employee/WorkLogEntryModal';

const taskSchema = z.object({
  service_po_id: z.string().min(1, 'Service PO is required.'),
  hierarchy_node_id: z.string().optional(),
  description: z.string().min(1, 'Description is required.').max(1000),
  timesheet_date: z.string().min(1, 'Date is required.'),
});

const blankDefaults = (date) => ({
  service_po_id: '',
  hierarchy_node_id: '',
  description: '',
  timesheet_date: date,
});

// Cap-aware color for the running Total Hours readout — matches the semantics of
// [[feedback_negative_available_hours]]-style "warn before the server has to" badges used
// elsewhere in the app: green while comfortably under, amber approaching the 12h cap, red once
// over (the server always has the final say — this is just earlier, friendlier feedback).
const totalHoursTone = (hours) => {
  if (hours > DAILY_HOURS_CAP) return { badge: 'destructive', bar: 'bg-destructive' };
  if (hours >= DAILY_HOURS_CAP * 0.75) return { badge: 'warning', bar: 'bg-warning' };
  return { badge: 'success', bar: 'bg-success' };
};

// Separate screen from "Work Log" (EmployeeTimesheet.jsx) — that form is pure hours, this one is
// pure start/end time segments; a line is never both (see backend spec). Pick Module/Task + date,
// add one or more segments, save. No hours field: it's always server-computed as their sum.
//
// Same POST/PUT endpoints as Work Log, and the same whole-day-replace hazard on POST — see
// utils/employeeTimeEntry.js for how this form reads the day back first and either targets a
// single existing row with PUT (when an id is available) or resends every other row untouched
// alongside this one via POST.
const EmployeeTimeEntry = () => {
  const today = dayjs().format('YYYY-MM-DD');
  const { success, error: showError } = useNotification();
  const qc = useQueryClient();
  const { data: projects = [] } = useEmployeeMappedProjects();
  const saveDayMutation = useSaveWorkLogDay();
  const updateMutation = useUpdateWorkLogEntry();
  const [segments, setSegments] = useState([BLANK_SEGMENT]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const form = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: blankDefaults(today),
  });

  const selectedServicePOId = form.watch('service_po_id');
  const selectedHierarchyNodeId = form.watch('hierarchy_node_id');
  const selectedDate = form.watch('timesheet_date');
  const selectedProject = projects.find((p) => String(p.id) === String(selectedServicePOId));
  const hierarchyOptions = flattenHierarchyTree(selectedProject?.hierarchy ?? []);

  const filledSegments = segments.filter((s) => s.start_time || s.end_time);
  const totalHours = sumSegmentHours(filledSegments);
  const tone = totalHoursTone(totalHours);

  // Live preview of the day this entry would land on, purely informational — the actual
  // GET /daily used at save time (below) is always re-fetched fresh right before writing, since
  // this cached copy could be stale by then. Reuses the exact same merge helpers the real save
  // uses, so what the side panel shows is never out of step with what submitting will do.
  const { data: dayPreview } = useEmployeeDailyWorkLog(selectedDate);
  const otherHoursToday = useMemo(() => {
    if (!dayPreview) return 0;
    const otherEntries = buildOtherDayEntries(dayPreview, selectedDate, selectedServicePOId, selectedHierarchyNodeId || null);
    return otherEntries.reduce((sum, e) => sum + Number(e.hours || 0), 0);
  }, [dayPreview, selectedDate, selectedServicePOId, selectedHierarchyNodeId]);
  const newDayTotal = Math.round((otherHoursToday + totalHours) * 100) / 100;
  const dayTone = totalHoursTone(newDayTotal);

  const handleSegmentsChange = (next) => {
    setSegments(next);
    if (formError) setFormError(null);
  };

  const submit = async (values) => {
    setFormError(null);
    const segmentError = validateSegments(filledSegments);
    if (segmentError) {
      setFormError(segmentError);
      return;
    }

    setIsSaving(true);
    try {
      // Always re-read the day fresh right before writing — this is the whole-day-replace hazard
      // the backend spec calls out: whichever form saves last must know about the other form's
      // rows, and a stale client-side cache could be missing something saved moments ago.
      const dailyData = await employeeWorkLogApi.getDaily(values.timesheet_date);
      const hierarchyNodeId = values.hierarchy_node_id || null;
      const otherEntries = buildOtherDayEntries(dailyData, values.timesheet_date, values.service_po_id, hierarchyNodeId);
      const otherHours = otherEntries.reduce((sum, e) => sum + Number(e.hours || 0), 0);

      if (otherHours + totalHours > DAILY_HOURS_CAP) {
        setFormError(`Total hours for ${values.timesheet_date} cannot exceed ${DAILY_HOURS_CAP}. This would total ${otherHours + totalHours} hours.`);
        return;
      }

      const existing = findExistingLine(dailyData, values.timesheet_date, values.service_po_id, hierarchyNodeId);
      if (existing?.id) {
        // Targeted edit — only this one row changes, the rest of the day is never touched.
        await updateMutation.mutateAsync({
          id: existing.id,
          payload: { description: values.description, time_entries: filledSegments },
        });
      } else {
        // No id to target (brand-new line, or the daily tree doesn't expose one) — whole-day
        // replace, resending every other line untouched alongside this segmented one.
        await saveDayMutation.mutateAsync({
          timesheet_date: values.timesheet_date,
          entries: [
            ...otherEntries,
            {
              service_po_id: values.service_po_id,
              hierarchy_node_id: hierarchyNodeId,
              description: values.description,
              time_entries: filledSegments,
            },
          ],
        });
      }

      success('Time entry saved.');
      form.reset(blankDefaults(values.timesheet_date));
      setSegments([BLANK_SEGMENT]);
      qc.invalidateQueries({ queryKey: ['employee-worklog'] });
    } catch (err) {
      const fieldErrors = extractFieldErrors(err);
      if (Object.keys(fieldErrors).length) {
        Object.entries(fieldErrors).forEach(([field, message]) => form.setError(field, { message }));
      } else {
        showError(extractApiError(err));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    form.reset(blankDefaults(form.getValues('timesheet_date') || today));
    setSegments([BLANK_SEGMENT]);
    setFormError(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Time Entry"
        description="Log exact start/end time segments against a Module/Task — hours are computed automatically."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center gap-3 space-y-0 border-b bg-muted/30">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Hourglass className="h-5 w-5" />
            </span>
            <div>
              <CardTitle>Log a Time Entry</CardTitle>
              <CardDescription>Pick what you worked on, then add each time block you logged.</CardDescription>
            </div>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)}>
              <CardContent className="space-y-5 pt-5">
                {formError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <FolderKanban className="h-3.5 w-3.5" /> What did you work on?
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="service_po_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <FolderKanban className="h-3.5 w-3.5 text-muted-foreground" /> Project
                        </FormLabel>
                        <FormControl>
                          <ProjectSelect
                            value={field.value}
                            onChange={(v) => {
                              if (v !== field.value) form.setValue('hierarchy_node_id', '');
                              field.onChange(v);
                            }}
                            disabled={isSaving}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="timesheet_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" /> Date
                        </FormLabel>
                        <FormControl>
                          <Input type="date" max={today} disabled={isSaving} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {hierarchyOptions.length > 0 && (
                  <FormField
                    control={form.control}
                    name="hierarchy_node_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Module / Task</FormLabel>
                        <FormControl>
                          <SearchableSelect
                            options={[
                              { label: 'None — log against the Service PO itself', value: '' },
                              ...hierarchyOptions.map((n) => ({
                                value: String(n.id),
                                searchValue: [n.parentName, n.name].filter(Boolean).join(' '),
                                label: (
                                  <span className="flex items-baseline gap-1.5" style={{ paddingLeft: `${n.depth * 16}px` }}>
                                    {n.depth > 0 && <span className="text-muted-foreground">{'└'}</span>}
                                    <span>{n.name}</span>
                                  </span>
                                ),
                              })),
                            ]}
                            value={field.value || ''}
                            onValueChange={(v) => field.onChange(v)}
                            disabled={isSaving}
                            placeholder="None — log against the Service PO itself"
                            searchPlaceholder="Search…"
                          />
                        </FormControl>
                        <FormDescription>Optional — leave blank to log time against the Service PO itself.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Hourglass className="h-3.5 w-3.5" /> Time Segments
                  </div>
                  <Badge variant={tone.badge} className="tabular-nums">{totalHours} {totalHours === 1 ? 'hr' : 'hrs'} total</Badge>
                </div>

                <TimeSegmentsInput segments={segments} onChange={handleSegmentsChange} disabled={isSaving} />

                <Separator />

                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" /> Notes
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="What did you work on?" rows={3} disabled={isSaving} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>

              <CardFooter className="justify-end gap-2 border-t bg-muted/20">
                <Button type="button" variant="outline" size="sm" onClick={handleReset} disabled={isSaving}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                </Button>
                <Button type="submit" size="sm" disabled={isSaving}>
                  <Save className="mr-1.5 h-4 w-4" />
                  {isSaving ? 'Saving…' : 'Save Time Entry'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Day Summary</CardTitle>
              <CardDescription>{dayjs(selectedDate).format('dddd, DD MMM YYYY')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Already logged</span>
                <span className="font-medium tabular-nums">{otherHoursToday} hrs</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">This entry</span>
                <span className="font-medium tabular-nums">{totalHours} hrs</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Day total</span>
                <Badge variant={dayTone.badge} className="tabular-nums">{newDayTotal} hrs</Badge>
              </div>
              <div className="space-y-1">
                <Progress value={Math.min(100, (newDayTotal / DAILY_HOURS_CAP) * 100)} indicatorClassName={dayTone.bar} />
                <p className="text-right text-[11px] text-muted-foreground">Cap: {DAILY_HOURS_CAP} hrs/day</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <Lightbulb className="h-4 w-4 text-warning" /> Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0 text-xs text-muted-foreground">
              <p className="flex gap-1.5"><ListPlus className="h-3.5 w-3.5 shrink-0 translate-y-0.5" /> Worked on the same task in more than one block today? Add a segment for each — hours add up automatically.</p>
              <p className="flex gap-1.5"><CircleCheck className="h-3.5 w-3.5 shrink-0 translate-y-0.5" /> No need to enter hours — they're always calculated from your start/end times.</p>
              <p className={cn('flex gap-1.5', newDayTotal > DAILY_HOURS_CAP && 'font-medium text-destructive')}>
                <AlertCircle className="h-3.5 w-3.5 shrink-0 translate-y-0.5" /> Logging plain hours instead? Use the separate "Work Log" screen.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EmployeeTimeEntry;
