# Backend: paginated "all employees" variant of the Timesheet Approval Summary endpoint

## Context

Manager Timesheet Approval and Team Lead Timesheet Approval both have a default landing table
that shows every mapped Employee's pending/approved timesheet buckets in one combined list. There
is currently **no backend endpoint that returns this combined list directly** — the frontend fakes
it by calling the existing single-employee endpoint once per Employee:

```
GET /my-team/timesheets/approval-summary?employee_id=<id>&page=1&limit=100&<other filters>
```

(`src/hooks/useMyTeam.js`, `useMyTeamAllEmployeesApprovalSummary`) — one request per mapped
Employee, every one hardcoded to `page: 1, limit: 100`, then all results are concatenated and
paginated **client-side** (the on-screen page 1/2/3 controls just slice an array already sitting
fully in the browser's memory — no further network request happens when a user clicks "next page").

## Why this needs a real fix

For a Manager/Team Lead with N mapped Employees, this means:
- **N separate network requests** fire on every filter change, growing linearly with team size.
- Every one of those requests' results (up to 100 rows each) is downloaded in full before the page
  can render at all, regardless of which "page" the user is actually looking at.
- Any single Employee with **more than 100** daily/monthly buckets in the selected date range
  silently loses everything past #100 — no error, no "load more," it just isn't in the array.
- This is a page-load-time and payload-size problem that gets worse the more Employees a
  Manager/Team Lead has and the wider the date range filter is.

## What we need

A new (or extended) version of this endpoint that:

1. Accepts the Manager's/Team Lead's own identity (however your auth middleware already scopes
   "my mapped team" for the existing single-employee version of this endpoint) **instead of** a
   single required `employee_id`, and returns the combined, already-merged list of every mapped
   Employee's approval-summary rows in one response.
2. Supports **real server-side pagination** on that combined list via standard `page`/`limit`
   query params — i.e. `page=2` should trigger an actual new query against the full combined
   dataset, not just re-slice something already fully downloaded.
3. Still accepts the same filter params the current single-employee endpoint already takes
   (whatever date-range/status/log-type filters `filterParams` in `useMyTeamAllEmployeesApprovalSummary`
   currently passes through), applied across all mapped Employees at once.
4. Each row in the response should still carry which Employee it belongs to (id, name, code) —
   the frontend currently stitches this on client-side per request; with one combined endpoint,
   the backend should include it directly since there's no longer a 1:1 "this whole response is
   for employee X" assumption.
5. Sorting: the frontend currently sorts the full in-memory row set by clicking a column header
   (see `ManagerAllEmployeesTimesheetView.jsx` / `TeamLeadAllEmployeesTimesheetView.jsx`) — for
   this to keep working with real server pagination, the endpoint should accept a `sortBy`/
   `sortOrder` (or equivalent) param and sort the combined dataset server-side before paginating,
   the same convention other paginated list endpoints in this API already use.

## Not required to change

- Keep the existing single-`employee_id` endpoint (`GET /my-team/timesheets/approval-summary`)
  exactly as-is — it's still used for the "drill into one Employee" flow. This is a new capability
  alongside it, not a replacement.
- No change needed to the approve/reject endpoints — only the summary listing itself.

## Once this exists

The frontend will drop the per-employee `useQueries` fan-out entirely and call this one paginated
endpoint instead, wiring its real `page`/`limit`/`sortBy` straight into the existing `DataTable`
pagination controls (which already render correctly — they just aren't backed by a real network
request today). This removes both the N-requests-per-render problem and the silent 100-row-per-
Employee cap.
