import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Folder, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useForms } from '@/hooks/useForms';
import { useFormCategories } from '@/hooks/useFormCategories';
import { resolveFormRoute } from '@/constants/rbacForms';
import PageHeader from '@/components/common/PageHeader';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';

const REPORTS_MODULE = 'reports';
const UNCATEGORIZED_KEY = 'uncategorized';

// Landing page for the Reports module — a Zoho-style category browser (folder list on the
// left, that category's reports on the right) sitting on top of the same underlying data
// ReportsLayout's sidebar nav and the Form Master screen use: GET /forms (module_name +
// category_id per row) joined against the current user's own accessible-forms map so a user
// only ever sees reports they're actually granted, same gating as the sidebar links.
const ReportsCenter = () => {
  const navigate = useNavigate();
  const { accessibleForms } = useAuth();
  const { data: formsList } = useForms({ status: 'active' });
  const { data: categories = [] } = useFormCategories({});
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null); // null = "All Reports"

  const accessibleReportNames = useMemo(() => {
    const entry = Object.entries(accessibleForms ?? {}).find(
      ([moduleName]) => moduleName.trim().toLowerCase() === REPORTS_MODULE
    );
    return new Set((entry?.[1] ?? []).map((f) => f.name));
  }, [accessibleForms]);

  const categoryLookup = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const reportRows = useMemo(() =>
    (formsList?.data ?? [])
      .filter((f) => f.module_name?.trim().toLowerCase() === REPORTS_MODULE && accessibleReportNames.has(f.form_name))
      .map((f) => {
        const cfg = resolveFormRoute(f.form_name);
        if (!cfg) return null;
        return { id: f.id, name: f.form_name, to: cfg.to, icon: cfg.icon, categoryId: f.category_id ?? null, seq: f.seq ?? 0 };
      })
      .filter(Boolean)
      .sort((a, b) => a.seq - b.seq),
    [formsList, accessibleReportNames]
  );

  const categoryFolders = useMemo(() => {
    const byCategory = new Map();
    reportRows.forEach((r) => {
      const key = r.categoryId ?? UNCATEGORIZED_KEY;
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key).push(r);
    });
    return Array.from(byCategory.entries())
      .map(([key, items]) => ({
        id: key,
        name: key === UNCATEGORIZED_KEY ? 'Other Reports' : categoryLookup.get(key)?.name ?? `Category #${key}`,
        seq: key === UNCATEGORIZED_KEY ? Number.MAX_SAFE_INTEGER : categoryLookup.get(key)?.seq ?? 0,
        items,
      }))
      .sort((a, b) => a.seq - b.seq);
  }, [reportRows, categoryLookup]);

  const visibleRows = useMemo(() => {
    const base = selectedCategoryId == null
      ? reportRows
      : categoryFolders.find((c) => c.id === selectedCategoryId)?.items ?? [];
    const q = search.trim().toLowerCase();
    return q ? base.filter((r) => r.name.toLowerCase().includes(q)) : base;
  }, [selectedCategoryId, categoryFolders, reportRows, search]);

  const activeLabel = selectedCategoryId == null
    ? 'All Reports'
    : categoryFolders.find((c) => c.id === selectedCategoryId)?.name ?? 'Reports';

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)]">
      <PageHeader title="Reports Center" description="Browse reports by category" />

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="w-64 shrink-0 flex flex-col rounded-lg border bg-white overflow-hidden">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports"
                className="pl-9 h-9 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                selectedCategoryId == null ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'
              )}
            >
              <Folder className="h-4 w-4 shrink-0" />
              <span className="truncate">All Reports</span>
              <span className="ml-auto text-xs text-muted-foreground">{reportRows.length}</span>
            </button>

            {categoryFolders.length > 0 && (
              <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Report Category
              </p>
            )}
            {categoryFolders.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                  selectedCategoryId === cat.id ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'
                )}
              >
                <Folder className="h-4 w-4 shrink-0" />
                <span className="truncate">{cat.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{cat.items.length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col rounded-lg border bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b">
            <h2 className="text-lg font-semibold">{activeLabel}</h2>
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
              {visibleRows.length}
            </span>
          </div>

          <div className="px-5 py-2 border-b bg-muted/30 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Report Name
          </div>

          <div className="flex-1 overflow-y-auto">
            {visibleRows.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">No reports found.</div>
            ) : (
              visibleRows.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => navigate(r.to)}
                  className="flex w-full items-center gap-3 border-b px-5 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/40"
                >
                  <r.icon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm font-medium text-primary">{r.name}</span>
                  <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsCenter;
