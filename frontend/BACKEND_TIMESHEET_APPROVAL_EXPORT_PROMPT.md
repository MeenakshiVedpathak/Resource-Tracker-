# Backend: export endpoint for Timesheet Approval (My Team)

## Context

The "Timesheet Approval" screens (Manager and Team Lead — same shared table component, backed by `GET /my-team/timesheets/approval-summary/all`) need an **Export Excel** button. That listing endpoint is page/limit-capped (real server-side pagination, confirmed up to ~200/page) — so the frontend can't just "fetch everything in one big request" the way some other reports' export used to. This needs a dedicated export endpoint that returns every matching row in one file, generated server-side, the same way `GET /reports/project-timesheet`, `GET /reports/employee-role-bu-mapping`, and `GET /reports/team-lead-employee-project-hours/export` (`?format=excel`) already work in this API.

## What we need

**`GET /my-team/timesheets/approval-summary/all/export?format=excel`**

- Same identity/scoping rules as `GET /my-team/timesheets/approval-summary/all` itself — resolves "my team" from the login (manager or Team Lead, whichever role is calling), never from a param. `business_unit_id` (+ `X-Company-Id` header) scopes to one Business Unit when the frontend's BU filter picks one; no header at all means "every Business Unit this login's team spans" (same as the JSON endpoint — never trust a globally-active BU here).
- Accepts the exact same filter params as the JSON endpoint: `log_type` (`daily`/`weekly`/`monthly`), `startDate`/`endDate`, `status` (`pending`/`approved`/`rejected`), `search` (matches employee name, employee code, or Service PO name), `employee_ids` (comma-separated — narrows to a subset of the caller's own mapped team, never adds employees outside it), `business_unit_id`, and `service_po_id` (Team Lead screen only — ignored/optional for the Manager screen's calls). No `page`/`limit`/`sortBy`/`sortOrder` — the frontend strips those before calling this endpoint, since export always means "every matching row across the whole team/period," not one page.
- Returns a real `.xlsx` file as the response body (`Content-Type` for an Excel file, `Content-Disposition: attachment; filename="..."`), not JSON — same convention as the export endpoints referenced above.
- Same 403/empty behavior as the JSON endpoint itself for a login with no mapped team.
- Row/column shape: the same fields the approval table shows — Employee Name + Code, Date (or Month for `log_type=monthly`), Service PO Name, Total Hours, Entry Count, Approval Status. Exact column order/formatting is up to you — match whatever convention your other report exports already use.

## Frontend is already wired for this

`src/api/myTeam.api.js` already has `myTeamApi.exportApprovalSummaryAll`, calling exactly this URL/shape and expecting a blob response with a `Content-Disposition` filename, and both `ManagerTimesheetApproval.jsx` and `TeamLeadTimesheetApproval.jsx` already have a working "Export Excel" button that calls it — no further frontend change needed once this endpoint exists.
