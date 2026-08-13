import { useState } from 'react';
import { Plus, RotateCcw } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ServicePoBudgetEntrySheet from './ServicePoBudgetEntrySheet';
import ServicePoMonthlyBudgetList from './ServicePoMonthlyBudgetList';
import ServicePoYearlyBudgetView from './ServicePoYearlyBudgetView';
import { useServicePoMonthlyBudgetList } from '@/hooks/useServicePoMonthlyBudget';

const now = new Date();
const CURRENT_MONTH = now.getMonth() + 1;
const CURRENT_YEAR = now.getFullYear();

const ServicePoMonthlyBudgetPage = () => {
  const [tab, setTab] = useState('monthly');
  const [period, setPeriod] = useState({ month: CURRENT_MONTH, year: CURRENT_YEAR });
  const [yearlyYear, setYearlyYear] = useState(CURRENT_YEAR);
  // null = sheet closed, '' = adding a new entry, otherwise the PO id being edited.
  const [sheetTarget, setSheetTarget] = useState(null);

  const { data: records = [], isPending: isListLoading } = useServicePoMonthlyBudgetList(period.month, period.year);

  const isCurrentPeriod = period.month === CURRENT_MONTH && period.year === CURRENT_YEAR;

  return (
    <div className="space-y-4">
      <PageHeader title="Invoice Master" description="Track monthly invoice and billed amounts for Service POs." />

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>

          {tab === 'monthly' && (
            <div className="flex items-center gap-2">
              <MonthYearPicker value={period} onChange={(v) => v && setPeriod(v)} clearable={false} />
              {!isCurrentPeriod && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setPeriod({ month: CURRENT_MONTH, year: CURRENT_YEAR })}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> This month
                </Button>
              )}
              <Button size="sm" className="gap-1.5" onClick={() => setSheetTarget('')}>
                <Plus className="h-4 w-4" /> Add Entry
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="monthly" className="mt-4 space-y-4">
          <ServicePoMonthlyBudgetList
            month={period.month}
            year={period.year}
            records={records}
            isLoading={isListLoading}
            onEdit={(poId) => setSheetTarget(String(poId))}
            onAddEntry={() => setSheetTarget('')}
          />
        </TabsContent>

        <TabsContent value="yearly" className="mt-4">
          <ServicePoYearlyBudgetView year={yearlyYear} onYearChange={setYearlyYear} />
        </TabsContent>
      </Tabs>

      <ServicePoBudgetEntrySheet
        open={sheetTarget !== null}
        onOpenChange={(next) => !next && setSheetTarget(null)}
        month={period.month}
        year={period.year}
        initialServicePoId={sheetTarget || ''}
      />
    </div>
  );
};

export default ServicePoMonthlyBudgetPage;
