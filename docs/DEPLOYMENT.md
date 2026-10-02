# Deployment

Vantage targets two deployment models: Vercel (recommended) and self-hosted
Node. Both are stateless; no database or persistent process is required.

## 1. Prerequisites

- A Virtualizor Enduser account with API credentials.
- The panel reachable over HTTPS with a valid certificate.
- Node.js >= 20.9 for self-hosting.

## 2. Vercel (recommended)

1. Push the repository to GitHub/GitLab/Bitbucket.
2. In Vercel, **Add New → Project** and import the repository. Next.js is
   detected automatically; the default build command is `next build`.
3. Under **Project Settings → Environment Variables**, add the variables in
   `README.md` §6. At minimum:
   - `VIRTUALIZOR_URL`
   - `VIRTUALIZOR_API_KEY`
   - `VIRTUALIZOR_API_PASS`
   - `VIRTUALIZOR_VPS_ID`
   - `DASHBOARD_PASSWORD`
   - `AUTH_SECRET`
4. Deploy.

Notes:

- **Vercel snapshots environment variables per deployment.** After changing an
  env var you must redeploy for it to take effect.
- No `vercel.json` is required. Security headers are applied by
  `next.config.mjs`, and the middleware matcher covers pages and `/api`.
- Functions run on the Node.js runtime. Route handlers pin
  `runtime = "nodejs"` and `dynamic = "force-dynamic"`.

### Preview vs production

- Preview deployments share the same environment variables **unless** you scope
  them to Production only. For previews it is often safest to point at a
  non-production Virtualizor account or leave credentials Production-scoped and
  set a distinct preview `DASHBOARD_PASSWORD`.
- `NODE_ENV=production` is set automatically by `next build`; do not override it
  in Vercel.
- In production Vantage fails closed: if `DASHBOARD_PASSWORD`/`AUTH_SECRET` are
  missing, protected routes return `503 AUTH_CONFIG`.

## 3. Self-hosted Node

```bash
npm ci
npm run build
NODE_ENV=production npm run start
```

- Set environment variables through your process manager (systemd `Environment=`,
  Docker `env_file`, etc.) or a secrets manager. Never commit `.env.local`.
- Bind behind a TLS-terminating reverse proxy (Nginx/Caddy/Traefik). Vantage's
  security headers and cookies assume HTTPS in production.
- Run `npm run verify` in CI to gate lint, typecheck, tests and the build.

### Minimal systemd unit

```ini
[Unit]
Description=Vantage VPS panel
After=network.target

[Service]
WorkingDirectory=/opt/vantage
EnvironmentFile=/etc/vantage/vantage.env
ExecStart=/usr/bin/npm run start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## 4. Networking and TLS requirements

- Outbound HTTPS from the server to the Virtualizor panel (custom port included).
- Inbound HTTPS from operators to Vantage.
- TLS verification to the panel is always enforced. Install a valid certificate
  on the panel; self-signed certificates are rejected by design.
- The upstream client refuses redirects. Ensure `VIRTUALIZOR_URL` is the API
  origin itself, not a login page or an intermediate proxy that redirects.
- If the panel sits behind a restrictive firewall, allow the deployment's egress
  addresses.

## 5. Optional persistence

The current release is stateless:

- Rate limiting is in-memory and best-effort per instance.
- There is no external KV/Redis/Postgres dependency, and none is required.

`KV_REST_API_URL`, `KV_REST_API_TOKEN` and the `NOTIFY_*` variables are reserved
placeholders and are **not read today**. Any future durable backend must be
opt-in and degrade gracefully when unset.

## 6. Cron / schedules

No cron or scheduled job is required; Vantage is request-driven. If you add
platform cron later, prefer Vercel Cron or an external scheduler hitting a
protected endpoint, and remember that scheduled requests still need a valid
session or an explicitly designed, authenticated trigger.

## 7. Rolling updates and rollback

- Vercel: use instant rollback to a previous deployment if a release regresses.
- Self-hosted: keep the previous build directory and switch the symlink/process;
  environment changes require a restart.
- Session cookies remain valid across restarts while `AUTH_SECRET` is unchanged.

## 8. Health checks

- `/api/health` — liveness plus a non-secret configuration summary. Use it for
  platform health checks and uptime monitors. It never returns credentials.
- `/api/capabilities` — which Virtualizor actions this panel supports (requires
  a session unless in dev-open mode).

## 9. Post-deploy checklist

1. `/api/health` reports `configured: true`.
2. Sign in with `DASHBOARD_PASSWORD`.
3. The VPS list loads and the primary VPS resolves.
4. `/system` shows capabilities and no configuration warnings.
5. A safe mutation (for example, VNC password) succeeds.
6. Response headers include CSP and `X-Frame-Options: DENY`.
