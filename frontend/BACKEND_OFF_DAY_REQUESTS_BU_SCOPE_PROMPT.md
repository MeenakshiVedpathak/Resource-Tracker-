# Backend prompt: GET /my-team/off-day-requests ignores X-Company-Id for cross-BU roles

## Bug (confirmed live, API-level, bypassing the frontend entirely)

Logged in as an Admin (cross-BU role, e.g. `superadmin@trackio.com`) and called:

```
GET /my-team/off-day-requests?status=all&limit=100&page=1
```

six times, each with a different `X-Company-Id` header (real BU ids from this login's own
`businessUnits` list: 41, 30, 24, 29, 25, 31 — different Entities, different BUs), plus once with
no `X-Company-Id` header at all.

**Every single call returned the identical result**: `meta.total: 6`, same 6 record ids
`[1, 2, 3, 4, 5, 6]`, in every case. The `X-Company-Id` header has zero effect on this endpoint's
response for this role.

## Why this matters

The frontend's Weekend Requests screen (Team Lead / Manager timesheet approval) has an Entity/
Business Unit filter that scopes this exact call via `X-Company-Id` (see `explicitBuScope` in
`src/services/apiClient.js`, and `api/offDayRequests.api.js`'s `listQueue`) — the same mechanism
every other BU-filterable list in the app already relies on (`GET /my-team/employees`,
`GET /reports/*`, etc.). For a BU-scoped login (Team Lead, Manager, BU Admin) this endpoint
presumably already respects the header correctly (not independently re-verified here, but no
report of it being broken for those roles). For a cross-BU login (Admin, Entity Admin, Platform
Admin), it doesn't — the Entity/BU filter on the Weekend Requests screen is a complete no-op for
these roles: every Entity, every BU, and "All" all show the exact same unfiltered result.

## Fix

`GET /my-team/employees` already solves the identical problem for a cross-BU role — see
`src/middlewares/resolveMyTeamBusinessUnitScope.js` and whatever service backs
`managerSelfServiceService.getMyEmployees`. Apply the same BU-scope resolution to
`GET /my-team/off-day-requests`:

- When `X-Company-Id` is present, scope results to that BU (or that BU's mapped employees'
  requests) regardless of whether the caller's own role is BU-scoped or cross-BU. Right now it
  appears the handler resolves scope purely from the caller's own role reach and never even reads
  the header for a cross-BU role.
- When `X-Company-Id` is absent, keep today's fallback behavior (full role reach) — that part is
  fine and shouldn't change.

## How to verify

1. As the same Admin login, repeat the 6-header test above — each `X-Company-Id` value should now
   return only that BU's own weekend/off-day requests (likely 0 or a small subset, not the same 6
   every time).
2. Confirm a BU-scoped login (Team Lead/Manager) is unaffected — their calls don't send an
   explicit `X-Company-Id` override from this screen in the same way and should behave as before.
