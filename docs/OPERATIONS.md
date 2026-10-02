# Operations

How to run, observe and maintain a Vantage deployment. This document is
deliberately explicit about what the current release does and does not do.

## 1. Runtime footprint

- Stateless Node.js / serverless functions. No database, no background worker,
  no persistent socket.
- In-memory capability cache (TTL `VIRTUALIZOR_CAPABILITY_TTL_S`, default 300s)
  and in-memory rate-limit counters.
- Because the app is stateless, restarts/redeploys simply reset caches and
  counters; there is no data to lose.

## 2. Logging

Vantage emits **single-line JSON** through one structured logger
(`lib/api/logger.ts`):

```json
{"level":"warn","time":"2026-01-01T00:00:00.000Z","message":"api_error","requestId":"...","code":"VIRTUALIZOR_HTTP_ERROR","status":502,"path":"/api/vps/42/power"}
```

Fields that may appear: `requestId`, `action`, `code`, `status`, `durationMs`,
`vpsId`, `actor`, plus the primary `message`.

Guarantees:

- **Secrets are redacted.** Values of `VIRTUALIZOR_API_KEY`,
  `VIRTUALIZOR_API_PASS`, `AUTH_SECRET` and `DASHBOARD_PASSWORD` are scrubbed
  from messages, and any field whose name matches
  `pass|secret|key|token|authorization|cookie` becomes `[redacted]`.
- **Request URLs are never logged** (they carry credentials in the query
  string), and response bodies are never logged.
- Level is controlled by `VANTAGE_LOG_LEVEL` (`debug|info|warn|error`, default
  `info`). Use `debug` temporarily; keep `info` in production.

### What is not implemented (today)

- **No persistent audit log.** There is no durable record of who changed what.
  `actor` is a field placeholder only. If you need an audit trail, forward the
  JSON logs to your log platform or add an opt-in store (see §6).
- **No alerting/integrations.** `NOTIFY_*` variables are reserved placeholders;
  no webhook, Discord or Slack message is ever sent.

## 3. Health and observability

| Endpoint | Purpose | Auth |
| --- | --- | --- |
| `/api/health` | Liveness + non-secret config summary (`configured`, `missing[]`, booleans) | public |
| `/api/capabilities` | Which Virtualizor actions this panel supports | session (or dev-open) |

Recommended monitors:

- Uptime check on `/api/health` (expect `configured: true`).
- Error-rate alert on log lines with `level":"error"` or `status>=500`.
- Rate-limit alert on `429` spikes (`code":"RATE_LIMITED"`).

## 4. Rate limiting operations

- Login: `RATE_LIMIT_LOGIN_MAX` per `RATE_LIMIT_LOGIN_WINDOW_S` (defaults 8/300s).
- Mutations: `RATE_LIMIT_MUTATION_MAX` per `RATE_LIMIT_MUTATION_WINDOW_S`
  (defaults 60/60s).
- Client identity prefers `x-vercel-forwarded-for`, then `x-real-ip`, then the
  first `x-forwarded-for` entry. Behind a proxy, ensure the platform sets one of
  these so per-user limits are meaningful.
- These counters are per instance and reset on restart/cold start. They are a
  pragmatic abuse control, not a distributed guarantee.

## 5. Routine maintenance

- **Dependency updates**: review and update regularly; run `npm run verify`
  after each change.
- **Node runtime**: track the Node LTS line; Vantage requires >= 20.9.
- **Session secret**: keep `AUTH_SECRET` stable; rotate deliberately (see §7).
- **Certificate**: keep the Virtualizor panel certificate valid and
  hostname-correct; Vantage will not bypass TLS errors.

## 6. Optional persistence (reserved)

The app is intentionally stateless. `KV_REST_API_URL` /
`KV_REST_API_TOKEN` are reserved for a future durable backend (distributed rate
limiting, audit trail, preferences). They are **not read by the current build**.
Any addition must:

- be strictly opt-in,
- degrade gracefully when unset (never fail a request because persistence is
  unavailable),
- never store Virtualizor credentials.

## 7. Backups of Vantage itself

What to back up:

- **Configuration/secrets**: the environment variables (store them in your
  secret manager / Vercel project settings). These are not in the repository.
- **Source and lockfile**: Git plus `package-lock.json`.
- **Nothing else**: there is no application database or local state to back up.

Recovery procedure:

1. Restore the repository at the desired commit.
2. Recreate the environment variables.
3. Deploy / `npm run build && npm start`.
4. Verify `/api/health` and `/api/vps`.

Rotating `AUTH_SECRET` after a suspected compromise invalidates all sessions;
rotate the Virtualizor API key/pass as described in `SECURITY.md` §10.

## 8. Incident checklist

1. Check `/api/health` and platform logs (redacted JSON).
2. Confirm the panel is reachable and credentialed (see `TROUBLESHOOTING.md`).
3. If abuse is suspected, lower `RATE_LIMIT_*` and rotate `DASHBOARD_PASSWORD`.
4. If panel credentials leaked, rotate the API key/pass and redeploy.
5. Record the timeline; there is no built-in audit store, so rely on forwarded
   logs.

## 9. Change management

- All changes go through `npm run verify` (lint, typecheck, tests, production
  build).
- Deploy to a preview environment first; point previews at non-production
  credentials where possible.
- Keep `AUTH_SECRET` and credential changes coordinated with operators.
