import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import { LayoutGrid, ChevronDown, ChevronRight } from 'lucide-react';

const PO_COLORS = [
  'hsl(var(--primary))',
  '#6366f1',
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#f97316',
  '#ef4444',
];

const ClientPOMatrixChart = ({ data = [], isLoading, fiscalYear }) => {
  const [expanded, setExpanded] = useState({});

  const grouped = useMemo(() => {
    const map = new Map();
    data.forEach((row) => {
      if (!map.has(row.client_id)) {
        map.set(row.client_id, {
          client_id: row.client_id,
          client_name: row.client_name,
          total: 0,
          pos: [],
        });
      }
      const client = map.get(row.client_id);
      client.total += row.hours;
      if (row.hours > 0) {
        client.pos.push({ id: row.service_po_id, name: row.service_po_name, hours: row.hours });
      }
    });
    return Array.from(map.values())
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [data]);

  const toggle = (clientId) =>
    setExpanded((prev) => ({ ...prev, [clientId]: !prev[clientId] }));

  const fyLabel = fiscalYear ? `FY ${fiscalYear}–${String(fiscalYear + 1).slice(-2)}` : '';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48 mb-1" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client × Service PO (Hours)</CardTitle>
        <CardDescription>Hours breakdown by client and service PO · {fyLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        {grouped.length === 0 ? (
          <EmptyState
            icon={LayoutGrid}
            title="No PO data"
            description="Service PO hours will appear once timesheets are submitted."
            className="py-10"
          />
        ) : (
          <div className="space-y-1.5">
            {grouped.map((client) => {
              const isOpen = !!expanded[client.client_id];
              const maxPO = Math.max(...client.pos.map((p) => p.hours), 1);

              return (
                <div key={client.client_id} className="rounded-md border overflow-hidden">
                  {/* Client header row */}
                  <button
                    onClick={() => toggle(client.client_id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <span className="text-sm font-medium truncate max-w-[200px]">
                        {client.client_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {client.pos.length} PO{client.pos.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-foreground">
                        {client.total.toLocaleString('en-IN')} hrs
                      </span>
                    </div>
                  </button>

                  {/* PO rows */}
                  {isOpen && (
                    <div className="border-t bg-muted/20 divide-y divide-border/50">
                      {client.pos
                        .sort((a, b) => b.hours - a.hours)
                        .map((po, idx) => {
                          const pct = maxPO > 0 ? (po.hours / maxPO) * 100 : 0;
                          const color = PO_COLORS[idx % PO_COLORS.length];
                          return (
                            <div key={po.id} className="px-4 py-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <span
                                  className="text-xs font-medium truncate max-w-[220px]"
                                  title={po.name}
                                >
                                  {po.name}
                                </span>
                                <span className="text-xs tabular-nums text-muted-foreground ml-2 shrink-0">
                                  {po.hours.toLocaleString('en-IN')} hrs
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%`, background: color }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientPOMatrixChart;
