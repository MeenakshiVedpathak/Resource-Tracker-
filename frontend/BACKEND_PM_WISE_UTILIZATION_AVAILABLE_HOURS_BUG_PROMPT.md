# Backend: `total_available_hours` is wrong on `GET /reports/pm-wise-utilization`

## Bug

On the "Project Manager-wise Utilization" report, `total_available_hours` (and therefore `utilization_pct`, which divides by it) does not scale with `resource_count` at all — it's producing numbers far too small, in a way that's clearly not computing "resource_count × standard monthly capacity (176h) × months in the period" the way every other utilization report in this API does.

## Evidence (confirmed live, superadmin login, same backend)

**`GET /reports/pm-wise-utilization?startMonth=5&startYear=2026&endMonth=10&endYear=2026`** (a 6-month range):

| PM | resource_count | total_available_hours | utilization_pct |
|---|---|---|---|
| naja | 5 | **2.00** | 1400.00 |
| Rajdoot Subhash Herlekar | 19 | 781.00 | 31.85 |
| Meenakshi Swapnil Vedpathak | 31 | **788.00** | 31.27 |
| Kundan Sudarshan Bhagat | 14 | **788.00** | 13.23 |
| Ananda Padmanaban H | 9 | **0.00** | 0 (logged hours were 433.83) |

Two problems visible just from this one response:
1. **"naja"**: 5 resources over 6 months should be roughly `5 × 176 × 6 ≈ 5280` available hours. The endpoint returns `2.00` — not in the right order of magnitude at all.
2. **Meenakshi (31 resources) and Kundan (14 resources) get the exact same `total_available_hours: 788.00`**, despite more than double the resource count. `total_available_hours` is clearly not derived from `resource_count` for these rows — something else (unrelated to how many resources that PM actually has) is producing this number.
3. **Ananda**: `resource_count: 9`, `total_logged_hours: 433.83`, but `total_available_hours: 0.00` — a PM with real logged hours and real resources getting zero available hours, which also breaks `utilization_pct` (comes back as the string `"0"` instead of a real percentage — looks like a divide-by-zero guard silently swallowing the real calculation rather than fixing the root cause).

**Also reproduced in single-month mode** (not just the date-range/month-range case) — `GET /reports/pm-wise-utilization?month=9&year=2026` for PM id 340 ("naja", `resource_count: 5`) returns `total_available_hours: 2.00` for that one month alone (expected ~880 for 5 resources × 176h). Checking the same PM across `month=5` through `month=10` individually in 2026 shows `total_available_hours` bouncing between `0.00` and `2.00` regardless of `resource_count` staying at `5` the whole time — confirming this isn't a date-range-aggregation-specific bug, the per-month calculation itself is wrong.

## What to check

- Whatever query computes `total_available_hours` for this report — it should be `resource_count × 176 (or whatever this report's standard monthly capacity constant is) × number of months in the requested period`, matching the same "expected hours" convention every other utilization report in this API already uses (e.g. BU-wise Utilisation's own `expectedHours = employees × 176`).
- The two PMs sharing an identical `788.00` despite very different `resource_count`s strongly suggests a broken `JOIN`/`GROUP BY` — likely aggregating off the wrong table/key (maybe a capacity table keyed by something that isn't actually varying per PM in this query), rather than a simple off-by-a-constant math error.
- `utilization_pct` returning the bare string `"0"` (not a number, not null) for the zero-available-hours case is itself worth normalizing once the root cause is fixed — every other row returns a proper numeric-string percentage.

## Frontend

No frontend change needed — `src/pages/reports/PmWiseUtilizationReport.jsx` renders `total_available_hours`/`utilization_pct` exactly as the API returns them, with no client-side calculation. Once the backend fix lands, the report will display correctly with no further frontend work.
