# Backend prompt: implement the Off-Day / Weekend Work Request feature end-to-end

## Context — read this first

The frontend (Resource Tracker) already has a complete "Weekend Requests" / "Off-Day Approval"
feature built and wired up. It calls the endpoints below, but **none of them exist yet on the
backend** — checked both the `main` and `ujef` branches of `RUT_Backend`, no route, controller,
service, or `off_day_requests` table/migration anywhere. So build this feature from scratch,
including the Business Unit scoping and date-range filter that earlier partial prompts
(`BACKEND_WEEKEND_REQUESTS_STATUS_PROMPT.md`, `BACKEND_WEEKEND_REQUESTS_FILTERS_PROMPT.md`,
`BACKEND_BULK_APPROVE_PROMPT.md`) described in isolation — this prompt supersedes and consolidates
all three, so implement everything below in one pass.

## Feature summary

An employee viewing their timesheet on an off-day (Sunday always, Saturday depending on the BU's
`saturday_off_rule`) must request approval from their Team Lead/Manager before they can log hours
on it. The Team Lead/Manager approves or rejects from a "Weekend Requests" tab that sits next to
their existing Timesheet Approvals tab, with the same Entity / Business Unit / Work Date range /
Status filters.

## Data model

A table (e.g. `off_day_requests`) with at least:
- `id`
- `employee_id` (FK) — the requester
- `service_po_id` (FK) — which project/PO the work is for
- `work_date` (date) — the off-day being worked
- `reason` (text) — employee's justification, ≤500 words (frontend already enforces this client-side)
- `status` (enum: `pending` | `approved` | `rejected`)
- `decision_remark` (text, nullable) — set on rejection, shown back to the employee
- `approver_id` (FK, nullable) — who approved/rejected it (defaults to the employee's Team
  Lead/Manager for the relevant Service PO/BU)
- `created_at`, `updated_at`

## Endpoints to add

### 1. `POST /employee-timesheets/off-day-requests` (employee)
Body: `{ "service_po_id": number, "work_date": "YYYY-MM-DD", "reason": string }`
Creates a new request with `status = pending` for the authenticated employee. Reject with 400 if
an active (`pending` or `approved`) request already exists for that employee+`work_date`.
Response: `{ success, message, data: <created request> }`.

### 2. `GET /employee-timesheets/off-day-requests` (employee)
Query params as sent (e.g. filtered by date). Returns the authenticated employee's own requests —
used by the timesheet calendar to show pending/approved/rejected state per day.
Response: `{ success, message, data: [...] }`.

### 3. `PUT /employee-timesheets/off-day-requests/:id/resubmit` (employee)
Body: `{ "reason": string }`. Only valid when the request's current status is `rejected` and it
belongs to the caller. Resets `status` to `pending`, clears `decision_remark`, updates `reason`.
Response: `{ success, message, data: <updated request> }`.

### 4. `GET /my-team/off-day-requests` (Team Lead / Manager)
Returns requests the caller is the approver for. **Query params to support:**

- `page`, `limit` — standard pagination, response `meta: { page, limit, total, total_pages }`.
- `status` — `all` (or omitted) returns every status; `pending` / `approved` / `rejected` filters
  to just that one. Do **not** hardcode `status = pending` internally — that's the current
  suspected bug: if `status=all` is ignored, approved/rejected requests silently vanish instead of
  staying visible (sorted below pending, as a record of what's handled).
- `search` — free text; matches employee name/code, Service PO name, or `reason` (optional —
  frontend already does a client-side fallback filter, so this is a nice-to-have, not a hard
  requirement).
- `buId` (optional, but see the header requirement below) — **not actually needed as a query
  param**; Business Unit scoping is carried via the `X-Company-Id` header, not a query string.
- `startDate`, `endDate` — when both are present, only return requests whose `work_date` falls
  within that inclusive range. Omitted → no date filtering.

**Business Unit scoping — this is the part most likely still broken:**
The frontend sends `X-Company-Id: <buId>` as a request header whenever the Team Lead/Manager picks
one specific BU in this screen's own filter (independent of whatever BU is globally active in the
navbar). This endpoint must scope its result set by that header exactly the way every other
`/my-team/*` endpoint already does (e.g. `GET /my-team/employees`, `GET
/my-team/timesheets/approval-summary`):
- Header present with a specific BU id → only return requests for employees in that BU.
- Header absent → fall back to the caller's full role reach (every BU they manage).

If this endpoint currently reads `X-Company-Id` from some other source (a session-level "active
BU" instead of the per-request header), or ignores it and always returns the caller's default BU
regardless of the header, that's the bug — fix it to read the header on every request, statelessly,
like the sibling endpoints.

Response: `{ success, message, data: [...], meta: { page, limit, total, total_pages } }`.

### 5. `PUT /my-team/off-day-requests/:id/approve` (Team Lead / Manager)
Only the approver may call this, only on a `pending` request. Sets `status = approved`.
Response: `{ success, message, data: <updated request> }`.

### 6. `POST /my-team/off-day-requests/bulk-approve` (Team Lead / Manager)
Body: `{ "ids": [101, 102, 103] }`.
For each id: skip into `failed` (don't 500 the batch) if not found, not owned by caller, or not
`pending`; otherwise approve it exactly like the single-approve endpoint.
Response (200 even on partial failure):
```json
{
  "success": true,
  "message": "3 of 3 requests approved.",
  "data": {
    "approved": [101, 102, 103],
    "failed": [{ "id": 104, "reason": "not_found" | "not_owned" | "not_pending" }]
  }
}
```

### 7. `PUT /my-team/off-day-requests/:id/reject` (Team Lead / Manager)
Body: `{ "remark": string }` (required). Only on a `pending` request owned by the caller. Sets
`status = rejected`, stores `decision_remark = remark`.
Response: `{ success, message, data: <updated request> }`.

## How to verify end-to-end

1. As an employee, on a Sunday/off-Saturday in the timesheet calendar, submit a request via
   `POST /employee-timesheets/off-day-requests` — confirm it's created `pending`.
2. As their Team Lead, `GET /my-team/off-day-requests?status=all` — the new request appears.
3. Approve it (`PUT .../approve`), then re-call `status=all` — it's still present, now
   `"status": "approved"` (not filtered out).
4. As a Team Lead mapped to 2+ BUs: call `GET /my-team/off-day-requests` once with
   `X-Company-Id: <BU A id>` and once with `X-Company-Id: <BU B id>` — responses must only contain
   that BU's employees' requests.
5. Call with `startDate`/`endDate` bracketing exactly one known request's `work_date` — only that
   request (and any others in range) comes back.
6. Reject a different request with a `remark`, then as the employee call
   `GET /employee-timesheets/off-day-requests` — `decision_remark` is visible, and
   `PUT .../resubmit` successfully moves it back to `pending`.
7. Bulk-approve 3 pending requests in one call to `POST /my-team/off-day-requests/bulk-approve` —
   all 3 flip to `approved` in a single request.
