# Vantage

Vantage is a secure, premium control panel for a single Virtualizor Enduser
account, built with Next.js 15 (App Router) and designed for Vercel. It talks to
the Virtualizor Enduser API entirely from the server: credentials never reach the
browser, never appear in logs, and never ship in a client bundle.

The interface is built on the **Orbit** design system (documented in.
`docs/DESIGN-SYSTEM.md`).

- Dashboard, live monitoring and status history
- Power, VNC, rescue mode, hostname, root password and OS reinstall
- Firewall plans, SSH keys, backups, volumes, ISO library, services/processes
- Reverse DNS, DNS zones/records, API keys, task/activity feed
- Security center, access control, developer center, automation, notifications,
  templates, infrastructure, account, support and admin sections
- Operator audit trail of every mutating request, surfaced in Logs and Security
- Runtime capability detection so unsupported provider features are labeled
  `Unavailable` instead of being faked

---

## 1. What it is

A single-tenant operations console. One deployment manages one Virtualizor
Enduser account (the primary VPS is configured with `VIRTUALIZOR_VPS_ID`; other
instances on the same account are discovered from the VPS list).

Every value shown in the UI is derived from a real API response. When the panel
does not support an action or returns no data, Vantage says so explicitly. It
never invents metrics, statuses or history.

## 2. Architecture at a glance

```
Browser (React 19 + TanStack Query)
        │  fetch /api/*  (same-origin, cookie session)
        ▼
Next.js Route Handlers  (app/api/**)
        │  server-only, auth + CSRF + rate limit + validation
        ▼
Vantage action layer  (lib/virtualizor/actions.ts)
        │
        ▼
Virtualizor client  (lib/virtualizor/client.ts)
        │  HTTPS, no redirects, timeout + size ceiling
        ▼
Virtualizor Enduser API  (index.php?api=json&act=...)
```

- **Server-only modules** import `server-only`, so an accidental client import
  fails the build instead of leaking credentials.
- **Route handlers** are thin: authenticate, validate with Zod, call an action,
  return a normalized JSON envelope.
- **The action layer** owns every Virtualizor `act`, so the wire format lives in
  exactly one place.

Full detail: `docs/ARCHITECTURE.md`.

## 3. Requirements

- Node.js **>= 20.9**
- A Virtualizor Enduser account with API access (key + pass)
- The panel reachable over **HTTPS** with a valid certificate (TLS verification
  is always enforced; self-signed certificates are not supported)

## 4. Installation

```bash
npm install
cp .env.example .env.local
# edit .env.local with your own values
npm run dev
```

Open the printed local URL. In development with no `DASHBOARD_PASSWORD`
configured the console runs in **dev-open** mode; in production it **fails
closed** and returns `503` until credentials are configured.

## 5. Local development

```bash
npm run dev        # start the dev server
npm run lint       # ESLint (next lint)
npm run typecheck  # tsc --noEmit
npm run test       # Vitest unit/integration suite
npm run test:watch # Vitest in watch mode
npm run verify     # lint + typecheck + test + production build
```

Coverage thresholds (lines/functions/statements 55, branches 60) are enforced
when coverage is enabled (`npx vitest run --coverage`).

## 6. Environment variables

Copy `.env.example` to `.env.local`. **Never** prefix a secret with
`NEXT_PUBLIC_`.

### Virtualizor connection (required, server-side only)

| Variable | Required | Description |
| --- | --- | --- |
| `VIRTUALIZOR_URL` | yes | Panel origin including protocol and port, e.g. `https://panel.example.com:4083`. Must be HTTPS. |
| `VIRTUALIZOR_API_KEY` | yes | Enduser API key. |
| `VIRTUALIZOR_API_PASS` | yes | Enduser API pass. |
| `VIRTUALIZOR_VPS_ID` | recommended | Default/primary VPS ID. Without it, VPS-scoped actions fail with a clear config error. |

### Virtualizor client tuning (optional)

| Variable | Default | Description |
| --- | --- | --- |
| `VIRTUALIZOR_TIMEOUT_MS` | `15000` | Per-request timeout. |
| `VIRTUALIZOR_LONG_TIMEOUT_MS` | `60000` | Timeout for long ops (reinstall, backup, restore). |
| `VIRTUALIZOR_MAX_RESPONSE_BYTES` | `2097152` | Upstream response size ceiling before abort. |
| `VIRTUALIZOR_CAPABILITY_TTL_S` | `300` | Capability probe cache TTL. |

