# Backend prompt: bulk-approve endpoint for Weekend/Off-Day requests

The frontend's "Weekend Requests" tab (Team Lead / Manager timesheet approval) now has a
multi-select bulk-approve action. It calls a bulk endpoint that does not exist on the backend yet.
Until it's added, the frontend transparently falls back to firing the existing single-approve
endpoint once per selected row, so nothing is broken — but that's N round trips instead of one.

## What to add

**Route:** `POST /my-team/off-day-requests/bulk-approve`

**Auth/scope:** same guard as the existing `PUT /my-team/off-day-requests/:id/approve` — only a
Team Lead/Manager who owns (is the approver for) each request may approve it.

**Request body:**
```json
{ "ids": [101, 102, 103] }
```

**Behavior:** for each id in `ids`:
- Skip (don't 500 the whole batch) if the request doesn't exist, isn't `pending`, or isn't owned
  by the caller — collect it into `failed` instead.
- Otherwise approve it exactly like the single-approve endpoint does (same status transition, same
  side effects).

**Response (200):**
```json
{
  "success": true,
  "message": "3 of 3 requests approved.",
  "data": {
    "approved": [101, 102, 103],
    "failed": []
  }
}
```
On partial failure, still return 200 with `failed` populated (each entry `{ "id": 104, "reason": "not_found" | "not_owned" | "not_pending" }`) — the frontend reports the counts to the user, it doesn't need per-item error detail beyond that.

## Frontend contract already wired up

- `src/api/offDayRequests.api.js` — `bulkApprove(ids)` calls the route above.
- `src/hooks/useOffDayRequests.js` — `useBulkApproveOffDayRequests()` wraps it as a mutation and
  invalidates the `my-team/off-day-requests` query on success.
- `src/components/employee/WeekendRequestsTable.jsx` — `handleBulkApprove` calls the bulk
  mutation first; only on a 404 (route not deployed) does it fall back to N single-approve calls.

Once this route is live, no frontend change is needed — the 404 fallback simply stops triggering.
