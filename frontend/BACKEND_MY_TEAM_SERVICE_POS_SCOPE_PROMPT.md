# Backend prompt: fix `GET /my-team/service-pos` crashing for cross-BU roles (Admin, Entity Admin, Platform Admin)

## Bug

```
GET /my-team/service-pos
{
  "success": false,
  "message": "WHERE parameter \"company_id\" has invalid \"undefined\" value"
}
```

This happens for any login whose role is cross-BU (Admin, Entity Admin, Platform Admin) — those
roles carry no `company_id` on their own account/JWT. The current implementation of
`GET /my-team/service-pos` reads `company_id` straight off `req.user.company_id` (or equivalent)
with no fallback, so it's `undefined` for these roles and the query blows up instead of returning
something sensible.

## Why this matters now

The frontend's new "Weekend Requests" tab calls `useMyTeamServicePos()` (which hits this endpoint)
to resolve a Service PO's display name as a fallback. It's a secondary lookup — doesn't break the
main table — but it fails loudly in the network tab every time an Admin-tier login opens that
screen, and any other caller of this endpoint for a cross-BU role hits the same crash.

## Fix

`GET /my-team/employees` already solved the identical problem — see
`src/middlewares/resolveMyTeamBusinessUnitScope.js` and whatever service backs
`managerSelfServiceService.getMyEmployees` — it resolves the caller's effective BU/company scope
instead of assuming `req.user.company_id` is always present. Apply the same resolution to
`GET /my-team/service-pos`:

- BU-scoped login (Team Lead, Manager, BU Admin, BU Head, …) → behavior unchanged, scope by their
  own `company_id`/BU mapping as today.
- Cross-BU login (Admin, Entity Admin, Platform Admin) → this is a "my own manager-service-PO
  grants" self-service list, and these roles have none — return an empty list (`{ "success":
  true, "data": [] }`), not a 500/400. Don't attempt to resolve a company_id for them at all.

## How to verify

1. As a Team Lead/Manager with existing service-PO grants: `GET /my-team/service-pos` — unchanged,
   still returns their grants.
2. As an Admin/Entity Admin/Platform Admin login: `GET /my-team/service-pos` — returns
   `{ "success": true, "data": [] }` instead of the `company_id` crash.