### Dashboard authentication (required in production)

| Variable | Default | Description |
| --- | --- | --- |
| `DASHBOARD_PASSWORD` | — | Shared password for the dashboard and API. |
| `AUTH_SECRET` | — | Random secret used to sign the session cookie. `openssl rand -hex 32`. |
| `AUTH_SESSION_HOURS` | `12` | Session lifetime; clamped to a safe maximum (30 days). |

### Rate limiting (optional)

| Variable | Default | Description |
| --- | --- | --- |
| `RATE_LIMIT_LOGIN_MAX` | `8` | Login attempts per window per client. |
| `RATE_LIMIT_LOGIN_WINDOW_S` | `300` | Login limiter window. |
| `RATE_LIMIT_MUTATION_MAX` | `60` | Mutating requests per window per client. |
| `RATE_LIMIT_MUTATION_WINDOW_S` | `60` | Mutation limiter window. |

### Reserved (not read by the current build)

`KV_REST_API_URL`, `KV_REST_API_TOKEN`, `NOTIFY_WEBHOOK_URL`,
`NOTIFY_DISCORD_URL`, `NOTIFY_SLACK_URL`, `VANTAGE_APP_NAME` are placeholders
for optional future integrations. The current release is fully stateless and
sends no webhooks; setting these has no effect.

| Variable | Default | Description |
| --- | --- | --- |
| `VANTAGE_ALLOWED_ORIGINS` | — | Comma-separated extra origins allowed for state-changing requests. |
| `VANTAGE_LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error`. |
| `VANTAGE_AUDIT_LIMIT` | `500` | Maximum in-memory audit records retained per instance (capped at 5000). |

## 7. Creating Virtualizor Enduser API credentials

1. Log in to the Virtualizor **Enduser** panel (not the admin panel).
2. Open **API Credentials** (or a similarly named section) and generate an API
   key and API pass for your account.
3. Copy both values into `VIRTUALIZOR_API_KEY` and `VIRTUALIZOR_API_PASS`.
4. Grant the key access to the VPS you want to manage.

The credentials are scoped to the account that created them and are used only
from server code.

## 8. Finding your VPS ID and panel URL

- **Panel URL**: the origin you use to log in to the enduser panel, including
  the port, e.g. `https://panel.example.com:4083`. It must serve HTTPS.
- **VPS ID**: open the VPS in the panel; the URL or the VPS details page shows a
  numeric ID (`svs`). The dashboard also lists instances returned by `listvs`.

## 9. Testing the API

With `VIRTUALIZOR_*` configured, the internal health and capability routes are
the quickest sanity checks:

```bash
# Liveness + configuration summary (no secrets returned)
curl -s http://localhost:3000/api/health

# Probe which Virtualizor actions this panel supports
curl -s http://localhost:3000/api/capabilities
```

If authentication is enabled, sign in first and reuse the session cookie:

```bash
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"password":"your-dashboard-password"}'
curl -s -b cookies.txt http://localhost:3000/api/vps
```

Direct panel checks (replace with your own values; do not paste real
credentials into shared shells):

```
https://panel.example.com:4083/index.php?api=json&act=listvs&apikey=KEY&apipass=PASS
```

## 10. Deploying to Vercel

1. Push the repository to your Git provider and import it into Vercel.
2. Vercel detects Next.js automatically; no `vercel.json` is required.
3. Add the environment variables from section 6 in **Project Settings →
   Environment Variables**.
4. Because Vercel snapshots environment variables per deployment, **redeploy
   after changing them**.
5. Deploy with the default build command (`next build`).

Self-hosting on Node:

```bash
npm ci
npm run build
npm run start   # serves the production build
```

Set environment variables through your process manager or secret store; never
commit `.env.local`.

## 11. Security considerations

- Credentials are server-only (`import "server-only"`); an accidental client
  import fails the build.
- The dashboard session is a signed, `HttpOnly`, `SameSite=Lax` cookie; `Secure`
  is set in production.
- Production fails closed: with no `DASHBOARD_PASSWORD`/`AUTH_SECRET` the API
  returns `503` rather than allowing anonymous access.
- Mutations require a same-origin `Origin` header (CSRF defense) and are rate
  limited.
