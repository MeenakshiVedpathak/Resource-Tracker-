# Backend prompt: confirm `GET /employee-timesheets/off-day-requests` returns every request when called with no `work_date`

## Context

The off-day approval gate ("submit a request, wait for approval, then log hours" — see
`BACKEND_OFF_DAY_REQUESTS_MASTER_PROMPT.md`) previously only existed on My Work Log's Daily tab,
which always calls this endpoint scoped to one date:

```
GET /employee-timesheets/off-day-requests?work_date=2026-09-13
```

The same gate has now been extended to two more employee screens that needed it and didn't have
it — **Monthly Summary's Day View** (a whole-month grid, one column per calendar day) and **Time
Entry** (single selected date, same pattern as My Work Log).

Time Entry keeps calling this endpoint exactly like My Work Log already does — one `work_date` at
a time, nothing new there.

Monthly Summary's Day View is the new case: to know which of a month's ~30 day-columns are
unlocked, it calls this endpoint **with no `work_date` param at all**:

```
GET /employee-timesheets/off-day-requests
```

and expects back **every off-day request this employee has ever filed** (all statuses, all
dates) — it then filters client-side to `status === 'approved'` and the dates that fall in the
currently-viewed month.

## What to confirm / fix

1. If `work_date` is already optional and omitting it already returns every one of the caller's
   own requests unfiltered — no backend change needed, this is just confirming that.
2. If the backend currently requires `work_date` (400s or defaults to "today only" without it),
   it needs to start supporting a header-less/param-less call as "return all of mine."

No response shape change either way — same `{ success, message, data: [...] }` the single-date
call already returns, just with every matching row instead of one date's.

## How to verify

As an employee with off-day requests spanning more than one month (e.g. one approved in August,
one pending in September): call `GET /employee-timesheets/off-day-requests` with no query params
— both should come back in `data`, not just the current month's or today's.
