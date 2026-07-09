// import { useState, useMemo, useRef, useEffect } from 'react';
// import { motion, AnimatePresence } from 'framer-motion';
// import {
//   Clock, DollarSign, TrendingUp, TrendingDown, Users, Building2, Briefcase,
//   BarChart2, RefreshCw, X, ChevronDown, CalendarDays, AlertCircle,
//   Activity, Zap, Award, Calendar,
// } from 'lucide-react';
// import {
//   useEmployeeBillableBreakdown,
//   useTopEmployeesByPO,
//   useDashboardAnalytics,
// } from '@/hooks/useDashboard';
// import { useActiveEmployees } from '@/hooks/useEmployees';
// import { useActiveClients } from '@/hooks/useClients';
// import { useActiveServicePOs } from '@/hooks/useServicePOs';
// import MonthlyHoursTrendChart from '@/components/charts/MonthlyHoursTrendChart';
// import HoursByClientChart from '@/components/charts/HoursByClientChart';
// import HoursByEmployeeChart from '@/components/charts/HoursByEmployeeChart';
// import ClientPOMatrixChart from '@/components/charts/ClientPOMatrixChart';
// import EmployeeBenchChart from '@/components/charts/EmployeeBenchChart';
// import BillableAnalyticsPanel from '@/components/charts/BillableAnalyticsPanel';
// import TopEmployeesByPOPanel from '@/components/charts/TopEmployeesByPOPanel';
// import { Button } from '@/components/ui/button';
// import { MonthYearPicker } from '@/components/ui/month-year-picker';
// import { SearchableSelect } from '@/components/ui/searchable-select';
// import { Skeleton } from '@/components/ui/skeleton';
// import { formatCurrency, formatHours, formatDate } from '@/utils/formatters';

// /* ─── constants ──────────────────────────────────────────────────────────── */
// const now = new Date();
// const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
// const FY_OPTIONS = Array.from({ length: 5 }, (_, i) => currentFY - 2 + i).map((fy) => ({
//   value: fy,
//   label: `FY ${fy}–${String(fy + 1).slice(-2)}`,
// }));

// const QUARTERS = [
//   { value: 1, label: 'Q1', sub: 'Apr–Jun' },
//   { value: 2, label: 'Q2', sub: 'Jul–Sep' },
//   { value: 3, label: 'Q3', sub: 'Oct–Dec' },
//   { value: 4, label: 'Q4', sub: 'Jan–Mar' },
// ];
// const QUARTER_MONTHS = { 1: [4, 5, 6], 2: [7, 8, 9], 3: [10, 11, 12], 4: [1, 2, 3] };

// /* compact number: 1234 → "1.2k", 123456 → "1.2L" */
// const cNum = (v) => {
//   const n = Number(v) || 0;
//   if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
//   if (n >= 1000)   return `${(n / 1000).toFixed(1)}k`;
//   return String(Math.round(n * 10) / 10);
// };

// const KPI_CONFIG = [
//   {
//     key: 'total_hours', title: 'Total Hrs', icon: Clock,
//     bar: 'bg-orange-500', iconBg: 'bg-orange-50 dark:bg-orange-950/40', iconColor: 'text-orange-500',
//     fmt: (v) => `${cNum(v)} hrs`,
//     sub: (t) => {
//       const b = Number(t.total_hours || 0) * (Number(t.utilization_pct || 0) / 100);
//       return `${cNum(b)} hrs billable`;
//     },
//   },
//   {
//     key: 'total_cost', title: 'Total Cost', icon: DollarSign,
//     bar: 'bg-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', iconColor: 'text-emerald-600',
//     fmt: (v) => `₹${cNum(v)}`,
//     sub: (t) => {
//       const hrs = Number(t.total_hours || 0);
//       const cost = Number(t.total_cost || 0);
//       return hrs > 0 ? `₹${Math.round(cost / hrs)}/hr avg` : null;
//     },
//   },
//   {
//     key: 'utilization_pct', title: 'Utilization', icon: Activity,
//     bar: 'bg-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-950/40', iconColor: 'text-blue-500',
//     fmt: (v) => `${Number(v).toFixed(1)}%`,
//     sub: (t) => {
//       const diff = (Number(t.utilization_pct || 0) - 80).toFixed(1);
//       return `${diff >= 0 ? '+' : ''}${diff}% vs 80% target`;
//     },
//   },
//   {
//     key: 'active_employees', title: 'Employees', icon: Users,
//     bar: 'bg-violet-500', iconBg: 'bg-violet-50 dark:bg-violet-950/40', iconColor: 'text-violet-500',
//     fmt: (v) => cNum(v),
//     sub: (_, c) => {
//       const bench = (c.employee_bench_pct ?? []).filter((e) => e.bench_pct > 0).length;
//       return bench > 0 ? `${bench} on bench` : 'All productive';
//     },
//   },
//   {
//     key: 'active_clients', title: 'Clients', icon: Building2,
//     bar: 'bg-cyan-500', iconBg: 'bg-cyan-50 dark:bg-cyan-950/40', iconColor: 'text-cyan-500',
//     fmt: (v) => cNum(v),
//     sub: (_, c) => {
//       const top = (c.hours_by_client ?? [])[0];
//       return top ? `Top: ${top.client_name.split(' ').slice(0, 2).join(' ')}` : null;
//     },
//   },
//   {
//     key: 'active_service_pos', title: 'Service POs', icon: Briefcase,
//     bar: 'bg-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-950/40', iconColor: 'text-amber-500',
//     fmt: (v) => cNum(v),
//     sub: (_, c) => {
//       const active = new Set((c.client_x_service_po ?? []).filter((r) => r.hours > 0).map((r) => r.service_po_id)).size;
//       return active > 0 ? `${active} with hours` : null;
//     },
//   },
//   {
//     key: 'avg_hours_per_employee', title: 'Avg Hrs/Emp', icon: BarChart2,
//     bar: 'bg-indigo-500', iconBg: 'bg-indigo-50 dark:bg-indigo-950/40', iconColor: 'text-indigo-500',
//     fmt: (v) => `${cNum(v)} hrs`,
//     sub: (t) => `≈ ${(Number(t.avg_hours_per_employee || 0) / 8).toFixed(1)} work days`,
//   },
// ];

// /* ─── sub-components ─────────────────────────────────────────────────────── */
// const itemVariants = {
//   hidden: { opacity: 0, y: 12 },
//   show:   { opacity: 1, y: 0, transition: { duration: 0.22 } },
// };
// const containerVariants = {
//   hidden: {},
//   show: { transition: { staggerChildren: 0.055 } },
// };

// const KpiCard = ({ cfg, value, isLoading, tiles, charts }) => {
//   const subText = !isLoading && cfg.sub ? cfg.sub(tiles, charts) : null;
//   return (
//     <motion.div
//       variants={itemVariants}
//       className="relative bg-card rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 group"
//     >
//       <div className={`absolute inset-x-0 top-0 h-[3px] ${cfg.bar}`} />
//       <div className="px-3 pt-4 pb-3">
//         <div className="flex items-center justify-between gap-1 mb-2.5">
//           <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none whitespace-nowrap">{cfg.title}</p>
//           <div className={`p-1.5 rounded-lg shrink-0 ${cfg.iconBg} group-hover:scale-110 transition-transform duration-200`}>
//             <cfg.icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
//           </div>
//         </div>
//         {isLoading
//           ? <><Skeleton className="h-6 w-16" /><Skeleton className="h-3 w-20 mt-2" /></>
//           : <>
//               <p className="text-[18px] font-extrabold text-foreground leading-none tracking-tight">{cfg.fmt(value ?? 0)}</p>
//               {subText && <p className="text-[10px] text-muted-foreground mt-1.5 leading-none truncate">{subText}</p>}
//             </>
//         }
//       </div>
//     </motion.div>
//   );
// };

