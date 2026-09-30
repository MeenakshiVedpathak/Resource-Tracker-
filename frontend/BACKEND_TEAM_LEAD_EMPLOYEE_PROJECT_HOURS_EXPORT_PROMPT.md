# Backend: export endpoint for Team Lead Employee Project Hours

## Context

The "Team Lead Employee Project Hours" report (frontend: `src/pages/reports/TeamLeadEmployeeProjectHours.jsx`) needs an **Export Excel** button. Its own listing endpoint, `GET /reports/team-lead-employee-project-hours`, caps `limit` at 100 — so we can't do the "fetch everything in one big request" trick some other reports use for their export. This needs a dedicated export endpoint that returns every matching row in one file, generated server-side, the same way `GET /reports/project-timesheet` (`?format=excel`) and `GET /reports/employee-role-bu-mapping` (`?format=excel`) already work in this API.

## What we need

**`GET /reports/team-lead-employee-project-hours/export?format=excel`**

- Same identity/manager-scoping as the report's own endpoint — resolves "which Team Lead" from the login, never from a param. Never accepts (and the frontend will never send) a team-lead/manager ID.
- Accepts the exact same filter params as the report endpoint: `month`/`year` OR `startDate`/`endDate` (never both), `employeeIds`, `clientIds`, `projectIds`, `servicePoIds`, `buIds`, `subBuIds`, `status` (comma-separated `pending`/`approved`/`rejected`/`synced`), `search`. No `page`/`limit`/`sortBy`/`sortOrder` — the frontend strips those before calling this endpoint, since export always means "every matching row," not one page.
- Returns a real `.xlsx` file as the response body (`Content-Type` for an Excel file, `Content-Disposition: attachment; filename="..."`), not JSON — same as the two existing export endpoints referenced above.
- Same 403 behavior as the report endpoint itself for a login with no manager capability (e.g. a plain Employee) — no special-casing needed there, whatever the report endpoint already does is fine to mirror.
- Row/column shape: the same fields the report table shows — Employee Name + Code, Client, Project, SPO Name + Code, Hours Name (Module/Task), BU Name, Sub-BU Name, Logged Hours, Date, Description, Status. Exact column order/formatting is up to you — match whatever convention your other report exports already use.

## Frontend is already wired for this

`src/api/reports.api.js` already has `exportTeamLeadEmployeeProjectHours`, calling exactly this URL/shape and expecting a blob response with a `Content-Disposition` filename, and the report page already has a working "Export Excel" button that calls it — no further frontend change needed once this endpoint exists.
