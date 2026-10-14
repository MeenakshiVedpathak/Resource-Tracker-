# Backend Prompt — Timesheet Approval Status Report: Multi-Employee Filter

## Context

The `GET /employee-reports/timesheet-approval-status` endpoint currently accepts a single `employee_id` query param to filter buckets to one team member.

The frontend has been updated to send **`employee_ids`** (comma-separated string) when a Team Lead selects multiple employees.

---

## Required Change

Accept a new optional query param **`employee_ids`** (comma-separated employee IDs, e.g. `"12,45,78"`).

### Logic

- If `employee_ids` is provided: return buckets for **all** the listed employees (equivalent to running the existing `employee_id` filter for each ID and merging the results, sorted by employee name then date).
- If neither `employee_ids` nor `employee_id` is provided: return all team members' buckets (existing "My Whole Team" behaviour — no change).
- Keep backward compatibility with the existing `employee_id` (singular) param — if only that is sent, behave exactly as before.

### Parsing

```js
// pseudo-code
const ids = req.query.employee_ids
  ? req.query.employee_ids.split(',').map(Number).filter(Boolean)
  : req.query.employee_id
    ? [Number(req.query.employee_id)]
    : null; // null = all team members
```

### Authorization

Same as the existing `employee_id` check — the requested employee(s) must belong to the calling Team Lead's team. Return `403` for any ID that isn't.

### Response shape

Unchanged — the response is still an array of bucket objects, same structure as before. Multiple employees simply produce more buckets, each with `employee_id` and `employee_name` set.

---

## Endpoint reference

`GET /employee-reports/timesheet-approval-status`

Existing params (unchanged): `date`, `month`, `year`, `startDate`, `endDate`, `log_type`, `employee_id`

New param: `employee_ids` (string, comma-separated IDs)

No frontend changes beyond what's already done.
