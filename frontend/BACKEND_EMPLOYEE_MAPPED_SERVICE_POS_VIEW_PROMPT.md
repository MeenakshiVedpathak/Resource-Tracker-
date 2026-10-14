# Backend: dedicated read endpoint for an Employee's full mapped Service PO list

## Context

Employee Master now has a read-only "View" drawer per row (profile info, Role/BU/Sub-BU mapping, and a paginated list of every Service PO the Employee is currently mapped to). The Role/BU data comes from the existing `GET /employees/:id/mappings`. For Service POs, there is no equivalent dedicated read endpoint, so the frontend currently reuses `GET /employee-servicepo-mapping/employee/:id/options` (the endpoint that backs the "Manage Service PO Mapping" checkbox dialog) — but that endpoint has a gap for this read-only use case.

## The gap

That endpoint returns:
- `mapped_service_po_ids` — the full, authoritative list of currently-mapped Service PO ids.
- `eligible_service_pos` — full objects (name, code, client, project) for Service POs **currently eligible to be newly added**, scoped by the Employee's current BU reach.

Confirmed live (employee id 373): `mapped_service_po_ids` had 8 ids, but `eligible_service_pos` only had 7 objects, and 2 of the mapped ids (`179`, `186`) were not present in it at all. So a mapped Service PO whose eligibility has since changed (e.g. the Employee's BU mapping shifted, or the PO was closed) has no name/client/project available anywhere in this response — the drawer has to show it as a bare "Service PO #179" with no further detail, which isn't great for a feature whose whole point is showing full info.

This endpoint also returns everything in one shot with no pagination — fine for a checkbox list with a handful of options, but not a great contract for "show me everything this Employee is mapped to," which could in principle be a long list.

## What we need

**`GET /employees/:id/mapped-service-pos`** (or similar) — a dedicated, paginated read endpoint:

- Returns every Service PO currently mapped to that Employee, **regardless of current eligibility** — i.e., sourced from the mapping table itself (same rows `mapped_service_po_ids` comes from), each joined to its own Service PO record for full detail (`service_po_code`, `service_po_name`, `client`, `project`, `status`), not filtered down to only those also in the "addable" set.
- Each row also carries whether the Employee is the Project Manager on it (`is_project_manager`), same as `project_manager_service_po_ids` does today.
- Standard `page`/`limit` pagination (same shape as every other paginated list endpoint in this API — `meta: { total, page, limit, totalPages }`).
- Read-only — no interaction with the existing save/options endpoints, which keep working exactly as they do today for the edit dialog.

## Frontend

Until this exists, the View drawer resolves what it can from the existing options endpoint (client-side pagination over the resolved list) and shows an unresolved mapped id as a bare "Service PO #<id>" row. Once the new endpoint ships, swap the drawer's Service PO section to call it directly with real server-side pagination instead.
