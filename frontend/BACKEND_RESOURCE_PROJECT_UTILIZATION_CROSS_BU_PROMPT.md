# Backend prompt: add `is_cross_bu` flag to project rows in Resource Project Utilization report

## Context

The Resource Project Utilization report (`GET /reports/resource-project-utilization-report`) returns
one row per employee, and each row has a `projects` array. The frontend drawer (per-employee detail
panel) renders those projects one by one. We want to badge projects that belong to a different
Business Unit from the employee themselves — "Cross BU" projects.

## Current response shape

```json
{
  "data": [
    {
      "employeeName": "Virat Kohli",
      "totalHours": 168.0,
      "originalTotalHours": 266.0,
      "projects": [
        {
          "client": "antiAI",
          "projectName": "AI Mango",
          "projectType": "Project",
          "category": "Billable",
          "projectHours": 60.8,
          "originalProjectHours": 100.0,
          "billableAmount": 0
        }
      ]
    }
  ]
}
```

## What we need

Add a boolean field `is_cross_bu` to each object inside the `projects` array.

Definition: `is_cross_bu = true` when the **project's Business Unit** (i.e. the BU of the employee
or admin who created the project — same definition used in `BACKEND_CREATED_BY_AND_PROJECT_BU_PROMPT.md`)
differs from the **employee's own BU** (the BU this employee row belongs to).

```json
{
  "client": "antiAI",
  "projectName": "AI Mango",
  "projectType": "Project",
  "category": "Billable",
  "projectHours": 60.8,
  "originalProjectHours": 100.0,
  "billableAmount": 0,
  "is_cross_bu": true
}
```

- `is_cross_bu: true`  — project BU ≠ employee BU (cross-BU assignment)
- `is_cross_bu: false` — same BU (or project has no BU, treat as false)

## Why

The frontend needs this flag to display a clearly visible "Cross BU" badge in the drawer so
managers/admins can instantly see which projects an employee is working on outside their own BU.
There is no way to derive this correctly on the frontend — we don't have the project's BU in the
current response, and a client-side BU lookup would break for BU-scoped logins that can't see
records from other BUs.

## No other change needed

Only the `projects` array entries inside this one report endpoint need the new field. No other
endpoint is affected.