- The upstream client refuses redirects, enforces TLS verification, a timeout and
  a response size ceiling, and redacts secrets from all error messages and logs.
- Security headers and a restrictive CSP are applied in `next.config.mjs`.

See `docs/SECURITY.md`.

## 12. API architecture

All internal endpoints live under `/api` and return:

```json
{ "success": true, "data": { }, "requestId": "..." }
```

```json
{ "success": false, "error": { "code": "VIRTUALIZOR_HTTP_ERROR", "message": "..." }, "requestId": "..." }
```

Routes are grouped by resource (`/api/vps/[id]/power`, `/api/volumes`,
`/api/dns/[zoneId]/records`, ...). The complete mapping from Virtualizor `act`
to client action, route, hook and UI lives in `docs/API-MAP.md`.

Two routes are Vantage-native rather than Virtualizor-backed:

- `GET /api/audit` returns the in-memory trail of mutating requests performed
  through the dashboard (filterable by `resource`, `search`, `success` and
  `limit`).
- `GET /api/auth/session` reports the resolved authentication mode.

### Application sections

The sidebar is grouped into **Operate**, **Insight**, **Security**,
**Automation** and **Platform**:

| Group | Sections |
| --- | --- |
| Operate | Overview, VPS, Console, Network, Storage, Snapshots, Backups, Files |
| Insight | Monitoring, Health, Logs, Tasks, System |
| Security | Security, Access, API |
| Automation | Automation, Notifications, Templates |
| Platform | Infrastructure, Account, Support, Admin, Settings |

## 13. Troubleshooting

See `docs/TROUBLESHOOTING.md` for a symptom → cause → fix table and
sanity-check commands.

### Common Virtualizor errors

| Message / symptom | Likely cause |
| --- | --- |
| `VIRTUALIZOR_CONFIG_ERROR` | `VIRTUALIZOR_URL`/API key/pass missing or invalid URL. |
| `AUTH_CONFIG` (503) | Production without `DASHBOARD_PASSWORD` + `AUTH_SECRET`. |
| `VIRTUALIZOR_HTTP_ERROR` | Panel rejected the key, or the action is not permitted. |
| TLS / certificate error | Panel uses a self-signed or invalid certificate. Install a valid cert. |
| Redirect issued error | `VIRTUALIZOR_URL` is not the API origin (a login page or proxy redirect). |
| `VIRTUALIZOR_NOT_FOUND` | `VIRTUALIZOR_VPS_ID` does not exist for this key. |
| A feature shows `Unavailable` | The panel build does not support that `act`. |

## 14. Credential rotation

1. Generate a new API key/pass in the Virtualizor enduser panel.
2. Update `VIRTUALIZOR_API_KEY` / `VIRTUALIZOR_API_PASS` in your environment.
3. Redeploy (Vercel) or restart the Node process.
4. Verify with `/api/health` and `/api/vps`.
5. Revoke the old key in the panel.

Rotate `AUTH_SECRET` to invalidate all existing dashboard sessions; users must
sign in again. Rotate `DASHBOARD_PASSWORD` at the same time.

## 15. Disabling unsupported features

Vantage detects capability at runtime by probing read-only actions. Features that
are unsupported return `Unavailable` and their controls are disabled. To keep an
unsupported action from being attempted at all, remove or gate the corresponding
UI entry point in the relevant page under `app/(dashboard)/`. The action layer
and route remain, so no client change can bypass the server-side guard.

## 16. Documentation index

| Document | Contents |
| --- | --- |
| `docs/ARCHITECTURE.md` | Layers, request lifecycle, server/client boundary, caching. |
| `docs/PLATFORM.md` | Every sidebar section, its data source and capability boundary. |
| `docs/VIRTUALIZOR.md` | Enduser API request shape, auth, params, envelopes, limits. |
| `docs/API-MAP.md` | `act` → action → route → hook → UI mapping. |
| `docs/SECURITY.md` | Credential isolation, session model, CSRF, CSP, threat model. |
| `docs/DEPLOYMENT.md` | Vercel and self-host deployment, networking/TLS. |
| `docs/TROUBLESHOOTING.md` | Symptom → cause → fix and sanity checks. |
| `docs/DESIGN-SYSTEM.md` | Orbit tokens, components, theming, motion, a11y. |
| `docs/OPERATIONS.md` | Logging, rate limits, backups of Vantage itself. |
