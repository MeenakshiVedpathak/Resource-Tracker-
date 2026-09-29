# Backend check: does `GET /employees/:id/business-units` return `parent_business_unit_name`?

## Context

The frontend's account menu (top-right avatar dropdown, `src/components/layout/UserMenu.jsx`) now
shows an Admin's/Employee's **Sub-BU** next to their Business Unit name, whenever they're mapped to
one — e.g. "Data & AI → Analytics" instead of just "Data & AI".

This screen's BU list comes from `GET /employees/:id/business-units`, called once at login (and
re-synced on every page load by `useSyncBusinessUnits`). The frontend already reads a
`parent_business_unit_name` field off each BU object in that response — this is the **same field
name** the Employee List's own Excel export already reads off a different endpoint's BU entries
(see `src/pages/employees/EmployeeList.jsx`, the `'Business Units'` export column), so if your BU
hierarchy data is already exposed elsewhere via that field name, this is likely already working.

## What to verify

1. Does `GET /employees/:id/business-units` (the endpoint that populates the *login-time* BU list,
   not the Employee List's own detail/mapping endpoints) include `parent_business_unit_id` and
   `parent_business_unit_name` on each BU object, for a BU that itself has a parent (i.e. is a
   Sub-BU)?
2. If not, please add those two fields to that endpoint's response for any BU entry whose
   `company_id`/BU row has a non-null parent — same shape/field names as wherever else in the API
   this hierarchy is already exposed (e.g. the Company/BU list endpoint), so the frontend's existing
   field name expectations don't need to change.
3. A root BU (no parent) should simply omit these two fields (or return them as `null`) — the
   frontend already treats their absence as "not a Sub-BU" and falls back to showing just the BU's
   own name, unchanged from today's behavior.

## Not needed if already true

If this endpoint already returns these fields today, no backend change is needed — the frontend
will pick it up automatically the next time this session's BU list is fetched (login, or the
next `useSyncBusinessUnits` refresh).
