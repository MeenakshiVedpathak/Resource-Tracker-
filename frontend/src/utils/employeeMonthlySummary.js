// GET /employee-timesheets/monthly-summary now returns one entry per calendar day, each
// listing every mapped Service PO with its own hours plus a nested Parent/Child hierarchy
// breakdown (the same hierarchy_id/PARENT/CHILD nodes the "Manage Hierarchy" drawer edits):
//   [{ date, service_pos: [{ service_po_id, service_po_name, hours, po_total_hrs, children }] }]
// This flattens that into the row-per-node shape SummaryTable renders: one row per Service PO
// plus one row per nested hierarchy node, each carrying its own `hoursByDay` (keyed by day
// number), a `depth` for indentation (0 = Service PO, 1 = Parent node, 2 = Child node, ...),
// and a `rowKey` + `ancestorKeys` pair the table uses to collapse/expand a subtree.
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

// A hierarchy node's own `hours` plus every descendant's own hours, for one day — the backend
// already rolls this up as `po_total_hrs` on the Service PO itself, but nested Parent/Child
// nodes only carry their own hours, so an intermediate Parent needs it computed here.
const rollupDay = (node, day) => {
  let sum = node.hoursByDay[day] || 0;
  node.childMap.forEach((child) => { sum += rollupDay(child, day); });
  return sum;
};

// A node with no breakdown of its own is a real leaf — hours logged there map 1:1 to a work
// log entry, so it's editable. A node with children is purely an aggregate (its cell is a
// rollup of what's beneath it), so it stays read-only at every depth, not just depth 0.
const flattenChildren = (childMap, depth, days, servicePOId, ancestorKeys) => {
  const rows = [];
  childMap.forEach((node, hierarchyId) => {
    const hasChildren = node.childMap.size > 0;
    const hoursByDay = {};
    days.forEach((day) => {
      hoursByDay[day] = hasChildren ? rollupDay(node, day) : (node.hoursByDay[day] || 0);
    });
    const rowKey = `h:${hierarchyId}`;
    rows.push({
      servicePOId, hierarchyId, label: node.name, depth, hasChildren, editable: !hasChildren, hoursByDay, rowKey, ancestorKeys,
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
      poNode.poTotalByDay ??= {};
      poNode.poTotalByDay[day] = Number(po.po_total_hrs || 0);
      walkChildren(po.children, poNode.childMap, day);
    });
  });

  const dayList = [...days].sort((a, b) => a - b);
  const rows = [];
  poMap.forEach((node, servicePOId) => {
    const hasChildren = node.childMap.size > 0;
    const hoursByDay = {};
    dayList.forEach((day) => {
      hoursByDay[day] = hasChildren ? (node.poTotalByDay[day] ?? 0) : (node.hoursByDay[day] || 0);
    });
    const rowKey = `po:${servicePOId}`;
    rows.push({
      servicePOId, label: node.name, depth: 0, hasChildren, editable: !hasChildren, hoursByDay, rowKey, ancestorKeys: [],
    });
    rows.push(...flattenChildren(node.childMap, 1, dayList, servicePOId, [rowKey]));
  });
  return rows;
};
