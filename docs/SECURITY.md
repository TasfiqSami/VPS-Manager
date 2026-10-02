# Security

Vantage handles Virtualizor Enduser credentials capable of controlling a VPS.
This document describes the controls that protect them and the dashboard.

## 1. Credential isolation

- **Server-only modules.** `lib/virtualizor/client.ts`, `config.ts`,
  `actions.ts`, `capabilities.ts` and everything under `lib/api/` import
  `server-only`. Importing any of them from a client component is a build error,
  not a runtime leak.
- **No public secrets.** No secret is ever read in client code and no secret is
  prefixed with `NEXT_PUBLIC_`. `next.config.mjs` does not inline them.
- **Never surfaced.** The panel URL, API key and API pass are not returned by
  any endpoint, are not included in the `HealthReport` (which exposes only
  boolean `hasApiKey`/`hasApiPass` and a `missing[]` list), and are not attached
  to client props or URLs.
- **Redaction.** `getRedactionSecrets()` collects `VIRTUALIZOR_API_KEY`,
  `VIRTUALIZOR_API_PASS`, `AUTH_SECRET` and `DASHBOARD_PASSWORD`;
  `redactSecrets()` scrubs them from every error message and log line.
- **No redirects.** The upstream client uses `redirect: "manual"` and refuses to
  follow redirects, so credentials cannot be replayed to another origin.

## 2. Authentication and session model

- The dashboard uses a single shared password (`DASHBOARD_PASSWORD`) plus a
  signed session token derived from `AUTH_SECRET`.
- The token is an HMAC-SHA256 signature over a base64url JSON payload
  (`{ iat, exp }`) built with Web Crypto, so the same logic runs in Edge
  middleware and Node route handlers.
- Session lifetime comes from `AUTH_SESSION_HOURS` (default 12, clamped to 30
  days).
- The cookie is `vantage_session`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and
  `Secure` in production.
- Token comparison uses a constant-time, length-checked comparison.
- `middleware.ts` gates pages and `/api/*`. Public exceptions are limited to
  `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`, `/api/health`, and
  the `/login` page.
- Login is rate limited with its own window (`RATE_LIMIT_LOGIN_*`).

### Fail-closed behavior

`getAuthConfig()` resolves one of three modes:

| Mode | Condition | Behavior |
| --- | --- | --- |
| `enabled` | password **and** secret set | full session verification |
| `dev-open` | nothing set, `NODE_ENV !== production` | convenience access, no auth |
| `blocked` | misconfigured (production with missing password/secret, or only one of them) | API returns `503 AUTH_CONFIG`; protected pages do not render console data |

Production never falls back to anonymous access.

## 3. CSRF / origin enforcement

All state-changing routes go through `apiMutation`, which calls
`assertMutationOrigin()`:

- In production an `Origin` header is required.
- The origin must match the request host (or the request URL origin), or be
  listed in `VANTAGE_ALLOWED_ORIGINS` (comma-separated).
- A cross-origin mutation is rejected with `403 ORIGIN_REJECTED`.

Combined with `SameSite=Lax` cookies, this blocks classic cross-site request
forgery.

## 4. Authorization scope

Vantage is single-tenant by design: one deployment serves one Virtualizor
Enduser account. There is no multi-user login and no privilege escalation path
between accounts. Account-level actions (SSH keys, volumes, DNS, API keys) use
`vpsId: null`; VPS-scoped actions require a resolved `svs` and fail with
`VIRTUALIZOR_CONFIG_ERROR` when none is available.

## 5. Input validation

- Every mutation body is parsed by `parseJsonBody()` and validated with a strict
  Zod schema in `lib/virtualizor/validators.ts`.
- Request bodies are capped at 256 KiB (`MAX_JSON_BODY_BYTES`).
- Schemas constrain types, lengths and enums: hostnames, passwords, OpenSSH key
  patterns, IPv4 addresses, DNS record types, HTTPS-only ISO URLs, numeric IDs.
- Route params are validated (for example, VPS IDs must be numeric).
- Invalid input returns `400` with a normalized, non-sensitive message.

## 6. Rate limiting

- A sliding-window in-memory limiter protects login and mutation endpoints.
- Client identity is derived from platform headers, preferring
  `x-vercel-forwarded-for`, then `x-real-ip`, then the first entry of
  `x-forwarded-for`.
- Exceeding a limit returns `429 RATE_LIMITED` with `Retry-After`.
- This is best-effort per instance. It is **not** a distributed guarantee; see
  `OPERATIONS.md` for the optional durable backend note.

## 7. Security headers and CSP

`next.config.mjs` applies these to every response:

| Header | Value |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'`; scripts/styles self + inline; `connect-src 'self'`; `frame-ancestors 'none'`; `object-src 'none'`; `form-action 'self'` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | camera/microphone/geolocation/payment disabled |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-DNS-Prefetch-Control` | `off` |

`unsafe-inline` for scripts/styles is required by Next.js without a nonce
pipeline (documented as a known trade-off). `unsafe-eval` is added only in
development. API responses are `Cache-Control: no-store`.

## 8. Transport security

- `VIRTUALIZOR_URL` must be HTTPS; plain HTTP is allowed only for loopback
  development hosts.
- TLS verification is always enforced. Self-signed/expired certificates fail
  with actionable guidance instead of being silently bypassed.
- The upstream client enforces a timeout and a response size ceiling, and it
  never follows redirects.

## 9. Threat model

| Threat | Mitigation |
| --- | --- |
| Credential exfiltration via client bundle | `server-only` boundary; no `NEXT_PUBLIC_` secrets |
| Credential leakage via logs/errors | Redaction of key, pass, session secret and password |
| Credential replay to a malicious origin | Redirects refused; HTTPS + TLS verification |
| Cross-site request forgery | Same-origin `Origin` enforcement; `SameSite=Lax` cookie |
| Session forgery | HMAC-SHA256 signed tokens; constant-time comparison |
| Brute-force login / API abuse | Per-client sliding-window rate limits |
| Injection via request bodies | Strict Zod validation; no shell/SQL sinks |
| Clickjacking | `X-Frame-Options: DENY`, `frame-ancestors 'none'` |
| SSRF via panel URL | `VIRTUALIZOR_URL` is trusted server config, not user input |

## 10. Credential rotation

1. Generate a new API key/pass in the Virtualizor enduser panel.
2. Update `VIRTUALIZOR_API_KEY` / `VIRTUALIZOR_API_PASS` in the environment.
3. Redeploy or restart the server (Vercel snapshots env per deployment).
4. Confirm `/api/health` and `/api/vps` succeed.
5. Revoke the old credentials in the panel.

Rotating `AUTH_SECRET` invalidates all dashboard sessions immediately. Rotate
`DASHBOARD_PASSWORD` at the same time and communicate the change to operators.

## 11. Reporting

This is a self-hosted tool. If you deploy it publicly, restrict access with your
platform's access controls in addition to the dashboard password, and keep Node
and dependencies patched.
