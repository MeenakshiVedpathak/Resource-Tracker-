# Backend prompt: Add `is_original_data_visible` toggle to BU Master UI / Admin API

## Context

Three monthly utilization reports — **Monthly Resource Utilization**, **Resource Monthly Utilization**,
and **Monthly Hours Trend** — have an "Original / Adjusted" toggle that lets authorized users switch
between original logged hours (before the monthly cap sync) and adjusted hours (after sync).

The frontend reads `is_original_data_visible` from the active Business Unit object returned at login.
If this flag is `false` (or missing) on the active BU, the toggle is completely hidden from the UI —
even SuperAdmin cannot see it.

Currently there is **no way to turn this flag on from any UI or admin panel**. It can only be set
directly in the database:

```sql
-- Check current state
SELECT id, name, is_original_data_visible FROM business_units;

-- Enable for a specific BU
UPDATE business_units
SET is_original_data_visible = true
WHERE id = <bu_id>;
```

After the DB update the user must **logout → login** for the setting to take effect (the flag is
loaded into the Redux store at login time, not polled at runtime).

---

## Ask

### 1. Expose the flag in the BU Create / Edit API

Add `is_original_data_visible` (boolean, default `false`) to:

- `POST /companies` — BU creation payload
- `PATCH /companies/:id` — BU update payload

Validation: must be a plain boolean. No other side-effects expected.

### 2. Return the flag on every BU response

Ensure `is_original_data_visible` is included in:

- `GET /companies` (list)
- `GET /companies/:id` (single)
- The BU array returned inside the login/me response (this is what the frontend reads)

If the column is currently missing from any of these responses, add it. The frontend key name must
stay exactly `is_original_data_visible`.

### 3. (Nice to have) Seed it as `false` for all existing BUs

Run a migration/seed that sets `is_original_data_visible = false` for any existing rows that
currently have `NULL`, so the column is never null in practice.

---

## Frontend side (already done — no changes needed there)

- `selectIsOriginalDataVisible` selector reads `!!bu.is_original_data_visible` from the active BU.
- `useCanViewOriginalData()` hook returns this value.
- Toggle is rendered only when `canViewOriginal === true`.
- BU Edit form will add an "Original data visible" toggle **after** the backend supports it
  (tracked separately in `BACKEND_BU_UPDATE_ENTITY_ID_PROMPT.md` for the edit endpoint pattern).
