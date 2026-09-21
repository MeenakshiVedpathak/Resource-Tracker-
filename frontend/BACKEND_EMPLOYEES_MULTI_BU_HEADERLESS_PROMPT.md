# Backend prompt: `GET /employees` (and `/employees/active/list`) rejects a header-less request from a multi-BU BU-scoped login

## Bug

```
GET /employees
{
  "success": false,
  "message": "X-Company-Id header is required.",
  "code": "COMPANY_HEADER_REQUIRED"
}
```

Employee Master fails to load for a **BU Admin (or BU Head) mapped to more than one Business
Unit**, whenever the screen's own Business Unit filter is left on "All Business Units" (its
default on open — so the list fails immediately on page load for these logins, not just after
touching the filter).

## Why this happens

Employee Master's BU filter deliberately sends **no `X-Company-Id` header at all** when "All
Business Units" is selected for a login mapped to several BUs — this is the same convention every
other BU-filterable screen in the app uses (`explicitBuScope` in `src/services/apiClient.js`), and
per an earlier backend change (2026-09, alongside the auto-map-creator update that resolves a new
Project/Service PO's BU from its Client instead of the active header), several endpoints were
already migrated to accept a header-less request from a BU-scoped multi-BU caller and scope the
result to every BU that caller is mapped to.

`GET /employees` (and its sibling `GET /employees/active/list`) never got that same migration —
they still hard-require the header for any non-cross-BU role, so a multi-BU BU Admin/BU Head hits
the 400 above the moment they load the screen (single-BU BU Admins are unaffected — the frontend
keeps sending their one BU's header in that case, since "their one BU IS all of theirs").

## Fix

Bring `GET /employees` and `GET /employees/active/list` in line with whatever already-migrated
endpoint(s) handle this (e.g. `GET /reports/*`, `GET /timesheets/import/history` — check with
whoever did the 2026-09 change for the exact scoping logic used there):

- Header present with a specific BU id → unchanged, scope to that one BU.
- Header absent, caller is BU-scoped (BU Admin/BU Head) and mapped to exactly one BU → treat as
  that one BU (today's behavior for a single-BU login already relies on this — don't break it).
- Header absent, caller is BU-scoped and mapped to SEVERAL BUs → return employees across every BU
  they're mapped to, not a 400.
- Header absent, caller is cross-BU (Admin/Entity Admin/Platform Admin) → unchanged, existing role-
  reach behavior.

## How to verify

As a BU Admin (or BU Head) mapped to 2+ Business Units: `GET /employees` with no `X-Company-Id`
header — should return employees across all of that login's mapped BUs instead of the
`COMPANY_HEADER_REQUIRED` 400. Re-test with the header set to one specific mapped BU id —
unchanged, still narrows to just that BU.
