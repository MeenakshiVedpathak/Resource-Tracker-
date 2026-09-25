# Backend prompt: add Business Unit id/hierarchy info to 5 endpoints so the frontend can show Sub BU everywhere

## Context

We're rolling out a "Sub BU" column across every report/master table that already shows a BU/Business
Unit column, right next to it. The Sub BU value is derived entirely client-side: the frontend already
holds the full BU master (`GET /companies`, which already returns `parent_business_unit_id` on every
row) and can resolve "does this record's BU have a parent, and if so what's its own name" purely by
joining on the BU's numeric id.

That join needs a numeric BU id on each report row. Three existing, already-shipped report endpoints
only return a BU **name** (or code) string today, with no id — so the frontend cannot reliably resolve
Sub BU for their rows. Matching by name is not safe: this tenant already has multiple Business Units
that share the same name across different Entities (e.g. two BUs both named "DATA + AI", one under
Entity id 2 and one under Entity id 3 — confirmed live). Matching by `company_code` is not safe either:
a Sub-BU is created with no code at all (code is optional/blank for Sub-BUs in the current BU-creation
flow), so any row belonging to a Sub-BU would have an empty code to match on.

No frontend workaround exists that doesn't risk showing the wrong Sub BU (or silently hiding a real one)
for at least some rows. Please add the BU id itself to each response instead.

## 1. `GET /reports/resource-cost-utilization` (Consolidated Monthly Report)

Current response per record (confirmed live):
```json
{
  "employeeId": 59,
  "employeeCode": "GTTF212",
  "employeeName": "Aadhira H",
  "buName": "DATA + AI",
  ...
}
```

Please add the BU's numeric id alongside `buName`, e.g.:
```json
{
  "buId": 23,
  "buName": "DATA + AI",
  ...
}
```

## 2. `GET /reports/employee-work-log-compliance`

Current response per record (confirmed live):
```json
{
  "employee_id": 59,
  "employee_name": "Aadhira H",
  "business_unit": "DATA + AI",
  ...
}
```

Please add the BU's numeric id, e.g.:
```json
{
  "business_unit_id": 23,
  "business_unit": "DATA + AI",
  ...
}
```

## 3. `GET /reports/bu-performance-scorecard`

Current response per record (from the frontend's existing column/export mapping):
```json
{
  "company_code": "...",
  "company_name": "DATA + AI",
  "entity_id": 3,
  ...
}
```

Here each row already represents one Business Unit itself (not an employee/record mapped to a BU), so
please just add that BU's own numeric id, e.g.:
```json
{
  "company_id": 23,
  "company_code": "...",
  "company_name": "DATA + AI",
  "entity_id": 3,
  ...
}
```
With this id the frontend can show its own Sub BU name directly (when `parent_business_unit_id` is set
on that BU) instead of needing anything further from this endpoint.

## 4. `GET /platform-admin/employee-work-log-synced` (Organization Overview → Employee Work Log Synced tab)

Same gap: rows only carry `bu_name` (no id). We worked around it there by keying the client-side join
on `entity_name + bu_name` together (safe against the cross-Entity name collision above, since the pair
should be unique even when the bare name isn't), so no immediate frontend blocker — but for full
correctness under any future backend changes it'd be worth adding a proper numeric BU id (`bu_id` or
`bu.id`) to this endpoint's rows too, whenever convenient. Not urgent like the three above.

## 5. `GET /employee-servicepo-mapping/filter-options` (Service PO "Map Employees" screen — the Entity → Business Unit filter dropdowns above the left panel)

Different kind of gap from the four above: this endpoint's `business_units` rows DO carry a real,
reliable numeric id — but not their own `parent_business_unit_id`. Current response per row (confirmed
live):
```json
{
  "id": 32,
  "company_name": "AntWorks",
  "entity_id": 4
}
```

The ask here is a proper 3-way cascade in that screen: Entity → Business Unit → Sub BU, matching the
Business Unit / Sub BU filter pattern already live everywhere else in the app — right now every Sub-BU
is mixed flat into the same "Business Unit" dropdown alongside actual top-level BUs, with no way to
tell them apart or narrow to just one Sub-BU. To split that into its own third dropdown the frontend
needs to know, for each row above, whether it's a Sub-BU and if so which Parent it belongs to — i.e.
add `parent_business_unit_id` (or `parent: { id }`), the same field `GET /companies` already returns:
```json
{
  "id": 32,
  "company_name": "AntWorks",
  "entity_id": 4,
  "parent_business_unit_id": null
}
```

This endpoint deliberately exists instead of reusing `GET /companies` here because `GET /companies`
403s for some of the roles that use this screen (BU Admin, Service PO Admin, Delivery Head) or returns
a narrower set than this screen's own authorized scope for others (BU Admin) — so the same
`parent_business_unit_id` info has to come from THIS endpoint's own response, not be cross-referenced
against `GET /companies` client-side (that would silently break the cascade for exactly the roles this
screen is for).

## Not needed

No other change is needed on any of these endpoints — no new filtering, no hierarchy expansion, no
additional fields beyond what's asked for in each numbered section above (a numeric BU id for #1–#4, a
`parent_business_unit_id` for #5). Every other report/master screen already carries what it needs and
needs no backend change at all; this file only covers the exceptions found during the audit.