// const InsightCard = ({ icon: Icon, label, sub, type, isLoading }) => {
//   const styles = {
//     success: { card: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800', icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400', text: 'text-emerald-800 dark:text-emerald-300', sub: 'text-emerald-600/80 dark:text-emerald-400/70' },
//     warning: { card: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800',   icon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',   text: 'text-amber-800 dark:text-amber-300',   sub: 'text-amber-600/80 dark:text-amber-400/70' },
//     danger:  { card: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',           icon: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',           text: 'text-red-800 dark:text-red-300',       sub: 'text-red-600/80 dark:text-red-400/70' },
//     info:    { card: 'bg-sky-50 border-sky-200 dark:bg-sky-950/20 dark:border-sky-800',           icon: 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400',           text: 'text-sky-800 dark:text-sky-300',       sub: 'text-sky-600/80 dark:text-sky-400/70' },
//   };
//   const s = styles[type] ?? styles.info;

//   if (isLoading) return <Skeleton className="h-16 rounded-2xl flex-1" />;

//   return (
//     <motion.div
//       variants={itemVariants}
//       className={`flex items-center gap-3 rounded-2xl border px-4 py-3 flex-1 min-w-[200px] ${s.card}`}
//     >
//       <div className={`p-2 rounded-xl shrink-0 ${s.icon}`}>
//         <Icon className="h-4 w-4" />
//       </div>
//       <div className="min-w-0">
//         <p className={`text-sm font-bold leading-tight truncate ${s.text}`}>{label}</p>
//         <p className={`text-xs mt-0.5 leading-tight truncate ${s.sub}`}>{sub}</p>
//       </div>
//     </motion.div>
//   );
// };

// const SectionLabel = ({ icon: Icon, title, action }) => (
//   <div className="flex items-center gap-3 mb-4">
//     <div className="flex items-center gap-2 shrink-0">
//       {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
//       <h2 className="text-sm font-bold text-foreground tracking-tight">{title}</h2>
//     </div>
//     <div className="h-px flex-1 bg-border" />
//     {action && <div className="shrink-0">{action}</div>}
//   </div>
// );

// const FilterPanel = ({ open, onToggle, children, badge }) => (
//   <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
//     <button
//       onClick={onToggle}
//       className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/30 transition-colors text-left group"
//     >
//       <div className="flex items-center gap-2.5">
//         <CalendarDays className="h-4 w-4 text-muted-foreground" />
//         <span className="text-sm font-semibold tracking-tight">Filters & Period</span>
//         {badge && (
//           <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold">
//             {badge} active
//           </span>
//         )}
//       </div>
//       <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:text-foreground ${open ? '' : '-rotate-90'}`} />
//     </button>
//     <AnimatePresence initial={false}>
//       {open && (
//         <motion.div
//           key="fp"
//           initial={{ height: 0, opacity: 0 }}
//           animate={{ height: 'auto', opacity: 1 }}
//           exit={{ height: 0, opacity: 0 }}
//           transition={{ duration: 0.22, ease: 'easeInOut' }}
//           style={{ overflow: 'hidden' }}
//         >
//           <div className="border-t px-4 py-2.5">{children}</div>
//         </motion.div>
//       )}
//     </AnimatePresence>
//   </div>
// );

// /* ─── Dashboard ──────────────────────────────────────────────────────────── */
// const Dashboard = () => {
//   const [fiscalYear, setFiscalYear]           = useState(currentFY);
//   const [bottomMonthYear, setBottomMonthYear] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
//   const [quarter, setQuarter]                 = useState(null);
//   const [employeeId, setEmployeeId]           = useState('');
//   const [clientId, setClientId]               = useState('');
//   const [servicePOId, setServicePOId]         = useState('');
//   const [billablePage, setBillablePage]       = useState(1);
//   const [filtersOpen, setFiltersOpen]         = useState(true);
//   const [viewMode, setViewMode]               = useState('quarterly');
//   const [headerVisible, setHeaderVisible]     = useState(true);

//   const headerRef = useRef(null);
//   const outerRef  = useRef(null);

//   useEffect(() => {
//     // Use closest('main') — the definitive scroll container per MainLayout
//     const scrollEl = outerRef.current?.closest('main') ?? document.documentElement;
//     let lastChangeY = 0;
//     let visible = true;

//     const onScroll = () => {
//       const y = scrollEl.scrollTop;
//       if (visible && y > lastChangeY + 60 && y > 80) {
//         setHeaderVisible(false);
//         visible = false;
//         lastChangeY = y;
//       } else if (!visible && y < lastChangeY - 20) {
//         setHeaderVisible(true);
//         visible = true;
//         lastChangeY = y;
//       }
//     };

//     scrollEl.addEventListener('scroll', onScroll, { passive: true });
//     return () => scrollEl.removeEventListener('scroll', onScroll);
//   }, []);

//   const month = String(bottomMonthYear.month);
//   const year  = String(bottomMonthYear.year);

//   const analyticsParams = {
//     fiscalYear,
//     ...(quarter     && { quarter }),
//     ...(employeeId  && { employeeId }),
//     ...(clientId    && { clientId }),
//     ...(servicePOId && { poId: servicePOId }),
//   };

//   const { data: analyticsData, isPending: isAnalyticsPending, refetch, isFetching, dataUpdatedAt } =
//     useDashboardAnalytics(analyticsParams);

//   const { data: topPOData,        isPending: isTopPOPending }      = useTopEmployeesByPO({ month: Number(month), year: Number(year), limit: 100 });
//   const { data: billableData,     isPending: isBillablePending }   = useEmployeeBillableBreakdown({ month: Number(month), year: Number(year), limit: 25, page: billablePage });
//   const { data: billableAllData,  isPending: isBillableAllPending } = useEmployeeBillableBreakdown({ month: Number(month), year: Number(year), limit: 500, page: 1 });
//   const { data: employeesData } = useActiveEmployees();
//   const { data: clientsData }   = useActiveClients();
//   const { data: servicePOsData }= useActiveServicePOs();

//   const tiles  = analyticsData?.tiles  ?? {};
//   const charts = analyticsData?.charts ?? {};

//   const trendData = useMemo(() => {
//     const raw = charts.monthly_hours_trend ?? [];
//     if (!quarter) return raw;
//     return raw.filter((d) => (QUARTER_MONTHS[quarter] ?? []).includes(d.month));
//   }, [charts.monthly_hours_trend, quarter]);

//   const monthlyTiles = useMemo(() => {
//     const records     = (billableAllData?.data ?? []).filter(r => (r.total_hours || 0) > 0);
//     const totalHours  = records.reduce((s, r) => s + (r.total_hours    || 0), 0);
//     const billHours   = records.reduce((s, r) => s + (r.billable_hours || 0), 0);
//     let leaveHrs = 0, idleHrs = 0;
//     records.forEach(r =>
//       (r.non_billable_reasons ?? []).forEach(nb => {
//         if (nb.service_type_name === 'Leaves') leaveHrs += (nb.hours || 0);
//         else idleHrs += (nb.hours || 0);
//       })
//     );
//     return {
//       totalHours,
//       billHours,
//       utilPct:         totalHours > 0 ? (billHours / totalHours) * 100 : 0,
//       activeEmployees: records.length,
//       leaveHrs,
//       idleHrs,
//       atRisk:          records.filter(r => (r.billable_pct || 0) < 75).length,
//       activePOs:       (topPOData?.data ?? []).filter(po => (po.top_employees ?? []).some(e => e.hours > 0)).length,
//     };
//   }, [billableAllData?.data, topPOData?.data]);

//   const employeeOptions  = (employeesData?.data  ?? employeesData  ?? []).map((e) => ({ value: String(e.employee_id ?? e.id),    label: e.full_name ?? `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() }));
//   const clientOptions    = (clientsData?.data    ?? clientsData    ?? []).map((c) => ({ value: String(c.client_id  ?? c.id),    label: c.client_name  ?? c.name }));
//   const servicePOOptions = (servicePOsData?.data ?? servicePOsData ?? []).map((p) => ({ value: String(p.service_po_id ?? p.id), label: p.service_po_name ?? p.name }));

