// Orders a flat list of BU master rows (company_name / parent_business_unit_id) as a hierarchy —
// each Parent BU followed by its Sub-BUs (depth 1) — so a MultiSelect can show them indented.
// A Sub-BU whose Parent isn't in `companies` (filtered out / not visible) is kept as a top-level row.
export const toHierarchicalBuOptions = (companies = []) => {
  const ids = new Set(companies.map((c) => String(c.id)));
  const childrenByParent = new Map();
  const roots = [];
  companies.forEach((c) => {
    const parentId = c.parent_business_unit_id ?? c.parent?.id;
    if (parentId != null && ids.has(String(parentId))) {
      const key = String(parentId);
      if (!childrenByParent.has(key)) childrenByParent.set(key, []);
      childrenByParent.get(key).push(c);
    } else {
      roots.push(c);
    }
  });
  const toOption = (c, depth) => ({ label: c.company_name, value: String(c.id), depth });
  return roots.flatMap((root) => [
    toOption(root, 0),
    ...(childrenByParent.get(String(root.id)) ?? []).map((child) => toOption(child, 1)),
  ]);
};
