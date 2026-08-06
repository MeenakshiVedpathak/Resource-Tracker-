// GET /employee-timesheets/monthly-summary now returns one entry per calendar day, each
// listing every mapped Service PO with its own hours plus a nested Parent/Child hierarchy
// breakdown (the same hierarchy_id/PARENT/CHILD nodes the "Manage Hierarchy" drawer edits):
//   [{ date, service_pos: [{ service_po_id, service_po_name, hours, po_total_hrs, children }] }]
// This flattens that into the row-per-node shape SummaryTable renders: one row per Service PO
// plus one row per nested hierarchy node, each carrying its own `hoursByDay` (keyed by day
// number), a `depth` for indentation (0 = Service PO, 1 = Parent node, 2 = Child node, ...),
// and a `rowKey` + `ancestorKeys` pair the table uses to collapse/expand a subtree.
//
// A Service PO (or a Parent hierarchy node) can carry its own directly-logged hours *and* have
// a breakdown underneath it at the same time (e.g. a PARENT node itself had 3 hours logged on
// one day, on top of whatever its CHILD nodes logged) — `hours` is never just a placeholder
// that becomes 0 once children exist. So every node is editable for its own hours regardless of
// whether it `hasChildren`.
const dayNumberOf = (dateStr) => Number(dateStr.slice(-2));

const ensureNode = (map, key, name) => {
  if (!map.has(key)) map.set(key, { name, hoursByDay: {}, childMap: new Map() });
  return map.get(key);
};

const walkChildren = (children = [], parentChildMap, day) => {
  children.forEach((child) => {
    const node = ensureNode(parentChildMap, child.hierarchy_id, child.name);
    node.hoursByDay[day] = Number(child.hours || 0);
    walkChildren(child.children, node.childMap, day);
  });
};

const flattenChildren = (childMap, depth, days, servicePOId, ancestorKeys) => {
  const rows = [];
  childMap.forEach((node, hierarchyId) => {
    const hasChildren = node.childMap.size > 0;
    const hoursByDay = {};
    days.forEach((day) => { hoursByDay[day] = node.hoursByDay[day] || 0; });
    const rowKey = `h:${hierarchyId}`;
    rows.push({
      servicePOId, hierarchyId, label: node.name, depth, hasChildren, editable: true, hoursByDay, rowKey, ancestorKeys,
    });
    rows.push(...flattenChildren(node.childMap, depth + 1, days, servicePOId, [...ancestorKeys, rowKey]));
  });
  return rows;
};

export const buildMonthlySummaryRows = (dayEntries = []) => {
  const poMap = new Map();
  const days = new Set();

  dayEntries.forEach(({ date, service_pos = [] }) => {
    const day = dayNumberOf(date);
    days.add(day);
    service_pos.forEach((po) => {
      const poNode = ensureNode(poMap, po.service_po_id, po.service_po_name);
      poNode.hoursByDay[day] = Number(po.hours || 0);
      walkChildren(po.children, poNode.childMap, day);
    });
  });

  const dayList = [...days].sort((a, b) => a - b);
  const rows = [];
  poMap.forEach((node, servicePOId) => {
    const hasChildren = node.childMap.size > 0;
    const hoursByDay = {};
    dayList.forEach((day) => { hoursByDay[day] = node.hoursByDay[day] || 0; });
    const rowKey = `po:${servicePOId}`;
    rows.push({
      servicePOId, label: node.name, depth: 0, hasChildren, editable: true, hoursByDay, rowKey, ancestorKeys: [],
    });
    rows.push(...flattenChildren(node.childMap, 1, dayList, servicePOId, [rowKey]));
  });
  return rows;
};

// Month View — { service_pos: [{ service_po_id, service_po_name, hours, children }], total_hours }.
// Same Parent/Child hierarchy shape as Day View's per-day nodes, just one aggregate for the whole
// month instead of per-day. Every node's `hours` is already rolled up server-side (a PARENT's
// hours already include its Children's), so this only flattens the tree into row-per-node for
// the expandable table — it never re-sums or re-derives a total.
const flattenMonthHierarchy = (nodes = [], depth, ancestorKeys) => {
  const rows = [];
  nodes.forEach((node) => {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const rowKey = `h:${node.hierarchy_id}`;
    rows.push({
      rowKey, label: node.name, depth, hasChildren, hours: Number(node.hours || 0), ancestorKeys,
    });
    rows.push(...flattenMonthHierarchy(node.children, depth + 1, [...ancestorKeys, rowKey]));
  });
  return rows;
};

export const buildMonthlySummaryMonthRows = (data) => {
  const servicePos = data?.service_pos ?? [];
  const rows = [];
  servicePos.forEach((po) => {
    const hasChildren = (po.children?.length ?? 0) > 0;
    const rowKey = `po:${po.service_po_id}`;
    rows.push({
      rowKey, label: po.service_po_name, depth: 0, hasChildren, hours: Number(po.hours || 0), ancestorKeys: [],
    });
    rows.push(...flattenMonthHierarchy(po.children, 1, [rowKey]));
  });
  return rows;
};

// POST /employee-timesheets/entries is a whole-day replace: any existing row for the date not
// present in `entries` gets deleted server-side. So the payload for one date must carry every
// row that should survive — edited cells overlaid on top of each row's already-loaded
// `hoursByDay[day]` — not just the cells the user touched this session. Rows at 0 hours are
// left out entirely; omitting a row has the same clearing effect as sending it with hours: 0.
export const buildDayEntries = (rows, day, edits) =>
  rows
    .map((row) => {
      const edited = edits?.[row.rowKey]?.[day];
      const hours = edited !== undefined ? Number(edited || 0) : Number(row.hoursByDay?.[day] ?? 0);
      return { row, hours };
    })
    .filter(({ hours }) => hours > 0)
    .map(({ row, hours }) => ({
      service_po_id: row.servicePOId,
      hierarchy_node_id: row.hierarchyId ?? null,
      hours,
      description: row.label ?? 'Logged via Monthly Summary',
    }));

// Mirrors the two 400s the server enforces on a whole-day save, so the user sees the same
// wording without a round trip. Returns the error string, or null if the day is valid.
export const validateDayEntries = (entries, dateLabel, dailyHoursCap) => {
  const seen = new Set();
  for (const entry of entries) {
    const key = `${entry.service_po_id}:${entry.hierarchy_node_id ?? 'null'}`;
    if (seen.has(key)) {
      const nodePart = entry.hierarchy_node_id != null ? ` / hierarchy node #${entry.hierarchy_node_id}` : '';
      return `Duplicate entry for Service PO #${entry.service_po_id}${nodePart} in the same request.`;
    }
    seen.add(key);
  }

  const total = entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
  if (total > dailyHoursCap) {
    return `Total hours for ${dateLabel} cannot exceed ${dailyHoursCap}. This request totals ${total} hours.`;
  }

  return null;
};