//   const hasFilters = !!(quarter || employeeId || clientId || servicePOId);
//   const activeFilterCount = [quarter, employeeId, clientId, servicePOId].filter(Boolean).length;

//   const clearFilters = () => { setQuarter(null); setEmployeeId(''); setClientId(''); setServicePOId(''); };

//   /* ── insights ── */
//   const insights = useMemo(() => {
//     if (isAnalyticsPending) return [];
//     const list = [];
//     const util = Number(tiles.utilization_pct ?? 0);
//     if (util > 0) {
//       list.push(util >= 80
//         ? { type: 'success', icon: Zap,          label: `${util.toFixed(1)}% Utilization`,      sub: 'On track · Above 80% target' }
//         : util >= 60
//           ? { type: 'warning', icon: TrendingDown, label: `${util.toFixed(1)}% Utilization`,    sub: 'Below 80% target · Improve allocation' }
//           : { type: 'danger',  icon: TrendingDown, label: `${util.toFixed(1)}% Utilization`,    sub: 'Critical · Well below 80% target' }
//       );
//     }
//     const benchData     = charts.employee_bench_pct ?? [];
//     const critical      = benchData.filter((e) => e.bench_pct >= 75).length;
//     const onBench       = benchData.filter((e) => e.bench_pct >= 25).length;
//     if (critical > 0) list.push({ type: 'danger',  icon: AlertCircle, label: `${critical} Critical Bench`,      sub: 'Bench ≥75% · Needs immediate action' });
//     else if (onBench > 0) list.push({ type: 'warning', icon: Users,   label: `${onBench} Employee${onBench > 1 ? 's' : ''} on Bench`, sub: 'Bench >25% · Monitor allocation' });
//     else if (benchData.length > 0) list.push({ type: 'success', icon: Award, label: 'All Employees Productive', sub: 'No significant bench hours detected' });
//     const topClient = (charts.hours_by_client ?? [])[0];
//     if (topClient) list.push({ type: 'info', icon: Building2, label: topClient.client_name, sub: `Top client · ${topClient.hours.toLocaleString('en-IN')} hrs logged` });
//     const topEmp = (charts.hours_by_employee ?? [])[0];
//     if (topEmp) list.push({ type: 'info', icon: Users, label: topEmp.full_name, sub: `Top contributor · ${topEmp.hours.toLocaleString('en-IN')} hrs` });
//     return list.slice(0, 4);
//   }, [isAnalyticsPending, tiles, charts]);

//   const lastUpdated = dataUpdatedAt ? formatDate(new Date(dataUpdatedAt), 'DD MMM YYYY, hh:mm A') : null;
//   const fyLabel = `FY ${fiscalYear}–${String(fiscalYear + 1).slice(-2)}`;

//   return (
//     <div className="-mt-6 pb-8" ref={outerRef} id="dashboard-root">

//       {/* ══ STICKY ZONE ══════════════════════════════════════════════════════ */}
//       <div
//         ref={headerRef}
//         className="sticky top-0 z-20 -mx-6 px-6 bg-background/95 backdrop-blur-sm border-b shadow-sm"
//         style={{
//           transform: headerVisible ? 'translateY(0)' : 'translateY(-110%)',
//           transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
//         }}
//       >

//       {/* ══ PAGE HEADER ══════════════════════════════════════════════════════ */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-3">
//         <div>
//           <div className="flex items-center gap-2.5">
//             <div className="p-1.5 rounded-lg bg-primary/10">
//               <BarChart2 className="h-5 w-5 text-primary" />
//             </div>
//             <h1 className="text-xl font-extrabold tracking-tight text-foreground">Analytics Dashboard</h1>
//           </div>
//           <p className="text-sm text-muted-foreground mt-1 ml-0.5">
//             Resource utilization & workforce analytics ·{' '}
//             <span className="font-semibold text-foreground">{fyLabel}</span>
//             {lastUpdated && <span className="ml-2 text-xs">· Updated {lastUpdated}</span>}
//           </p>
//         </div>

//         <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
//           {/* View mode toggle */}
//           <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-muted border">
//             {[
//               { mode: 'quarterly', icon: BarChart2, label: 'Quarterly', active: 'bg-card shadow-sm text-blue-600 dark:text-blue-400' },
//               { mode: 'monthly',   icon: Calendar,  label: 'Monthly',   active: 'bg-card shadow-sm text-purple-600 dark:text-purple-400' },
//             ].map(({ mode, icon: Icon, label, active }) => (
//               <button
//                 key={mode}
//                 onClick={() => setViewMode(mode)}
//                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
//                   viewMode === mode ? active : 'text-muted-foreground hover:text-foreground'
//                 }`}
//               >
//                 <Icon className="h-3.5 w-3.5" /> {label}
//               </button>
//             ))}
//           </div>

//           {/* Contextual date picker */}
//           {viewMode === 'quarterly' ? (
//             <select
//               value={fiscalYear}
//               onChange={(e) => setFiscalYear(Number(e.target.value))}
//               className="h-9 rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium w-36"
//             >
//               {FY_OPTIONS.map((opt) => (
//                 <option key={opt.value} value={opt.value}>{opt.label}</option>
//               ))}
//             </select>
//           ) : (
//             <MonthYearPicker
//               value={bottomMonthYear}
//               onChange={(v) => { if (v) { setBottomMonthYear(v); setBillablePage(1); } }}
//               clearable={false}
//               className="w-36 h-9 text-sm"
//             />
//           )}

//           <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-9 rounded-xl gap-1.5">
//             <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
//             <span className="hidden sm:inline">Refresh</span>
//           </Button>
//         </div>
//       </div>{/* end page header */}

//       {/* Filter panel inside sticky — quarterly only */}
//       {viewMode === 'quarterly' && (
//         <div className="pb-2">
//           <FilterPanel open={filtersOpen} onToggle={() => setFiltersOpen((p) => !p)} badge={hasFilters ? activeFilterCount : undefined}>
//             <div className="flex flex-wrap items-center gap-2">

//               <div className="flex gap-0.5 p-0.5 rounded-lg bg-muted shrink-0">
//                 {QUARTERS.map((q) => (
//                   <button
//                     key={q.value}
//                     onClick={() => setQuarter(quarter === q.value ? null : q.value)}
//                     title={q.sub}
//                     className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
//                       quarter === q.value
//                         ? 'bg-card shadow-sm text-primary'
//                         : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
//                     }`}
//                   >
//                     {q.label}
//                     <span className="hidden sm:inline text-[10px] opacity-60 ml-1">{q.sub}</span>
//                   </button>
//                 ))}
//               </div>

//               <div className="h-6 w-px bg-border hidden sm:block" />

//               <div className="flex items-center gap-1.5 min-w-[150px] flex-1">
//                 <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
//                 <SearchableSelect options={employeeOptions} value={employeeId} onValueChange={setEmployeeId} placeholder="Employee" searchPlaceholder="Search employee…" className="h-8 text-sm" />
//               </div>
//               <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
//                 <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
//                 <SearchableSelect options={clientOptions} value={clientId} onValueChange={setClientId} placeholder="Client" searchPlaceholder="Search client…" className="h-8 text-sm" />
//               </div>
//               <div className="flex items-center gap-1.5 min-w-[150px] flex-1">
//                 <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
//                 <SearchableSelect options={servicePOOptions} value={servicePOId} onValueChange={setServicePOId} placeholder="Service PO" searchPlaceholder="Search PO…" className="h-8 text-sm" />
//               </div>

