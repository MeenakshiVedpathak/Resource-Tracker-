# Backend prompt: add `is_cross_bu` flag to Employee Work Log Hours Summary

## Context

The Employee Work Log Hours Summary report has two endpoints:

1. **Summary list** — `GET /reports/employee-work-log-hours-summary`  
   Returns one row per employee with `total_hours`, etc.

2. **Detail drill-down** — `GET /reports/employee-work-log-hours-summary/:employeeId`  
   Returns the employee's individual work log entries for a given period.

The frontend modal (opened by clicking a row) shows each entry's project, service PO, hours, type, and status. We want to badge entries that belong to a project from a **different Business Unit** than the employee's own BU — "Cross BU" entries.

## Current detail response shape (entries array)

```json
{
  "data": {
    "employee": {
      "full_name": "Isha Verma",
      "employee_code": "EMP-00815"
    },
    "total_hours": 100,
    "work_log_count": 1,
    "entries": [
      {
        "work_log_id": 123,
        "date": "2026-09-30",
        "service_po_code": "4424 - checkp",
        "service_po_name": "...",
        "project_code": "PO-20260630-H...",
        "project_name": "...",
        "module": null,
        "hierarchy_task": null,
        "start_time": null,
        "end_time": null,
        "hours": 100,
        "original_hours": null,
        "entry_type": "MONTHLY",
        "status": "synced"
      }
    ]
  }
}
```

## What we need

### 1. `is_cross_bu` on each entry

Add a boolean `is_cross_bu` to every object inside the `entries` array:

```json
{
  "work_log_id": 123,
  "date": "2026-09-30",
  "project_code": "PO-20260630-H...",
  "project_name": "...",
  "hours": 100,
  "entry_type": "MONTHLY",
  "status": "synced",
  "is_cross_bu": true
}
```

**Definition:** `is_cross_bu = true` when the **project's Business Unit** differs from the **employee's own Business Unit**.

- `true`  — project BU ≠ employee BU (cross-BU work log entry)
- `false` — same BU, or project has no BU (treat as false)

### 2. `is_cross_bu` on the employee object (optional but helpful)

If any entries are cross-BU, also set `is_cross_bu: true` on the top-level `employee` object:

```json
{
  "data": {
    "employee": {
      "full_name": "Isha Verma",
      "employee_code": "EMP-00815",
      "is_cross_bu": true
    },
    ...
  }
}
```

The frontend will show a "Cross BU" badge in the modal header when `employee.is_cross_bu` is true, and a "Cross BU" badge inline with the project name for each entry where `entry.is_cross_bu` is true.

## Why

The modal currently shows no indication when an employee logs hours to a project outside their own BU. Managers and admins need this visibility to identify cross-BU resource usage at a glance.

## Scope

Only the employee work log hours summary **detail** endpoint needs these new fields. The summary list endpoint (one row per employee) does not need changes.
