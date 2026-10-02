# Vantage Architecture

Vantage is a single-tenant Virtualizor Enduser control panel. This document
describes the layers, the server/client boundary, the request lifecycle, the
capability model and caching behavior.

## 1. System diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ Browser                                                              │
│  React 19 · Next.js App Router · TanStack Query v5 · Orbit UI kit     │
│                                                                      │
│  hooks/use-virtualizor.ts  ──►  lib/api-client.ts  ──► fetch /api/*  │
└───────────────────────────────────┬──────────────────────────────────┘
                                    │ same-origin, HttpOnly session cookie
┌───────────────────────────────────▼──────────────────────────────────┐
│ Next.js server (Vercel / Node)                                       │
│                                                                      │
│  middleware.ts            ── gates pages + /api by session            │
│  app/api/**/route.ts      ── auth · CSRF · rate limit · Zod validate  │
│  lib/api/handlers.ts      ── apiGet / apiMutation wrappers            │
│  lib/virtualizor/actions  ── operation layer (one fn per act)         │
│  lib/virtualizor/client   ── HTTPS client (timeout, no redirect)      │
│  lib/virtualizor/parse    ── response → typed domain objects          │
│  lib/virtualizor/capabilities ── runtime probe + cache                │
└───────────────────────────────────┬──────────────────────────────────┘
                                    │ HTTPS (TLS verified)
┌───────────────────────────────────▼──────────────────────────────────┐
│ Virtualizor Enduser API  index.php?api=json&act=...&apikey=...        │
└──────────────────────────────────────────────────────────────────────┘
```

## 2. Layers

| Layer | Location | Responsibility |
| --- | --- | --- |
| Presentation | `app/**`, `components/**` | Pages, Orbit UI kit, shell, command palette. |
| Client state | `hooks/**`, `lib/api-client.ts` | Query/mutation wiring, polling, active VPS selection. |
| HTTP boundary | `app/api/**` | Thin handlers: auth, validation, envelope. |
| API foundation | `lib/api/**` | Error taxonomy, response envelope, guard, rate limit, logger. |
| Domain | `lib/virtualizor/**` | Config, client, actions, parsing, validators, capabilities. |
| Auth | `lib/auth.ts`, `middleware.ts` | Session signing/verification and route gating. |

Each layer depends only on the layer below it. Presentation code never imports
`lib/virtualizor/client.ts`, `config.ts`, `actions.ts` or `capabilities.ts`.

## 3. Server/client boundary

Modules that touch credentials or the panel begin with:

```ts
import "server-only";
```

This makes an accidental client import a **build-time error**. The boundary
covers `lib/virtualizor/*` (except pure types/validators) and `lib/api/*`.

The browser only ever talks to `/api/*` on the same origin. It learns nothing
about the panel URL, API key or API pass.

## 4. Request lifecycle (read)

1. The UI calls a hook (e.g. `useVpsQuery`) which calls `apiFetch("/api/vps/42")`.
2. `middleware.ts` verifies the session cookie for `/api/*` (except the auth and
   health routes) and redirects/401s when unauthorized.
3. The route handler is wrapped in `apiGet`, which enforces authentication.
4. The loader resolves route params, then calls an action (e.g. `getVpsInfo`).
5. The action builds a `VirtualizorRequestOptions` and calls the client.
6. The client assembles `index.php?api=json&act=...&apikey=...&apipass=...&svs=...`,
   fetches with a timeout + size ceiling, refuses redirects, and parses JSON.
7. `parse.ts` maps the raw payload into typed domain objects.
8. `jsonSuccess` wraps the result as `{ success, data, requestId }` with
   `Cache-Control: no-store`.
9. TanStack Query caches the response and re-renders the UI.

## 5. Request lifecycle (mutation)

The same path, with three additional, enforced steps inside `apiMutation`:

1. `requireApiAuth()` — session must be valid.
2. `assertMutationOrigin(request)` — the `Origin` header must match the request
   host (or an explicitly allowed origin). In production a missing `Origin` is
   rejected.
3. `enforceRateLimit(...)` — per-client, per-route sliding window.

Then the body is validated with a Zod schema before any action runs.

## 6. Operation layer

`lib/virtualizor/actions.ts` is the single home for every Virtualizor `act`.
Each function:

- builds the request (act, query/body params, VPS scope),
- selects the appropriate timeout (long-running ops use the long timeout),
- maps the response via `parse.ts`,
- returns a typed result or throws a normalized `VirtualizorError`.

Actions that require a VPS scope throw `VIRTUALIZOR_CONFIG_ERROR` with a clear
message when no `svs` is available.

## 7. Capability model

Virtualizor builds differ. Rather than assume, `detectCapabilities()` probes a
curated list of **read-only** acts (`listvs`, `cpu`, `ram`, `disk`, `bandwidth`,
`monitor`, `services`, `processes`, `backup2`, `firewallplan`, `sshkeys`,
`euiso`, `volume`, `rdns`, `pdns`, `ctasks`, `apikey`, `vnc`, `ostemplate`,
`ips`, `statuslogs`).

- Success → `supported[act] = true`
- Unsupported/not-found/HTTP error → `supported[act] = false`
- Auth/config/network failure → the entry is left **undefined** so callers can
  distinguish "unavailable" from "unknown".

No destructive action is ever probed. The report is exposed at
`/api/capabilities` and drives feature gating in the UI.

## 8. Caching and polling

- **Capability cache**: in-memory, keyed by `baseUrl` + last 4 chars of the API
  key, TTL from `VIRTUALIZOR_CAPABILITY_TTL_S` (default 300s).
- **Query cache**: TanStack Query. Query keys are per resource (e.g.
  `["vps", id, "stats"]`). Mutations declare `invalidateKeys` so dependent
  queries refetch after success.
- **Polling**: monitoring/status views use query `refetchInterval`; tasks use a
  short interval while active. No long-lived sockets or background daemons are
  required.

## 9. Error normalization

`lib/api/errors.ts` maps domain errors to HTTP statuses:

| Code | Status |
| --- | --- |
| `INVALID_REQUEST` | 400 |
| `AUTH_REQUIRED` | 401 |
| `ORIGIN_REJECTED` | 403 |
| `VIRTUALIZOR_NOT_FOUND` | 404 |
| `RATE_LIMITED` | 429 |
| `AUTH_CONFIG` | 503 |
| `VIRTUALIZOR_CONFIG_ERROR` / upstream failures | 502/503 |

Unknown errors become `502` without leaking internals. Messages are redacted of
secrets before logging or returning.

## 10. Optional persistence

The current release is stateless. Rate limiting is an in-memory best-effort
limiter (per instance), and no external store is contacted. The reserved
`KV_REST_API_*` and `NOTIFY_*` variables in `.env.example` are placeholders for
an opt-in durable backend and alerting; they are **not read today**. Any future
persistence must degrade gracefully when unset.

## 11. Directory map

```
app/
  (dashboard)/            authenticated pages (overview, monitoring, network,
                          storage, services, tasks, system, settings)
  api/**                  route handlers
  login/                  sign-in page
components/
  ui/                     Orbit primitives
  dashboard/              VPS-scoped widgets (gate, identity, stats, monitor)
  shell/                  app shell, sidebar, topbar, command palette
  auth/                   auth form
hooks/                    data hooks and providers
lib/
  api/                    handler wrappers, errors, logger, rate limit
  virtualizor/            config, client, actions, parse, validators, capabilities
  auth.ts utils.ts api-client.ts navigation.ts
middleware.ts             session gate
tests/                    Vitest suite
```
