# Backend prompt: add Project Manager name(s) to GET /service-pos

## Context

We want a "Project Manager" column on the Service PO Master list, showing every employee currently
marked as PM for that Service PO (comma-separated when there's more than one — a Service PO can have
multiple PMs, same as the existing PM assignment feature on Employee Master / Service PO's own "Map
Employees" screen).

Checked live: `GET /service-pos` doesn't carry this today. Sample row (trimmed):
```json
{
  "id": 161,
  "service_po_name": "IKOOOOOOOOOOOOO",
  "client": { "id": 37, "client_name": "Pre-Sales Client" },
  "project": { "id": 88, "project_name": "Pre-Sales PO" },
  "deliveryHead": null,
  "creator": { "id": 3, "full_name": "superadmin" }
}
```
No PM field anywhere. The `is_project_manager` flag lives on the employee↔Service PO mapping
relation (set via the "Map Employees"/"Map Roles & Business Units" PM checkbox), not on the Service
PO row itself, so this can't be derived from anything already in this response.

We know this is already computed server-side at least once elsewhere: the Consolidated Monthly
Report (`GET /reports/resource-cost-utilization`) already returns a `projectManagers` array of names
per row for the same underlying PM relation. Same computation, just needed on this endpoint too.

## Ask

Add each Service PO's current PM(s) to `GET /service-pos`' response — an array is preferred (lets
the frontend join/format it however the column needs, and avoids re-parsing a pre-joined string):
```json
{
  "id": 161,
  "service_po_name": "IKOOOOOOOOOOOOO",
  "project_managers": [
    { "id": 45, "full_name": "Priya Sharma" },
    { "id": 88, "full_name": "Ravi Kumar" }
  ]
}
```
An empty array (not null/omitted) when nobody's currently marked PM for that Service PO.

## Not needed

No change needed to the PM assignment endpoints themselves (Employee Master's mapping save, Service
PO's own "Map Employees" PM toggle) — this is read-only, additive to the list response only.
