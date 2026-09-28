# Backend prompt: PATCH /companies/:id silently ignores `entity_id`

## Context

BU Master's Edit form currently has no "Entity" dropdown at all — only Create does. We want to add
one so an existing BU can be moved to a different Entity, but before adding it we confirmed the
update endpoint doesn't actually support it yet.

## What we found (confirmed live)

Created a disposable test BU under Entity "Alpharithm" (id 3), then:

```
PATCH /companies/62
Body: { "entity_id": 4 }
```
→ `422 VALIDATION_ERROR`: `"At least one field must be provided for update."` — i.e. `entity_id`
isn't in the update schema's allowed field list at all, so after stripping unknown keys the body
is treated as empty.

Then sent it alongside a field that IS accepted:
```
PATCH /companies/62
Body: { "company_name": "ZZ TEST Entity Switch v2", "entity_id": 4 }
```
→ `200 OK`, `company_name` updated to "ZZ TEST Entity Switch v2" — but `entity_id` on the returned
record stayed `3`. So `entity_id` isn't validated/rejected, it's silently dropped from the update.

## Ask

Add `entity_id` to `PATCH /companies/:id`'s allowed/validated update fields, so it actually updates
the record when provided (positive integer, must reference an existing, active Entity — same
validation Create already does).

A few things worth deciding server-side, since this touches an existing BU with real data hanging
off it:
- Should moving a top-level Parent BU to a new Entity also move all of its Sub-BUs (they inherit
  their parent's Entity at creation)? We'd guess yes, but you know the schema constraints here
  better than we do.
- Should a Sub-BU be movable to a different Entity on its own (independent of its Parent), or
  should this only be allowed on a top-level BU (no `parent_business_unit_id`)? The frontend can
  gate the dropdown either way once we know the rule.
- Any existing Clients/Projects/Service POs/Employees mapped under that BU (or Entity-scoped
  reporting) — does changing entity_id need any cascade/re-check on your side, or is entity_id
  just a plain foreign key with no other server-side effects?

## Not needed

No change to Create — `POST /companies` already accepts and validates `entity_id` correctly. This
is only about `PATCH /companies/:id`.
