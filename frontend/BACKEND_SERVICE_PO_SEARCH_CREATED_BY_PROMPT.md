# Backend: `GET /service-pos?search=...` misses a record that matches on Created By

## Bug

On Service PO Master, searching by the creator's name (`?search=<text>`) does not reliably return every Service PO created by that person — at least one matching record is silently missing from the results.

Repro (reported live by a user, logged in as superadmin — I could not independently re-verify against the dev tunnel myself because it's currently returning `{"success":false,"message":"permission denied for table employee_login_sessions"}` on login, a separate DB-permission issue worth checking too):

- `GET /service-pos?search=anand balaji` returns exactly 10 Service POs, all created by "anand balaji" — so the search IS matching against the creator's name, not just `service_po_name`/`service_po_code`/Client/Project.
- One more Service PO, **"ADGO"** (`service_po_code: ADG0001`), was ALSO created by "anand balaji" (confirmed via that row's own "Created By" column / detail page — exact match, no spelling/casing difference) but is **missing** from that 10-result set.
- `GET /service-pos?search=adgo` correctly finds that same record by its own name — so the record itself, and the general search mechanism, both work. It's specifically the "search by creator name" path that drops this one row.

## What to check

- Whatever query/index backs the creator-name portion of `?search=` — is it doing a true `OR` across every creator the way it should, or could it be hitting a join/pagination/ranking limit that silently drops some matches once the creator has enough POs? (10 results currently return for this creator; worth checking whether there's an off-by-one, a `LIMIT` inside a subquery, or a broken `JOIN` with the `is_centralised`/BU-less rows — ADGO's own row didn't show a BU name either, going by the screenshot, so it may share whatever path the previous `businessUnitIds` null-company bug (see `BACKEND_SERVICE_PO_BU_FILTER_FIX_PROMPT.md`) was hitting.)
- Confirm the creator-name match is case/whitespace-insensitive and isn't silently failing for a specific row due to a NULL/duplicate join key.

## Frontend

No frontend change — `src/pages/servicePOs/ServicePOList.jsx` sends `search` as a single plain debounced string param and renders whatever the API returns; this is purely a backend query/index issue.
