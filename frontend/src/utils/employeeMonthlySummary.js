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

// `hierarchy_node_id` is the field name the existing Add/Edit Work Log entry form
// (WorkLogEntryModal) already sends for a hierarchy node — matching it here so a leaf row's
// edit lands on the same field the rest of the app uses, not a name invented for this table.
export const buildEntryPayload = (row, hours, date) => ({
  service_po_id: row.servicePOId,
  sub_project_id: null,
  ...(row.hierarchyId != null && { hierarchy_node_id: row.hierarchyId }),
  hours,
  description: row.label ?? 'Logged via Monthly Summary',
  timesheet_date: date,
});