//               <AnimatePresence>
//                 {hasFilters && (
//                   <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-1.5 flex-wrap">
//                     {quarter && <Chip color="primary" icon={CalendarDays} label={`${QUARTERS.find((q) => q.value === quarter)?.label} · ${QUARTERS.find((q) => q.value === quarter)?.sub}`} onRemove={() => setQuarter(null)} />}
//                     {employeeId && <Chip color="violet" icon={Users} label={employeeOptions.find((e) => e.value === employeeId)?.label ?? 'Employee'} onRemove={() => setEmployeeId('')} />}
//                     {clientId && <Chip color="sky" icon={Building2} label={clientOptions.find((c) => c.value === clientId)?.label ?? 'Client'} onRemove={() => setClientId('')} />}
//                     {servicePOId && <Chip color="amber" icon={Briefcase} label={servicePOOptions.find((p) => p.value === servicePOId)?.label ?? 'Service PO'} onRemove={() => setServicePOId('')} />}
//                     <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
//                       <X className="h-3 w-3" /> Clear
//                     </button>
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>
//           </FilterPanel>
//         </div>
//       )}

//       </div>{/* end sticky zone */}

//       {/* ══ SCROLLABLE CONTENT ═══════════════════════════════════════════════ */}
//       <div className="space-y-5 pt-6">

//       {/* ══ QUARTERLY VIEW ═══════════════════════════════════════════════════ */}
//       {viewMode === 'quarterly' && (<>

//       {/* Insights strip */}
//       <AnimatePresence>
//         {(isAnalyticsPending || insights.length > 0) && (
//           <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
//             <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-wrap gap-3">
//               {isAnalyticsPending
//                 ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[58px] rounded-2xl flex-1 min-w-[180px]" />)
//                 : insights.map((ins, i) => <InsightCard key={i} {...ins} />)
//               }
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* ══ KPI TILES ════════════════════════════════════════════════════════ */}
//       <section>
//         <SectionLabel icon={Activity} title="Key Performance Indicators" />
//         <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
//           {KPI_CONFIG.map((cfg) => (
//             <KpiCard key={cfg.key} cfg={cfg} value={tiles[cfg.key]} isLoading={isAnalyticsPending} tiles={tiles} charts={charts} />
//           ))}
//         </motion.div>
//       </section>

//       {/* ══ MONTHLY TREND ════════════════════════════════════════════════════ */}
//       <section>
//         <SectionLabel icon={TrendingUp} title="Monthly Hours Trend" />
//         <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
//           <MonthlyHoursTrendChart data={trendData} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} quarter={quarter} />
//         </motion.div>
//       </section>

//       {/* ══ HOURS BY CLIENT & EMPLOYEE ═══════════════════════════════════════ */}
//       <section>
//         <SectionLabel icon={BarChart2} title="Hours Breakdown" />
//         <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
//           <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
//             <HoursByClientChart data={charts.hours_by_client ?? []} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} />
//           </motion.div>
//           <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
//             <HoursByEmployeeChart data={charts.hours_by_employee ?? []} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} />
//           </motion.div>
//         </div>
//       </section>

//       {/* ══ CLIENT × PO & BENCH ══════════════════════════════════════════════ */}
//       <section>
//         <SectionLabel icon={Users} title="Resource & Portfolio Analysis" />
//         <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
//           <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
//             <ClientPOMatrixChart data={charts.client_x_service_po ?? []} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} />
//           </motion.div>
//           <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
//             <EmployeeBenchChart data={charts.employee_bench_pct ?? []} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} />
//           </motion.div>
//         </div>
//       </section>

//       </>)}

//       {/* ══ MONTHLY VIEW ═════════════════════════════════════════════════════ */}
//       {viewMode === 'monthly' && (
//         <motion.div key="monthly-view" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-5">

//           {/* ── Monthly KPI Tiles ────────────────────────────────────────── */}
//           <section>
//             <SectionLabel
//               icon={Activity}
//               title="Monthly Summary"
//               action={
//                 <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
//                   {new Date(Number(year), Number(month) - 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' })}
//                 </span>
//               }
//             />
//             <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
//               {[
//                 { title: 'Total Hrs',   icon: Clock,       bar: 'bg-orange-500',  iconBg: 'bg-orange-50 dark:bg-orange-950/40',   iconColor: 'text-orange-500',  value: `${cNum(monthlyTiles.totalHours)} hrs`,  sub: `${cNum(monthlyTiles.billHours)} hrs billable` },
//                 { title: 'Billable',    icon: TrendingUp,  bar: 'bg-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', iconColor: 'text-emerald-600', value: `${cNum(monthlyTiles.billHours)} hrs`,   sub: `${monthlyTiles.utilPct.toFixed(1)}% utilization` },
//                 { title: 'Utilization', icon: Activity,    bar: 'bg-blue-500',    iconBg: 'bg-blue-50 dark:bg-blue-950/40',       iconColor: 'text-blue-500',    value: `${monthlyTiles.utilPct.toFixed(1)}%`,   sub: `${monthlyTiles.utilPct >= 80 ? '+' : ''}${(monthlyTiles.utilPct - 80).toFixed(1)}% vs 80%` },
//                 { title: 'Employees',   icon: Users,       bar: 'bg-violet-500',  iconBg: 'bg-violet-50 dark:bg-violet-950/40',   iconColor: 'text-violet-500',  value: String(monthlyTiles.activeEmployees),   sub: monthlyTiles.atRisk > 0 ? `${monthlyTiles.atRisk} at risk` : 'All productive' },
//                 { title: 'Leave Hrs',   icon: Calendar,    bar: 'bg-sky-500',     iconBg: 'bg-sky-50 dark:bg-sky-950/40',         iconColor: 'text-sky-500',     value: `${cNum(monthlyTiles.leaveHrs)} hrs`,   sub: monthlyTiles.totalHours > 0 ? `${((monthlyTiles.leaveHrs / monthlyTiles.totalHours) * 100).toFixed(1)}% of total` : '0% of total' },
//                 { title: 'Idle Hrs',    icon: AlertCircle, bar: 'bg-amber-500',   iconBg: 'bg-amber-50 dark:bg-amber-950/40',     iconColor: 'text-amber-500',   value: `${cNum(monthlyTiles.idleHrs)} hrs`,    sub: monthlyTiles.totalHours > 0 ? `${((monthlyTiles.idleHrs / monthlyTiles.totalHours) * 100).toFixed(1)}% non-billable` : '0% non-billable' },
//                 { title: 'Active POs',  icon: Briefcase,   bar: 'bg-indigo-500',  iconBg: 'bg-indigo-50 dark:bg-indigo-950/40',   iconColor: 'text-indigo-500',  value: String(monthlyTiles.activePOs),         sub: 'with hours this month' },
//               ].map((card) => (
//                 <motion.div key={card.title} variants={itemVariants} className="relative bg-card rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 group">
//                   <div className={`absolute inset-x-0 top-0 h-[3px] ${card.bar}`} />
//                   <div className="px-3 pt-4 pb-3">
//                     <div className="flex items-center justify-between gap-1 mb-2.5">
//                       <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none whitespace-nowrap">{card.title}</p>
//                       <div className={`p-1.5 rounded-lg shrink-0 ${card.iconBg} group-hover:scale-110 transition-transform duration-200`}>
//                         <card.icon className={`h-3.5 w-3.5 ${card.iconColor}`} />
//                       </div>
//                     </div>
//                     {isBillableAllPending
//                       ? <><Skeleton className="h-6 w-16" /><Skeleton className="h-3 w-20 mt-2" /></>
//                       : <>
//                           <p className="text-[18px] font-extrabold text-foreground leading-none tracking-tight">{card.value}</p>
//                           {card.sub && <p className="text-[10px] text-muted-foreground mt-1.5 leading-none truncate">{card.sub}</p>}
//                         </>
//                     }
//                   </div>
//                 </motion.div>
//               ))}
//             </motion.div>
//           </section>

//           {/* ── FY Context: trend + client/bench monthlyyyy ─────────────────────────── */}
//           {/* <section>
//             <SectionLabel
//               icon={TrendingUp}
//               title="Monthly Hours Trend"
//               action={
//                 <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
//                   FY {fiscalYear}–{String(fiscalYear + 1).slice(-2)} context
//                 </span>
//               }
//             />
//             <MonthlyHoursTrendChart
//               data={charts.monthly_hours_trend ?? []}
//               isLoading={isAnalyticsPending}
//               fiscalYear={fiscalYear}
//               quarter={null}
//             />
//           </section>

