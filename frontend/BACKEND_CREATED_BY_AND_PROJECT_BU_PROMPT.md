# Backend prompt: add creator name to Client/Project/Service PO, and a Business Unit to Project

## Context

We're adding a "Created By" column to Client Master, Project Master, and Service PO Master, and a
"Business Unit" column to Project Master (which doesn't have one today). Checked all three list
endpoints live first — this can't be done safely from the frontend alone, for the reasons below.

## 1. "Created By" — Client, Project, Service PO (all three)

Confirmed live: all three already return `created_by`, but only as a bare numeric employee id, with
no name anywhere in the response.

```json
// GET /clients — current
{ "id": 60, "client_name": "Aarti Industries Ltd-Baroda", "created_by": 156, "company": {...} }

// GET /projects — current
{ "id": 18, "project_name": "Alpharithm WP Sitee", "created_by": 267, "client": {...} }

// GET /service-pos — current
{ "id": 157, "service_po_name": "SSS", "created_by": 268, "client": {...}, "project": {...} }
```

We can't safely turn that id into a name on the frontend: it would need fetching the full employee
list and matching client-side, but (a) a BU-scoped login (BU Admin, BU Head, etc.) can only list
employees within their own reach, so a `created_by` id belonging to a different BU's employee
(created by an Admin, or before the record moved BUs) would come back unresolved for them, and (b) a
creator who has since left the company wouldn't appear in an "active employees" list at all.

**Ask**: same pattern these responses already use for `client`/`project`/`company` — add a small
nested object with at least the creator's name, e.g.:
```json
{ "created_by": 156, "creator": { "id": 156, "full_name": "Jane Doe" } }
```

## 2. Business Unit on Project

Confirmed live: unlike Client (`company_id` + `company: {...}`) and Service PO (`company_id`), a
Project carries **no Business Unit field at all** today:
```json
{
  "id": 18,
  "client_id": 3,
  "project_name": "Alpharithm WP Sitee",
  "created_by": 267,
  "client": { "id": 3, "client_name": "Alpharithm technologies Pvt Ltdd" },
  "total_service_pos": 1
}
```

Product decision: a Project's own "Business Unit" is meant to read as **whichever BU its creator
belongs to** — e.g. a Project created by a "UV Tech" BU Admin should show "UV Tech" as its Business
Unit. (Not the Service PO's own `company_id` — a Project can have multiple Service POs, and per the
existing contract a Service PO's own BU can legitimately differ from its Project's, so that's not a
reliable single answer either.)

**Ask**: add the creator's Business Unit to `GET /projects`' response — either folded into the same
`creator` object from #1 above, or as its own field, e.g.:
```json
{
  "created_by": 267,
  "creator": { "id": 267, "full_name": "Jane Doe", "company_id": 30, "company_name": "UV Tech" }
}
```
Whichever shape is more convenient on your end is fine — the frontend just needs the creator's own
BU id + name somewhere in this response.

## Not needed

No change needed to Client's or Service PO's own Business Unit — `company`/`company_id` on those two
already resolve correctly (including Sub-BU support, already shipped) and this file doesn't touch
them. This is scoped to: creator name on all three list endpoints, plus a creator-derived Business
Unit on Project's specifically.
