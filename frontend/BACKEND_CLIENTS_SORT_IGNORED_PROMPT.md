# Backend prompt: GET /clients ignores `sortBy`/`sortOrder` entirely

## Context

We want newly created clients to show up at the top of Client Master by default (currently they can
land anywhere, reading as if the create silently failed). The frontend already sends
`sortBy=created_at&sortOrder=desc` by default now, and lets the user click any column header to sort
by that column instead (e.g. `sortBy=client_name&sortOrder=asc`).

## What we found (confirmed live)

Sent three different requests in a row — the response's row order was **identical** every time:

```
GET /clients?page=1&limit=10&status=all&sortBy=created_at&sortOrder=desc
GET /clients?page=1&limit=10&status=all&sortBy=created_at&sortOrder=desc   (unchanged, no click yet)
GET /clients?page=1&limit=10&status=all&sortBy=client_name&sortOrder=asc  (after clicking "Client Name")
```

All three returned the exact same order: Aarti Industries Ltd-Baroda, Alpharithm, Alpharithm pvt ltd,
Alpharithm technologies Pvt Ltdd, Ant works India Pvt Ltd, ... — which isn't `created_at desc` either
(their actual `created_at` values are scattered across Aug 26 – Sep 11, not descending at all). It
looks like the endpoint just returns its own fixed default order and doesn't read `sortBy`/`sortOrder`
from the query string at all.

## Ask

Please make `GET /clients` actually honor `sortBy`/`sortOrder`:
- Support at least `sortBy=created_at` (both `asc`/`desc`) so a fresh client can default to showing
  first.
- Ideally also honor `sortBy=client_name` / `client_code` / `status` etc. for the column-header sort
  the frontend already offers on this screen — right now clicking any of those headers has no visible
  effect either, for the same reason.
- If there's already a default ordering column (looks like maybe an id or alphabetical default), that
  default is fine to KEEP as-is whenever `sortBy` is omitted — just needs to actually switch when a
  `sortBy` is explicitly provided.

## Not needed

No new endpoint, no new params beyond what's already being sent — `sortBy`/`sortOrder` are already
part of this endpoint's contract per the frontend's existing filter/sort UI, they just need to
actually be applied to the query.