//           <section>
//             <SectionLabel
//               icon={BarChart2}
//               title="Hours by Client & Employee"
//               action={
//                 <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
//                   FY {fiscalYear}–{String(fiscalYear + 1).slice(-2)} context
//                 </span>
//               }
//             />
//             <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
//               <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
//                 <HoursByClientChart data={charts.hours_by_client ?? []} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} />
//               </motion.div>
//               <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
//                 <EmployeeBenchChart data={charts.employee_bench_pct ?? []} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} />
//               </motion.div>
//             </div>
//           </section> */}

//           {/* ── Month-specific panels ─────────────────────────────────────── */}
//           <section>
//             <SectionLabel
//               icon={Calendar}
//               title="Billable Breakdown"
//               action={
//                 <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
//                   Month-specific
//                 </span>
//               }
//             />
//             <BillableAnalyticsPanel
//               data={billableData?.data ?? []}
//               meta={billableData?.meta ?? {}}
//               isLoading={isBillablePending}
//               month={Number(month)}
//               year={Number(year)}
//               page={billablePage}
//               onPageChange={setBillablePage}
//             />
//           </section>

//           <section>
//             <SectionLabel
//               icon={Briefcase}
//               title="Top Employees by Service PO"
//               action={
//                 <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
//                   Month-specific
//                 </span>
//               }
//             />
//             <TopEmployeesByPOPanel
//               data={topPOData?.data ?? []}
//               isLoading={isTopPOPending}
//               month={Number(month)}
//               year={Number(year)}
//             />
//           </section>

//         </motion.div>
//       )}

//       </div>{/* end scrollable content */}
//     </div>
//   );
// };

// /* ─── Chip helper ────────────────────────────────────────────────────────── */
// const CHIP_STYLES = {
//   primary: 'bg-primary/10 text-primary border-primary/25 hover:bg-primary/20',
//   violet:  'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700',
//   sky:     'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-700',
//   amber:   'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700',
// };
// const Chip = ({ icon: Icon, label, onRemove, color }) => (
//   <motion.span
//     initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
//     className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold max-w-[220px] ${CHIP_STYLES[color] ?? CHIP_STYLES.primary}`}
//   >
//     <Icon className="h-3 w-3 shrink-0" />
//     <span className="truncate">{label}</span>
//     <button onClick={onRemove} className="ml-0.5 shrink-0 rounded-full p-0.5 transition-colors">
//       <X className="h-2.5 w-2.5" />
//     </button>
//   </motion.span>
// );

// export default Dashboard;


import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, DollarSign, TrendingUp, TrendingDown, Users, Building2, Briefcase,
  BarChart2, RefreshCw, X, ChevronDown, CalendarDays, AlertCircle,
  Activity, Zap, Award, Calendar,
} from 'lucide-react';
import {
  useEmployeeBillableBreakdown,
  useTopEmployeesByPO,
  useDashboardAnalytics,
  useDashboard,
} from '@/hooks/useDashboard';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useActiveClients } from '@/hooks/useClients';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import MonthlyHoursTrendChart from '@/components/charts/MonthlyHoursTrendChart';
import HoursByClientChart from '@/components/charts/HoursByClientChart';
import HoursByEmployeeChart from '@/components/charts/HoursByEmployeeChart';
import ClientPOMatrixChart from '@/components/charts/ClientPOMatrixChart';
import EmployeeBenchChart from '@/components/charts/EmployeeBenchChart';
import BillableAnalyticsPanel from '@/components/charts/BillableAnalyticsPanel';
import TopEmployeesByPOPanel from '@/components/charts/TopEmployeesByPOPanel';
import { Button } from '@/components/ui/button';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { formatCurrency, formatHours, formatDate } from '@/utils/formatters';

/* ─── constants ──────────────────────────────────────────────────────────── */
const now = new Date();
const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
const FY_OPTIONS = Array.from({ length: 5 }, (_, i) => currentFY - 2 + i).map((fy) => ({
  value: fy,
  label: `FY ${fy}–${String(fy + 1).slice(-2)}`,
}));

const QUARTERS = [
  { value: 1, label: 'Q1', sub: 'Apr–Jun' },
  { value: 2, label: 'Q2', sub: 'Jul–Sep' },
  { value: 3, label: 'Q3', sub: 'Oct–Dec' },
  { value: 4, label: 'Q4', sub: 'Jan–Mar' },
];
const QUARTER_MONTHS = { 1: [4, 5, 6], 2: [7, 8, 9], 3: [10, 11, 12], 4: [1, 2, 3] };

const QUARTER_STYLES = {
  active:   'bg-primary text-primary-foreground font-semibold shadow-sm',
  inactive: 'bg-background text-muted-foreground hover:text-foreground font-medium',
};

/* compact number: 1234 → "1.2k", 123456 → "1.2L" */
const cNum = (v) => {
  const n = Number(v) || 0;
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n * 10) / 10);
};

const KPI_CONFIG = [
  {
    key: 'total_hours', title: 'Total Hrs', icon: Clock,
    bar: 'bg-orange-500', iconBg: 'bg-orange-50 dark:bg-orange-950/40', iconColor: 'text-orange-500',
    fmt: (v) => `${cNum(v)} hrs`,
    sub: (t) => {
      const b = Number(t.total_hours || 0) * (Number(t.utilization_pct || 0) / 100);
      return `${cNum(b)} hrs billable`;
    },
  },
  {
    key: 'total_cost', title: 'Total Cost', icon: DollarSign,
    bar: 'bg-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', iconColor: 'text-emerald-600',
    fmt: (v) => `₹${cNum(v)}`,
    sub: (t) => {
      const hrs = Number(t.total_hours || 0);
      const cost = Number(t.total_cost || 0);
      return hrs > 0 ? `₹${Math.round(cost / hrs)}/hr avg` : null;
    },
  },
  {
    key: 'utilization_pct', title: 'Utilization', icon: Activity,
    bar: 'bg-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-950/40', iconColor: 'text-blue-500',
    fmt: (v) => `${Number(v).toFixed(1)}%`,
    sub: (t) => {
      const diff = (Number(t.utilization_pct || 0) - 80).toFixed(1);
      return `${diff >= 0 ? '+' : ''}${diff}% vs 80% target`;
    },
  },
  {
    key: 'active_employees', title: 'Employees', icon: Users,
    bar: 'bg-violet-500', iconBg: 'bg-violet-50 dark:bg-violet-950/40', iconColor: 'text-violet-500',
    fmt: (v) => cNum(v),
    sub: (_, c) => {
      const bench = (c.employee_bench_pct ?? []).filter((e) => e.bench_pct > 0).length;
      return bench > 0 ? `${bench} on bench` : 'All productive';
    },
  },
  {
    key: 'active_clients', title: 'Clients', icon: Building2,
    bar: 'bg-cyan-500', iconBg: 'bg-cyan-50 dark:bg-cyan-950/40', iconColor: 'text-cyan-500',
    fmt: (v) => cNum(v),
    sub: (_, c) => {
      const top = (c.hours_by_client ?? [])[0];
      return top ? `Top: ${top.client_name.split(' ').slice(0, 2).join(' ')}` : null;
    },
  },
  {
    key: 'active_service_pos', title: 'Service POs', icon: Briefcase,
    bar: 'bg-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-950/40', iconColor: 'text-amber-500',
    fmt: (v) => cNum(v),
    sub: (_, c) => {
      const active = new Set((c.client_x_service_po ?? []).filter((r) => r.hours > 0).map((r) => r.service_po_id)).size;
      return active > 0 ? `${active} with hours` : null;
    },
  },
  {
    key: 'avg_hours_per_employee', title: 'Avg Hrs/Emp', icon: BarChart2,
    bar: 'bg-indigo-500', iconBg: 'bg-indigo-50 dark:bg-indigo-950/40', iconColor: 'text-indigo-500',
    fmt: (v) => `${cNum(v)} hrs`,
    sub: (t) => `≈ ${(Number(t.avg_hours_per_employee || 0) / 8).toFixed(1)} work days`,
  },
];

