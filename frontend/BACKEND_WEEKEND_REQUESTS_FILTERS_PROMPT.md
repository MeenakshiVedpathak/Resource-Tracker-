# Backend prompt: Business Unit scoping + work-date range filter on GET /my-team/off-day-requests

The Weekend Requests tab (Team Lead / Manager timesheet approval) now has the same filter set as
its sibling Timesheet Approvals tab: Entity, Business Unit, Work Date range, and Status (Status
already covered by BACKEND_WEEKEND_REQUESTS_STATUS_PROMPT.md). This adds two more query
capabilities the frontend now sends to:

GET /my-team/off-day-requests

## 1. Business Unit scoping (likely already works — please confirm)

The frontend now sends an explicit `X-Company-Id: <buId>` header when a Team Lead/Manager picks
one Business Unit in this screen's own filter (independent of whatever BU is globally active in
the navbar switcher) — see `explicitBuScope` in `src/services/apiClient.js`, the same mechanism
every other BU-filterable list in the app already relies on (e.g. `GET /my-team/employees`).

If this endpoint already scopes its results by `X-Company-Id` the same way every other `/my-team/*`
endpoint does, no backend change is needed here — just confirm. If it currently ignores
`X-Company-Id` and always returns every BU's requests (or only the caller's default BU regardless
of the header), it needs to start honoring that header the same way the rest of `/my-team/*` does.

## 2. Work Date range filter (new)

**Request params to add:**
```
GET /my-team/off-day-requests?startDate=2026-08-01&endDate=2026-08-31&...
```

**Behavior:** when both `startDate` and `endDate` are present, only return requests whose
`work_date` falls within that inclusive range (same semantics as the timesheet approval-summary
endpoint's own `startDate`/`endDate`, which already exists — see
`GET /my-team/timesheets/approval-summary`). Omitted entirely (as today) → no date filtering,
unchanged from current behavior.

No response shape change needed — this is a request-side filter only.

## How to verify
1. Business Unit: as a Team Lead mapped to 2+ BUs, call this endpoint once with
   `X-Company-Id: <BU A's id>` and once with `X-Company-Id: <BU B's id>` — the two responses
   should only contain requests from employees in that specific BU.
2. Date range: call with `startDate`/`endDate` bracketing exactly one known request's `work_date`
   — only that request (and any others in-range) should come back.
