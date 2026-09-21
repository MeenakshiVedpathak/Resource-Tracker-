# Backend prompt: support status filter on GET /my-team/off-day-requests

## Problem
The Weekend Requests tab (Team Lead / Manager timesheet approval, frontend:
src/components/employee/WeekendRequestsTable.jsx) currently only ever shows pending requests —
once a request is approved or rejected it vanishes from the screen entirely, instead of staying
visible (just sorted below the still-pending ones, as a record of what's already been handled).

The frontend now sends:

GET /my-team/off-day-requests?page=1&limit=20&status=all

If the backend currently ignores unknown query params and always filters to `status = pending`
internally regardless of what's passed, this `status=all` has no effect and the behavior is
unchanged.

## Fix
Add a `status` query param to GET /my-team/off-day-requests:
- `status=all` (or the param omitted) → return requests in every status (pending, approved,
  rejected) that this Team Lead/Manager is the approver for.
- `status=pending` / `status=approved` / `status=rejected` → filter to just that status (not
  currently used by the frontend, but worth supporting the same way the equivalent timesheet
  approval endpoints already do, for consistency).

No other response shape change needed — each request object already has its own `status` field
(the frontend reads `req.status` for the pending/approved/rejected badge and to decide whether to
show the Approve/Reject actions vs. a read-only row). Pagination (`meta.total`, `meta.total_pages`)
should reflect the filtered count under whichever `status` was requested.

## How to verify
Approve one pending weekend request, then call
GET /my-team/off-day-requests?status=all — the just-approved request should still appear in the
response with `"status": "approved"`, not disappear.