/* ─── sub-components ─────────────────────────────────────────────────────── */
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22 } },
};
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};

const KpiCard = ({ cfg, value, isLoading, tiles, charts }) => {
  const subText = !isLoading && cfg.sub ? cfg.sub(tiles, charts) : null;
  return (
    <motion.div
      variants={itemVariants}
      className="relative bg-card rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 group"
    >
      <div className={`absolute inset-x-0 top-0 h-[3px] ${cfg.bar}`} />
      <div className="px-3 pt-4 pb-3">
        <div className="flex items-center justify-between gap-1 mb-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none whitespace-nowrap">{cfg.title}</p>
          <div className={`p-1.5 rounded-lg shrink-0 ${cfg.iconBg} group-hover:scale-110 transition-transform duration-200`}>
            <cfg.icon className={`h-3.5 w-3.5 ${cfg.iconColor}`} />
          </div>
        </div>
        {isLoading
          ? <><Skeleton className="h-6 w-16" /><Skeleton className="h-3 w-20 mt-2" /></>
          : <>
              <p className="text-[18px] font-extrabold text-foreground leading-none tracking-tight">{cfg.fmt(value ?? 0)}</p>
              {subText && <p className="text-[10px] text-muted-foreground mt-1.5 leading-none truncate">{subText}</p>}
            </>
        }
      </div>
    </motion.div>
  );
};

