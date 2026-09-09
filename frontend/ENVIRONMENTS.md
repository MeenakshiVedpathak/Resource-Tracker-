# Environments — build once, deploy anywhere
 
The frontend bundle contains **no environment-specific values**. One `npm run build`
artifact is valid for every target; the only thing that changes per deployment is the
static file `env-config.js`, which is served next to the bundle and read at page load.
 
This removes the old failure mode where a build made with one target's
`VITE_API_BASE_URL` was deployed to a different server.
 
## How it works
 
| Value | Before | Now |
|---|---|---|
| API base url | `VITE_API_BASE_URL`, inlined at build time | `window.APP_CONFIG.apiUrl`, read at runtime from `/env-config.js` |
| Microsoft redirect uri | `VITE_MICROSOFT_REDIRECT_URI`, inlined at build time | derived at runtime: `window.location.origin + ROUTES.MICROSOFT_CALLBACK` |
 
- `public/env-config.js` is a static asset. Vite copies `public/` into `dist/` verbatim —
  it is **not** parsed, transformed, hashed, or bundled, so it can be rewritten after the
  build without invalidating anything.
- [index.html](index.html) loads it with a plain `<script src="/env-config.js">` **before**
  the `type="module"` bundle. Classic scripts run at parse time and module scripts are
  deferred, so `window.APP_CONFIG` is always set before any app code runs.
- The redirect uri needs no config at all: on every origin it resolves to that origin's own
  `/auth/microsoft/callback`.
 
## Per-environment `env-config.js`
 
The deploy script writes one of these to `env-config.js` in the served directory
(`dist/env-config.js` after a build) before starting/serving the app.
 
**Trackio**
```js
window.APP_CONFIG = { apiUrl: "https://trackio.gttdata.ai:7465/api/v1" };
```
 
**RUTQA**
```js
window.APP_CONFIG = { apiUrl: "https://rutqa.gttdata.ai:7455/api/v1" };
```
 
**Railway**
```js
window.APP_CONFIG = { apiUrl: "https://rutbackend-production.up.railway.app/api/v1" };
```
 
**RUT Portal**
```js
window.APP_CONFIG = { apiUrl: "https://rut.gttdata.ai:7456/api/v1" };
```
 
**Local dev** — put the actual local/devtunnel url straight into `public/env-config.js`.
The Vite dev server serves `public/` as-is, so there is no substitution step and
`npm run dev` is unchanged:
```js
window.APP_CONFIG = { apiUrl: "https://24d9qpd0-5555.inc1.devtunnels.ms/api/v1" };
```
 
### Generating the file at deploy time
 
Ready-made files for each target are in [deploy-configs/](deploy-configs/) — just copy the
right one over `dist/env-config.js` after building:
 
```bash
cp deploy-configs/env-config.trackio.js dist/env-config.js      # Trackio
cp deploy-configs/env-config.rutqa.js dist/env-config.js        # RUTQA
cp deploy-configs/env-config.railway.js dist/env-config.js      # Railway
cp deploy-configs/env-config.rut-portal.js dist/env-config.js   # RUT Portal
```
 
Otherwise, write the file wholesale, or substitute the placeholder in
[public/env-config.template.js](public/env-config.template.js), which ships as
`dist/env-config.template.js`:
 
```bash
# wholesale
printf 'window.APP_CONFIG = { apiUrl: "%s" };\n' "$API_URL" > dist/env-config.js
 
# or from the template
sed "s|__API_URL__|$API_URL|" dist/env-config.template.js > dist/env-config.js
```
 
Serve `env-config.js` with `Cache-Control: no-store` (or no-cache). It must never be
cached across a redeploy, otherwise a browser can pair a fresh bundle with a stale api url.
 
## Entra App Registration
 
Because the redirect uri is derived from the browser's origin, **every origin the app is
served from must be registered as an SPA redirect uri** on the Entra App Registration:
 
- `https://localhost:5173/auth/microsoft/callback`
- `https://trackio.gttdata.ai/auth/microsoft/callback`
- `https://rutqa.gttdata.ai/auth/microsoft/callback`
- `https://rut.gttdata.ai/auth/microsoft/callback`
- `https://rutbackend-production.up.railway.app/auth/microsoft/callback` *(if the SPA is served from Railway too)*
 
These are the same urls the old `VITE_MICROSOFT_REDIRECT_URI` held, so no Entra change is
needed for targets that already worked. Tenant id and client id are unchanged and remain
ordinary build-time env vars — they are identical in every environment.
 
## `.env`
 
`.env` now holds only values that are the same everywhere, so it never differs per target:
 
```
VITE_APP_NAME, VITE_APP_VERSION, VITE_RBAC_MOCK,
VITE_MICROSOFT_TENANT_ID, VITE_MICROSOFT_CLIENT_ID
```
 
 