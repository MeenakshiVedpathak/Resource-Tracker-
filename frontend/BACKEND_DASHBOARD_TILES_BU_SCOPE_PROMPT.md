# Backend prompt: `tiles.*` headcount fields on GET /dashboard/analytics don't respect `businessUnitIds`

## Context

The Analytics Dashboard's Business Unit filter (multi-select, supports Parent BUs and their
Sub-BUs) sends `businessUnitIds` on `GET /dashboard/analytics`. Most of the response scopes down
correctly when this is narrowed to a single small Sub-BU — but three fields in the `tiles` section
don't, while the equivalent fields elsewhere in the SAME response do.

## What we found (confirmed live)

Request: `GET /dashboard/analytics?fiscalYear=2026&hoursSource=M&roleId=2&businessUnitIds=42`
(`42` = "DAS", a Sub-BU of "DATA + AI" with only 5 employees actually mapped to it.)

Response (trimmed to the relevant fields):
```json
{
  "tiles": {
    "active_employees": 72,
    "active_clients": 5,
    "active_service_pos": 6
  },
  "workforce": {
    "total_employees": 5,
    "active_employees": 5
  },
  "portfolio": {
    "total_clients": 1,
    "active_pos": 7
  }
}
```

`workforce.total_employees`/`active_employees` (5) and `portfolio.total_clients`/`active_pos` (1,
7) are correctly scoped down to just this one Sub-BU — confirmed by cross-checking against
`charts.monthly_hours_trend` and `analytics2`'s `client_wise_analytics`, both of which also
correctly narrow and sum up to the exact same totals as the rest of the (correctly scoped) response.

`tiles.active_employees` (72) and `tiles.active_clients` (5) don't match those at all — they read
much closer to this login's WHOLE reach (84 employees total, 18 clients total) than to the one
Sub-BU actually requested. `tiles.active_service_pos` (6) is at least in the right ballpark but
still disagrees with `portfolio.active_pos` (7) for the identical filter on the identical request.

## Ask

Please make `tiles.active_employees`, `tiles.active_clients`, and `tiles.active_service_pos` apply
the same `businessUnitIds` scoping that `workforce.*` and `portfolio.*` already correctly apply in
this same endpoint — ideally by having `tiles` derive these three from the same already-correct
`workforce`/`portfolio` counts rather than a separate, differently-scoped query.

## Not currently user-facing, but worth fixing for correctness

The frontend already works around this today — it overrides `tiles.active_employees` with
`workforce.total_employees`, and `tiles.active_service_pos`/`active_clients` with
`portfolio.active_pos`/`total_clients`, before rendering, specifically because `tiles.*` reads as
unreliable once a BU filter is applied. So nothing is visibly wrong for users right now. But any
other consumer of this endpoint that reads `tiles.*` directly (a future export, another frontend
surface, an API integration) would get the wrong, unscoped numbers — worth fixing at the source
rather than leaving every future caller to discover and route around it the same way.

## Not needed

No change needed anywhere else in this response — `charts.*`, `analytics2`'s own sections,
`financials`, and the rest of `workforce`/`portfolio` were all confirmed to scope correctly already.