const InsightCard = ({ icon: Icon, label, sub, type, isLoading }) => {
  const styles = {
    success: { card: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800', icon: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400', text: 'text-emerald-800 dark:text-emerald-300', sub: 'text-emerald-600/80 dark:text-emerald-400/70' },
    warning: { card: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800',   icon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',   text: 'text-amber-800 dark:text-amber-300',   sub: 'text-amber-600/80 dark:text-amber-400/70' },
    danger:  { card: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',           icon: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',           text: 'text-red-800 dark:text-red-300',       sub: 'text-red-600/80 dark:text-red-400/70' },
    info:    { card: 'bg-sky-50 border-sky-200 dark:bg-sky-950/20 dark:border-sky-800',           icon: 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400',           text: 'text-sky-800 dark:text-sky-300',       sub: 'text-sky-600/80 dark:text-sky-400/70' },
  };
  const s = styles[type] ?? styles.info;

  if (isLoading) return <Skeleton className="h-16 rounded-2xl flex-1" />;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          variants={itemVariants}
          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 flex-1 min-w-[200px] cursor-default ${s.card}`}
        >
          <div className={`p-2 rounded-xl shrink-0 ${s.icon}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-bold leading-tight truncate ${s.text}`}>{label}</p>
            <p className={`text-xs mt-0.5 leading-tight truncate ${s.sub}`}>{sub}</p>
          </div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[260px] text-xs">
        <p className="font-semibold">{label}</p>
        {sub && <p className="text-muted-foreground mt-0.5">{sub}</p>}
      </TooltipContent>
    </Tooltip>
  );
};

const SectionLabel = ({ icon: Icon, title, action }) => (
  <div className="flex items-center gap-3 mb-4">
    <div className="flex items-center gap-2 shrink-0">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <h2 className="text-sm font-bold text-foreground tracking-tight">{title}</h2>
    </div>
    <div className="h-px flex-1 bg-border" />
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

const FilterPanel = ({ open, onToggle, children, badge }) => (
  <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-primary/[0.06] via-primary/[0.03] to-transparent hover:from-primary/[0.10] hover:via-primary/[0.05] transition-all duration-200 text-left group"
    >
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
          <CalendarDays className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Filters & Period</span>
        {badge && (
          <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-[10px] font-bold">
            {badge} active
          </span>
        )}
      </div>
      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:text-primary ${open ? '' : '-rotate-90'}`} />
    </button>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="fp"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          style={{ overflow: 'hidden' }}
        >
          <div className="border-t bg-gradient-to-b from-muted/30 to-transparent px-4 py-3">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

/* ─── Dashboard ──────────────────────────────────────────────────────────── */
const Dashboard = () => {
  const [fiscalYear, setFiscalYear]           = useState(currentFY);
  const [bottomMonthYear, setBottomMonthYear] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [quarter, setQuarter]                 = useState(null);
  const [employeeId, setEmployeeId]           = useState('');
  const [clientId, setClientId]               = useState('');
  const [servicePOId, setServicePOId]         = useState('');
  const [billablePage, setBillablePage]       = useState(1);
  const [filtersOpen, setFiltersOpen]         = useState(true);
  const [viewMode, setViewMode]               = useState('quarterly');
  const [headerVisible, setHeaderVisible]     = useState(true);

  const headerRef = useRef(null);
  const outerRef  = useRef(null);

  useEffect(() => {
    // Use closest('main') — the definitive scroll container per MainLayout
    const scrollEl = outerRef.current?.closest('main') ?? document.documentElement;
    let lastChangeY = 0;
    let visible = true;

    const onScroll = () => {
      const y = scrollEl.scrollTop;
      if (visible && y > lastChangeY + 60 && y > 80) {
        setHeaderVisible(false);
        visible = false;
        lastChangeY = y;
      } else if (!visible && y < lastChangeY - 20) {
        setHeaderVisible(true);
        visible = true;
        lastChangeY = y;
      }
    };

    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, []);

  const month = String(bottomMonthYear.month);
  const year  = String(bottomMonthYear.year);

  const analyticsParams = {
    fiscalYear,
    ...(quarter     && { quarter }),
    ...(employeeId  && { employeeId }),
    ...(clientId    && { clientId }),
    ...(servicePOId && { poId: servicePOId }),
  };

  const { data: analyticsData, isPending: isAnalyticsPending, refetch, isFetching, dataUpdatedAt } =
    useDashboardAnalytics(analyticsParams);

  // Monthly Summary tiles — sourced from /dashboard/stats
  const { data: statsData, isPending: isStatsPending } =
    useDashboard({ month: Number(month), year: Number(year) });

  const { data: topPOData,    isPending: isTopPOPending }    = useTopEmployeesByPO({ month: Number(month), year: Number(year), limit: 100 });
  const { data: billableData, isPending: isBillablePending } = useEmployeeBillableBreakdown({ month: Number(month), year: Number(year), limit: 12, page: billablePage });
  const { data: employeesData } = useActiveEmployees();
  const { data: clientsData }   = useActiveClients();
  const { data: servicePOsData }= useActiveServicePOs();

  const tiles  = analyticsData?.tiles  ?? {};
  const charts = analyticsData?.charts ?? {};

  const trendData = useMemo(() => {
    const raw = charts.monthly_hours_trend ?? [];
    if (!quarter) return raw;
    return raw.filter((d) => (QUARTER_MONTHS[quarter] ?? []).includes(d.month));
  }, [charts.monthly_hours_trend, quarter]);

  const monthlyTiles = useMemo(() => {
    const cm = statsData?.current_month ?? {};
    const wf = statsData?.workforce     ?? {};
    const pf = statsData?.portfolio     ?? {};
    const totalHours   = Number(cm.total_hours_logged ?? 0);
    const billHours    = Number(cm.billable_hours_logged ?? 0);
    const nonBillHours = Number(cm.non_billable_hours_logged ?? 0);
    const utilRaw      = Number(cm.overall_utilisation_pct ?? 0);
    return {
      totalHours,
      billHours,
      nonBillHours,
      utilPct: utilRaw > 0 ? utilRaw : (totalHours > 0 ? (billHours / totalHours) * 100 : 0),
      activeEmployees: Number(wf.active_employees ?? 0),
      totalEmployees:  Number(wf.total_employees ?? 0),
      totalClients:    Number(pf.total_clients ?? 0),
      activePOs:       Number(pf.active_pos ?? 0),
      totalPOs:        Number(pf.total_pos ?? 0),
    };
  }, [statsData]);

  const employeeOptions  = (employeesData?.data  ?? employeesData  ?? []).map((e) => ({ value: String(e.employee_id ?? e.id),    label: e.full_name ?? `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() }));
  const clientOptions    = (clientsData?.data    ?? clientsData    ?? []).map((c) => ({ value: String(c.client_id  ?? c.id),    label: c.client_name  ?? c.name }));
  const servicePOOptions = (servicePOsData?.data ?? servicePOsData ?? []).map((p) => ({ value: String(p.service_po_id ?? p.id), label: p.service_po_name ?? p.name }));

  const hasFilters = !!(quarter || employeeId || clientId || servicePOId);
  const activeFilterCount = [quarter, employeeId, clientId, servicePOId].filter(Boolean).length;

  const clearFilters = () => { setQuarter(null); setEmployeeId(''); setClientId(''); setServicePOId(''); };

  /* ── insights ── */
  const insights = useMemo(() => {
    if (isAnalyticsPending) return [];
    const list = [];
    const util = Number(tiles.utilization_pct ?? 0);
    if (util > 0) {
      list.push(util >= 80
        ? { type: 'success', icon: Zap,          label: `${util.toFixed(1)}% Utilization`,      sub: 'On track · Above 80% target' }
        : util >= 60
          ? { type: 'warning', icon: TrendingDown, label: `${util.toFixed(1)}% Utilization`,    sub: 'Below 80% target · Improve allocation' }
          : { type: 'danger',  icon: TrendingDown, label: `${util.toFixed(1)}% Utilization`,    sub: 'Critical · Well below 80% target' }
      );
    }
    const benchData     = charts.employee_bench_pct ?? [];
    const critical      = benchData.filter((e) => e.bench_pct >= 75).length;
    const onBench       = benchData.filter((e) => e.bench_pct >= 25).length;
    if (critical > 0) list.push({ type: 'danger',  icon: AlertCircle, label: `${critical} Critical Bench`,      sub: 'Bench ≥75% · Needs immediate action' });
    else if (onBench > 0) list.push({ type: 'warning', icon: Users,   label: `${onBench} Employee${onBench > 1 ? 's' : ''} on Bench`, sub: 'Bench >25% · Monitor allocation' });
    else if (benchData.length > 0) list.push({ type: 'success', icon: Award, label: 'All Employees Productive', sub: 'No significant bench hours detected' });
    const topClient = (charts.hours_by_client ?? [])[0];
    if (topClient) list.push({ type: 'info', icon: Building2, label: topClient.client_name, sub: `Top client · ${topClient.hours.toLocaleString('en-IN')} hrs logged` });
    const topEmp = [...(charts.hours_by_employee ?? [])].sort((a, b) => (b.billable_hours ?? 0) - (a.billable_hours ?? 0))[0];
    if (topEmp) list.push({ type: 'info', icon: Users, label: topEmp.full_name, sub: `Top contributor · ${(topEmp.billable_hours ?? 0).toLocaleString('en-IN')} billable hrs` });
    return list.slice(0, 4);
  }, [isAnalyticsPending, tiles, charts]);

  const lastUpdated = dataUpdatedAt ? formatDate(new Date(dataUpdatedAt), 'DD MMM YYYY, hh:mm A') : null;
  const fyLabel = `FY ${fiscalYear}–${String(fiscalYear + 1).slice(-2)}`;

  return (
    <div className="-mt-6 pb-8" ref={outerRef} id="dashboard-root">

      {/* ══ STICKY ZONE ══════════════════════════════════════════════════════ */}
      <div
        ref={headerRef}
        className="sticky top-0 z-20 -mx-6 px-6 bg-background/95 backdrop-blur-sm border-b shadow-sm"
        style={{
          transform: headerVisible ? 'translateY(0)' : 'translateY(-110%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}
      >

      {/* ══ PAGE HEADER ══════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-3">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BarChart2 className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">Analytics Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-0.5">
            Resource utilization & workforce analytics ·{' '}
            <span className="font-semibold text-foreground">{fyLabel}</span>
            {lastUpdated && <span className="ml-2 text-xs">· Updated {lastUpdated}</span>}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {/* View mode toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-muted border">
            {[
              { mode: 'quarterly', icon: BarChart2, label: 'Quarterly', active: 'bg-card shadow-sm text-blue-600 dark:text-blue-400' },
              { mode: 'monthly',   icon: Calendar,  label: 'Monthly',   active: 'bg-card shadow-sm text-purple-600 dark:text-purple-400' },
            ].map(({ mode, icon: Icon, label, active }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                  viewMode === mode ? active : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {/* Contextual date picker */}
          {viewMode === 'quarterly' ? (
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
              className="h-9 rounded-xl border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-medium w-36"
            >
              {FY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <MonthYearPicker
              value={bottomMonthYear}
              onChange={(v) => { if (v) { setBottomMonthYear(v); setBillablePage(1); } }}
              clearable={false}
              className="w-36 h-9 text-sm"
            />
          )}

          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-9 rounded-xl gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>{/* end page header */}

      {/* Filter panel inside sticky — quarterly only */}
      {viewMode === 'quarterly' && (
        <div className="pb-2">
          <FilterPanel open={filtersOpen} onToggle={() => setFiltersOpen((p) => !p)} badge={hasFilters ? activeFilterCount : undefined}>
            <div className="flex flex-wrap items-center gap-2">

              <div className="flex items-center bg-background border border-input shadow-sm rounded-xl p-1 gap-0.5 shrink-0">
                {QUARTERS.map((q) => (
                  <button
                    key={q.value}
                    onClick={() => setQuarter(quarter === q.value ? null : q.value)}
                    className={`px-3 py-1 rounded-lg text-xs transition-all duration-150 whitespace-nowrap ${
                      quarter === q.value ? QUARTER_STYLES.active : QUARTER_STYLES.inactive
                    }`}
                  >
                    {q.label}
                    <span className={`ml-1 text-[10px] ${quarter === q.value ? 'opacity-60' : 'opacity-50'}`}>{q.sub}</span>
                  </button>
                ))}
              </div>

              <div className="h-6 w-px bg-border hidden sm:block" />

              <div className="flex items-center gap-1.5 min-w-[150px] flex-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SearchableSelect options={employeeOptions} value={employeeId} onValueChange={setEmployeeId} placeholder="Employee" searchPlaceholder="Search employee…" className="h-8 text-sm" />
              </div>
              <div className="flex items-center gap-1.5 min-w-[140px] flex-1">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SearchableSelect options={clientOptions} value={clientId} onValueChange={setClientId} placeholder="Client" searchPlaceholder="Search client…" className="h-8 text-sm" />
              </div>
              <div className="flex items-center gap-1.5 min-w-[150px] flex-1">
                <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SearchableSelect options={servicePOOptions} value={servicePOId} onValueChange={setServicePOId} placeholder="Service PO" searchPlaceholder="Search PO…" className="h-8 text-sm" />
              </div>

              <AnimatePresence>
                {hasFilters && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="flex items-center gap-1.5 flex-wrap">
                    {quarter && <Chip color="primary" icon={CalendarDays} label={`${QUARTERS.find((q) => q.value === quarter)?.label} · ${QUARTERS.find((q) => q.value === quarter)?.sub}`} onRemove={() => setQuarter(null)} />}
                    {employeeId && <Chip color="violet" icon={Users} label={employeeOptions.find((e) => e.value === employeeId)?.label ?? 'Employee'} onRemove={() => setEmployeeId('')} />}
                    {clientId && <Chip color="sky" icon={Building2} label={clientOptions.find((c) => c.value === clientId)?.label ?? 'Client'} onRemove={() => setClientId('')} />}
                    {servicePOId && <Chip color="amber" icon={Briefcase} label={servicePOOptions.find((p) => p.value === servicePOId)?.label ?? 'Service PO'} onRemove={() => setServicePOId('')} />}
                    <button onClick={clearFilters} className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <X className="h-3 w-3" /> Clear
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FilterPanel>
        </div>
      )}

      </div>{/* end sticky zone */}

      {/* ══ SCROLLABLE CONTENT ═══════════════════════════════════════════════ */}
      <div className="space-y-5 pt-6">

      {/* ══ QUARTERLY VIEW ═══════════════════════════════════════════════════ */}
      {viewMode === 'quarterly' && (<>

      {/* Insights strip */}
      <AnimatePresence>
        {(isAnalyticsPending || insights.length > 0) && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-wrap gap-3">
              {isAnalyticsPending
                ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[58px] rounded-2xl flex-1 min-w-[180px]" />)
                : insights.map((ins, i) => <InsightCard key={i} {...ins} />)
              }
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ KPI TILES ════════════════════════════════════════════════════════ */}
      <section>
        <SectionLabel icon={Activity} title="Key Performance Indicators" />
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
          {KPI_CONFIG.map((cfg) => (
            <KpiCard key={cfg.key} cfg={cfg} value={tiles[cfg.key]} isLoading={isAnalyticsPending} tiles={tiles} charts={charts} />
          ))}
        </motion.div>
      </section>

      {/* ══ MONTHLY TREND ════════════════════════════════════════════════════ */}
      <section>
        <SectionLabel icon={TrendingUp} title="Monthly Hours Trend" />
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <MonthlyHoursTrendChart data={trendData} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} quarter={quarter} />
        </motion.div>
      </section>

      {/* ══ HOURS BY CLIENT & EMPLOYEE ═══════════════════════════════════════ */}
      <section>
        <SectionLabel icon={BarChart2} title="Hours Breakdown" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <HoursByClientChart data={charts.hours_by_client ?? []} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
            <HoursByEmployeeChart data={charts.hours_by_employee ?? []} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} />
          </motion.div>
        </div>
      </section>

      {/* ══ CLIENT × PO & BENCH ══════════════════════════════════════════════ */}
      <section>
        <SectionLabel icon={Users} title="Resource & Portfolio Analysis" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <ClientPOMatrixChart data={charts.client_x_service_po ?? []} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} />
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
            <EmployeeBenchChart data={charts.employee_bench_pct ?? []} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} />
          </motion.div>
        </div>
      </section>

      </>)}

      {/* ══ MONTHLY VIEW ═════════════════════════════════════════════════════ */}
      {viewMode === 'monthly' && (
        <motion.div key="monthly-view" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="space-y-5">

          {/* ── Monthly KPI Tiles ────────────────────────────────────────── */}
          <section>
            <SectionLabel
              icon={Activity}
              title="Monthly Summary"
              action={
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  {new Date(Number(year), Number(month) - 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              }
            />
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7">
              {[
                { title: 'Total Hrs',       icon: Clock,       bar: 'bg-orange-500',  iconBg: 'bg-orange-50 dark:bg-orange-950/40',   iconColor: 'text-orange-500',  value: `${cNum(monthlyTiles.totalHours)} hrs`,     sub: null },
                { title: 'Billable Hrs',    icon: TrendingUp,  bar: 'bg-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', iconColor: 'text-emerald-600', value: `${cNum(monthlyTiles.billHours)} hrs`,      sub: monthlyTiles.totalHours > 0 ? `${((monthlyTiles.billHours / monthlyTiles.totalHours) * 100).toFixed(1)}% of total` : null },
                { title: 'Non-Billable',    icon: AlertCircle, bar: 'bg-amber-500',   iconBg: 'bg-amber-50 dark:bg-amber-950/40',     iconColor: 'text-amber-500',   value: `${cNum(monthlyTiles.nonBillHours)} hrs`,   sub: monthlyTiles.totalHours > 0 ? `${((monthlyTiles.nonBillHours / monthlyTiles.totalHours) * 100).toFixed(1)}% of total` : null },
                { title: 'Utilization',     icon: Activity,    bar: 'bg-blue-500',    iconBg: 'bg-blue-50 dark:bg-blue-950/40',       iconColor: 'text-blue-500',    value: `${monthlyTiles.utilPct.toFixed(1)}%`,      sub: `${monthlyTiles.utilPct >= 80 ? '+' : ''}${(monthlyTiles.utilPct - 80).toFixed(1)}% vs 80%` },
                { title: 'Employees',       icon: Users,       bar: 'bg-violet-500',  iconBg: 'bg-violet-50 dark:bg-violet-950/40',   iconColor: 'text-violet-500',  value: String(monthlyTiles.activeEmployees),       sub: `of ${monthlyTiles.totalEmployees} total` },
                { title: 'Clients',         icon: Building2,   bar: 'bg-cyan-500',    iconBg: 'bg-cyan-50 dark:bg-cyan-950/40',       iconColor: 'text-cyan-500',    value: String(monthlyTiles.totalClients),          sub: null },
                { title: 'Active POs',      icon: Briefcase,   bar: 'bg-indigo-500',  iconBg: 'bg-indigo-50 dark:bg-indigo-950/40',   iconColor: 'text-indigo-500',  value: String(monthlyTiles.activePOs),             sub: `of ${monthlyTiles.totalPOs} total` },
              ].map((card) => (
                <motion.div key={card.title} variants={itemVariants} className="relative bg-card rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 group">
                  <div className={`absolute inset-x-0 top-0 h-[3px] ${card.bar}`} />
                  <div className="px-3 pt-4 pb-3">
                    <div className="flex items-center justify-between gap-1 mb-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground leading-none whitespace-nowrap">{card.title}</p>
                      <div className={`p-1.5 rounded-lg shrink-0 ${card.iconBg} group-hover:scale-110 transition-transform duration-200`}>
                        <card.icon className={`h-3.5 w-3.5 ${card.iconColor}`} />
                      </div>
                    </div>
                    {isStatsPending
                      ? <><Skeleton className="h-6 w-16" /><Skeleton className="h-3 w-20 mt-2" /></>
                      : <>
                          <p className="text-[18px] font-extrabold text-foreground leading-none tracking-tight">{card.value}</p>
                          {card.sub && <p className="text-[10px] text-muted-foreground mt-1.5 leading-none truncate">{card.sub}</p>}
                        </>
                    }
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* ── Month-specific panels ─────────────────────────────────────── */}
          <section>
            <SectionLabel
              icon={Calendar}
              title="Billable Breakdown"
              action={
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  Month-specific
                </span>
              }
            />
            <BillableAnalyticsPanel
              data={billableData?.data ?? []}
              meta={billableData?.meta ?? {}}
              isLoading={isBillablePending}
              month={Number(month)}
              year={Number(year)}
              page={billablePage}
              onPageChange={setBillablePage}
            />
          </section>

          <section>
            <SectionLabel
              icon={Briefcase}
              title="Top Employees by Service PO"
              action={
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  Month-specific
                </span>
              }
            />
            <TopEmployeesByPOPanel
              data={topPOData?.data ?? []}
              isLoading={isTopPOPending}
              month={Number(month)}
              year={Number(year)}
            />
          </section>

        </motion.div>
      )}

      </div>{/* end scrollable content */}
    </div>
  );
};

/* ─── Chip helper ────────────────────────────────────────────────────────── */
const CHIP_STYLES = {
  primary: 'bg-primary/10 text-primary border-primary/25 hover:bg-primary/20',
  violet:  'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-700',
  sky:     'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-700',
  amber:   'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700',
};
const Chip = ({ icon: Icon, label, onRemove, color }) => (
  <motion.span
    initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold max-w-[220px] ${CHIP_STYLES[color] ?? CHIP_STYLES.primary}`}
  >
    <Icon className="h-3 w-3 shrink-0" />
    <span className="truncate">{label}</span>
    <button onClick={onRemove} className="ml-0.5 shrink-0 rounded-full p-0.5 transition-colors">
      <X className="h-2.5 w-2.5" />
    </button>
  </motion.span>
);

export default Dashboard;