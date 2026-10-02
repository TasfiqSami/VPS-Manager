# MASTER PROMPT — "Vantage" Virtualizor Enduser VPS Control Panel (v2, built from scratch)

> Role for the AI coding agent: You are a senior full-stack engineer and product
> designer. You will build a brand-new, production-ready application from an
> empty repository. The existing v1 project described below is reference material
> only. Do not copy v1 blindly; re-architect it, fix all its defects, and deliver
> a substantially better product. Treat this document plus the official
> Virtualizor Enduser API documentation as the source of truth.

---

## 0. How to use this prompt

1. Read this entire document before writing any code.
2. Inspect the environment (empty or partial repo), then lay out the architecture
   described in section 6 before creating files.
3. Build the product described in sections 3 to 5, satisfying every requirement
   in sections 6 to 9.
4. Self-verify against the strict acceptance criteria in section 11 and output
   the final report described in section 12.
5. Never claim something works unless you actually built and verified it.

A complete verbatim analysis of v1 is included below so you never need to open
the old files. If the old source or its `docs/` folder is present in the
workspace you may consult it, but this document takes precedence.

Important environment note: in the supplied v1 archive there is **no real `.env`
file**, only a `.env.example` with placeholders. If a real `.env` exists in the
execution environment, never print, log, copy, commit, or hardcode its values.
All secrets must come from server-side environment variables at runtime.

---

## 1. Mission and non-negotiables

Build a **secure, premium, production-grade VPS control panel** for the
**Virtualizor Enduser API** that a real hosting company could ship. It must:

- Actually talk to the Virtualizor Enduser API (never a mockup, never fake data).
- Keep all Virtualizor credentials strictly server-side. The browser must never
  receive `VIRTUALIZOR_API_KEY` or `VIRTUALIZOR_API_PASS` through any channel
  (HTML, JS props, JSON, cookies, localStorage, sessionStorage, URLs, logs,
  errors, source maps, public files, git).
- Deploy cleanly to Vercel serverless with no persistent Node process, no PM2,
  no Docker requirement, no local filesystem persistence, and no long-lived
  WebSocket server.
- Never fabricate metrics, statuses, lists, or capabilities. When the API does
  not provide a value, render `Unavailable` with an explanation. Unsupported
  provider capabilities must degrade gracefully, never crash and never pretend.
- Be honest about provider limitations at all times.
- Ship an **exceptional UI/UX** (the top priority): modern, aesthetic, unique,
  Apple-inspired, AAA SaaS quality. No generic admin-template look, no clutter,
  no cheap glassmorphism, no fake 3D, no "AI-generated" vibes.

Product working name: **Vantage** (configurable). Design-system name: **Orbit**
(configurable). Do not borrow any third-party brand assets, logos, or copy.

---

## 2. Source-of-truth analysis of the current v1 project

### 2.1 What v1 is

A Next.js 15 (App Router) dashboard that manages **a single VPS** through the
Virtualizor **Enduser API**. All Virtualizor traffic is proxied server-side
through Next.js route handlers. It is designed for Vercel. Unsupported or absent
metrics render as `Unavailable`. It has a shared-password dashboard login with an
HMAC-signed HttpOnly session cookie.

### 2.2 v1 stack and architecture

- Next.js 15.1, React 19, TypeScript 5.7 (strict), Tailwind CSS 3.4.
- TanStack Query v5 for client data fetching; Zod 3 for validation.
- lucide-react icons; clsx + tailwind-merge; Vitest for unit tests.
- No component library, no chart library, no headless UI, no theme system,
  no database, no i18n.
- Layers:
  - Browser React components call same-origin `/api/virtualizor/*`.
  - `app/api/**` route handlers (Node runtime, `dynamic = "force-dynamic"`) use
    `protectedGet` / `protectedMutation`, wrap responses in a fixed envelope
    `{ success, data, fetchedAt }` / `{ success:false, error:{code,message} }`,
    and set `Cache-Control: no-store`.
  - `lib/virtualizor/config.ts` reads env and normalizes the panel URL.
  - `lib/virtualizor/client.ts` builds authenticated `GET`/`POST` requests to
    `https://<panel>:4083/index.php?api=json&...`, enforces timeouts, maps HTTP/
    network/TLS/API errors, redacts secrets.
  - `lib/virtualizor/actions.ts` exposes typed operations; `parse.ts` normalizes
    loosely structured payloads into domain types; `types.ts` is the domain
    model; `validators.ts` holds Zod schemas.
  - `lib/api/{response,guard,handlers}.ts` provide the envelope, session guard
    and route helpers.
  - `lib/auth.ts` implements HMAC-SHA256 session creation/verification with Web
    Crypto (isomorphic for Edge middleware).
  - `middleware.ts` protects `/dashboard/:path*` and `/api/virtualizor/:path*`.
  - `hooks/*` are TanStack Query wrappers; polling pauses when the tab is hidden.

### 2.3 v1 environment variables

Required: `VIRTUALIZOR_URL`, `VIRTUALIZOR_API_KEY`, `VIRTUALIZOR_API_PASS`,
`VIRTUALIZOR_VPS_ID`.
Optional: `VIRTUALIZOR_TIMEOUT_MS` (default 15000),
`VIRTUALIZOR_LONG_TIMEOUT_MS` (default 60000).
Auth (recommended): `DASHBOARD_PASSWORD`, `AUTH_SECRET`, `AUTH_SESSION_HOURS`
(default 12).
Never prefix any of them with `NEXT_PUBLIC_`.

### 2.4 v1 complete feature inventory

Pages: Overview, VPS management (tabs: Overview, Power, Reinstall OS, Root
Password, Hostname), Monitoring, Console, Networking (tabs: IP Addresses,
Reverse DNS, DNS), Security (tabs: Firewall, SSH Keys, Rescue Mode), Storage
(tabs: Volumes, ISO), Backups, Services, Processes, SSH Keys (standalone),
Settings (tabs: Server, Console, API Keys, Connection), System Health, Tasks.

Capabilities:

- Overview: VPS name/id/status/IP/OS/CPU/RAM/disk/bandwidth/hostname/
  virtualization/location/creation, power controls (start/restart/shutdown/
  stop), quick links, resource grid with progress bars.
- Monitoring: CPU/RAM/disk/bandwidth metric cards, live monitor snapshots,
  status-log history, hand-rolled SVG area charts with min/avg/max and
  range buttons (1H/6H/12H/24H/7D/30D), daily bandwidth chart.
- Power: start, restart, graceful stop, hard poweroff (each confirmed).
- Console: VNC info retrieval server-side, noVNC link when provided, VNC
  password change, host/port/password display with copy.
- Reinstall OS: list `ostemplate` options, destructive warning, typed
  `REINSTALL` confirmation, rebuild SSH key option.
- Root password: change with confirmation field, never displays existing.
- Hostname: read current, change with validation.
- Firewall: list firewall plans, add a plan with one rule (action/protocol/
  port/source/destination/default policy), delete plan.
- SSH keys: list account keys, add/edit/delete, apply selected keys to VPS.
- Backups: list, create, restore (typed `RESTORE`), delete. Long-running ops use
  extended timeout.
- ISO: list end-user ISOs, add from URL, delete.
- Services: list services, start/stop/restart selected.
- Processes: list processes (PID/user/CPU/MEM/RSS/state/time/command), kill
  selected (typed `KILL`).
- Volumes: list, add (name/size/format/attach/mountpoint), delete.
- Reverse DNS: list, add (IP/domain), delete.
- DNS: list zones, list records, add/edit/delete records, delete zone.
- API keys: list account API keys, create, delete.
- Tasks: list background tasks with status/progress.
- Health: read-only checks (configuration present, network reachable,
  authentication accepted, VPS accessible), latency, last check.
- Settings/Connection: shows which env vars are present (never values), auth
  status, guidance.
- Auth: `/login` shared password; signed HttpOnly `SameSite` cookie; middleware
  redirects; API returns 401 when unauthenticated.
- Config banner: warns when Virtualizor is unconfigured or auth is disabled/
  misconfigured.

### 2.5 v1 Virtualizor Enduser API action map

Base request shape:
`https://<panel>:4083/index.php?api=json&act=<action>&apikey=<KEY>&apipass=<PASS>&svs=<VPS_ID>`
plus GET query params or POST `application/x-www-form-urlencoded` body. Account
level operations omit `svs`. Array parameters are repeated.

| Feature | Virtualizor `act` | HTTP | Key params |
| --- | --- | --- | --- |
| VPS info | `vpsmanage` (fallback `listvs`) | GET | `svs` |
| IP addresses | `ips` | GET | `svs` |
| CPU / RAM / disk / bandwidth stats | `cpu`, `ram`, `disk`, `bandwidth` | GET | `svs`, `show` |
| Live monitor | `monitor` | GET | `svs` |
| Status history | `statuslogs` | GET | `svs` |
| Power start/stop/restart/poweroff | `start`, `stop`, `restart`, `poweroff` | GET | `do=1`, `svs` |
| VNC info | `vnc` | GET | `novnc=<id>`, `do=add` |
| VNC password | `vncpass` | POST | `vncpass=1`, `newpass`, `conf` |
| Rescue enable/disable | `rescue` | POST | `enablerescue=1`/`disablerescue=1`, `password`, `conf_password`, `vid` |
| Reinstall options | `ostemplate` | GET | `svs` |
| Reinstall OS | `ostemplate` | POST | `reinsos=1`, `newos`, `newpass`, `conf`, `vid`, `rebuild_sshkey` |
| Hostname | `hostname` | POST | `changehost=1`, `newhost` |
| Root password | `changepassword` | POST | `changepass=1`, `newpass`, `conf` |
| Firewall list/add/delete | `firewallplan` | GET/POST | `addplan=1`, `fwp_name`, `default_policy`, `fwp_note`, `api_firewall_rules`, `delete_fwids[]` |
| SSH keys list/add/edit/delete/apply | `sshkeys`, `addsshkey`, `editsshkey` | GET/POST | `name`, `value`, `keyid`, `delete`, `ssh_keys[]` |
| Backups list/create | `backup2` | GET/POST | `cbackup=1` |
| Backup restore | `backups` | POST | `bkid`, `restore=1` |
| Backup delete | `backup` | POST | `bkid`, `delete=1` |
| ISO list/add/delete | `euiso`, `addiso` | GET/POST | `filename`, `iso_url`, `del` |
| Services list/action | `services` | GET/POST | `start_x`/`stop_x`/`restart_x`, `sel_serv[]` |
| Processes list/kill | `processes` | GET/POST | `sel_proc[]` |
| Volumes list/add/delete | `volume` | GET/POST | `addvolume=1`, `volname`, `vol_size`, `format`, `vps_sel`, `attach_vol`, `mntpoint`, `delvol` |
| Reverse DNS list/add/delete | `rdns` | GET/POST | `rdns=1`, `rdns_ip`, `rdns_domain`, `delete` |
| DNS zones | `pdns` | GET/POST | `del` |
| DNS records | `managezone` | GET/POST | `domainid`, `add=1`/`edit=1`, `name`, `type`, `content`, `prio`, `ttl` |
| Account API keys | `apikey` | GET/POST | `do=add`, `del` |
| Tasks | `ctasks` | GET | `svs` |
| Health probe | `cpu` | GET | `svs` |

Response envelope from Virtualizor is loosely structured. Common fields:
`done{msg}`, `msg`, `error` (string or array), `msgs.error`, `status`, `uid`,
`act`, `vpsid`, `username`, `preferences`, `time_taken`. Metric payloads:
`cpu{used,limit,percent,manu}`, `ram{used,limit,guaranteed,swap,percent}`,
`disk{used,limit,free,percent,limit_gb,used_gb}`,
`bandwidth{usage,in,out}`.

Domain error codes v1 used: `VIRTUALIZOR_CONFIG_ERROR`, `VIRTUALIZOR_AUTH_ERROR`,
`VIRTUALIZOR_HTTP_ERROR`, `VIRTUALIZOR_TIMEOUT`, `VIRTUALIZOR_NETWORK_ERROR`,
`VIRTUALIZOR_TLS_ERROR`, `VIRTUALIZOR_API_ERROR`, `VIRTUALIZOR_UNSUPPORTED`,
`VIRTUALIZOR_NOT_FOUND`, `VIRTUALIZOR_INVALID_RESPONSE`,
`VIRTUALIZOR_FORBIDDEN`, `VIRTUALIZOR_UNKNOWN`, plus `INVALID_REQUEST`,
`UNAUTHORIZED`, `FORBIDDEN`.

### 2.6 Confirmed v1 defects that the rewrite MUST eliminate

Functional / data correctness:

1. Volume "attached" flag is computed with `Boolean(string)` so `0` is treated
   as attached. Use the existing `truthy()` semantics.
2. `getVpsInfo` catches and retries on **all** errors (auth, timeout, config),
   masking real failures and doubling latency. Only fall back to `listvs` for
   unsupported/not-found cases.
3. When the keyed VPS record is absent, the parser silently selects the first
   nested object, so a multi-VPS account can show the wrong server's data.
   Never guess the VPS; match strictly or fail clearly.
4. Status normalization uses loose substring checks (`includes("on")`), so
   unrelated strings can be reported as running. Use exact/precedence-aware
   matching.
5. Disk unit heuristic guesses GB/MB from magnitude, silently corrupting values
   (e.g. a 20000 GB disk becomes ~20 GB). Read an explicit unit when available
   and otherwise do not guess.
6. Array parameters are inconsistent: `delete_fwids` and `ssh_keys` are not
   `[]`-suffixed while `sel_serv[]` / `sel_proc[]` are. Standardize to `foo[]`.
7. Firewall rules are stored as a JSON string (`api_firewall_rules`) but never
   `JSON.parse`d on read, so all rules render as default ACCEPT/TCP with no
   fields. Parse both array and JSON-string forms.
8. `mapIps` can emit internal object keys as IP addresses and never populates
   `primary` / `reverseDns`, so the UI always shows "Secondary".
9. Dead/duplicated parsing: `mapVncInfo` exists but is unused while VNC parsing
   is reimplemented inline in actions with different behavior. One source of
   truth only.
10. Placeholder ids `"unknown"` for backups/volumes cause duplicate React keys;
    DNS zones always emit `records: []`; `ServiceInfo.pid` is never populated.
    Populate real values or remove the field.
11. `GET /api/virtualizor/status-logs` is a dead route; the same history is
    returned by `/api/virtualizor/monitor`. Remove or consolidate.
12. `getMonitor` runs with the long timeout, holding serverless invocations open
    unnecessarily.
13. `getBandwidthStats(show)` accepts `show` but the stats route never passes it,
    so historical/monthly bandwidth is silently unavailable.
14. Mutations return `ActionSuccess` (which contains `success`) nested inside the
    success envelope, producing `{success:true,data:{success:true,...}}`. Flatten.

Security:

15. Auth **fails open**: if `DASHBOARD_PASSWORD`/`AUTH_SECRET` are absent, both
    middleware and the API guard allow everything. In production this must fail
    closed (503 / hard error), never silently expose the proxy.
16. `AUTH_SECRET` set without `DASHBOARD_PASSWORD` is silently treated as
    "disabled" rather than misconfigured.
17. Middleware returns **401** `AUTH_REQUIRED` while the in-route guard throws a
    forbidden error mapped to **403**; the client only redirects on 401, so a
    guard-first failure yields a toast and no login redirect. Unify on 401.
18. Login rate limiter is an in-memory `Map`: per-instance, resets on cold start,
    never pruned (leak), trusts spoofable `x-forwarded-for`, counts successful
    logins (self-lockout), and has no `Retry-After`. No rate limiting on
    destructive mutations.
19. Credentials are placed in the URL query string and `fetch` uses
    `redirect: "follow"`, so a panel open-redirect could leak credentials to a
    third party. Use `redirect: "manual"` or validate; never log URLs containing
    credentials; keep TLS verification enabled always.
20. `Cache-Control: no-store` is missing from `/api/auth/*` and
    `/api/virtualizor/config` because they bypass the envelope helper.
21. No security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options /
    frame-ancestors, Referrer-Policy, Permissions-Policy).
22. `timingSafeEqual` returns early on length mismatch (minor timing side
    channel); sessions have no server-side revocation and no maximum lifetime;
    `loginSchema` has no max password length.
23. `assertServer()` checks `typeof window` instead of using the `server-only`
    idiom, so bundler leakage of the client module is not compile-time prevented.
24. Unbounded array inputs (firewall rules, SSH key ids, PIDs, services) and no
    request body size limit.
25. SSH key regex is unanchored and does not validate the base64 body; ISO URL
    validation accepts arbitrary schemes (`file:`, `ftp:`, internal hosts).
26. No CSRF/origin check on POST handlers (relies only on `SameSite`).
27. `mapErrorToStatus` contains a no-op ternary (always 502).

Architecture / operations:

28. Memoized client freezes configuration for the process lifetime; no request
    id, structured logging, metrics, or latency logging; `toVirtualizorError`
    discards cause details, making production debugging impossible while
    over-redacting logs.
29. Upstream `response.text()` has no size cap.
30. Six Zod validators are defined but unused; routes re-declare inline id
    schemas, so validated rules drift from what is enforced.
31. Tests cover the client/parsers/errors well but completely miss the
    security-critical `createSessionToken`/`verifySessionToken`, middleware,
    `requireApiAuth`, `protectedGet`/`protectedMutation`/`parseJsonBody`, the
    route handlers, hooks, and most actions. Coverage has no thresholds and
    `coverage.include` excludes `app/`, `middleware.ts`, `hooks/`, components.

### 2.7 v1 UI/UX and capability gaps to close

UI: dark-only (no light/system theme, `darkMode: ["class"]` is dead config);
no theme/accent/density system; dead tokens and utilities; weak elevation;
system fonts only; shallow type hierarchy; no `prefers-reduced-motion` support;
no command palette; no tooltips/popovers/dropdown menus/combobox; tabs are not
URL-driven and sidebar child links never highlight; duplicate SSH Keys
destination and a wrong Settings icon; `CopyButton` renders empty accessible
names at 7 call sites; danger alerts use `role="note"`; unnamed progressbars;
`Select` removes the native chevron with no replacement; invalid `<a><button>`
nesting; inconsistent loading UX (full-page vs skeleton); no route-level
`error.tsx`/`loading.tsx`/`not-found.tsx`; `DataTable` has no sorting/filtering/
pagination/column visibility/select-all/sticky header/mobile card mode;
hand-rolled charts have no hover/crosshair/tooltip/axes/legend/thresholds and
no tabular accessibility fallback; range buttons map to point counts, not real
time windows; toast system leaks timers, has no pause-on-hover, announces errors
politely, no actions/undo/exit animation; `Dialog`/mobile drawer lack focus
trap, focus restore, portal, and initial focus; relative "updated" time never
ticks; the refresh button invalidates every query at once; native `title`
tooltips; inconsistent date formatting; no reduced-motion; z-index collisions;
form errors are not linked via `aria-describedby` and `aria-invalid`; logout has
no confirmation; substantial dead code.

Missing product capabilities: multi-VPS/instance management; customizable
dashboard widgets/layout; audit log and notification/activity center; chart
interactivity and real time-range selection; server-side historical snapshots
when the API lacks history; scheduled actions; alerting integrations
(webhook/Discord/Slack/email); localized dates/numbers/timezones; CSV/JSON
export; onboarding/setup wizard; optional multi-user roles; PWA/installability;
global search; help/contextual docs; bulk tooling; import/export of settings.

---

## 3. Product vision for v2

Vantage is the control room for one or more Virtualizor-managed VPS instances.
It should feel like a premium, calm, fast, information-dense but uncluttered
Apple-grade SaaS product: precise typography, generous but deliberate spacing,
layered translucent surfaces, soft depth, restrained color, purposeful motion,
crisp data visualization, and delightful micro-interactions. It must always be
truthful about what the provider API actually reports.

Primary personas: an individual VPS owner operating their own server, and a
small team managing several servers on one Virtualizor account.

Success statement: a user can open Vantage on any device, immediately see the
true state of every managed VPS, safely perform any Enduser-supported
operation with clear confirmations and feedback, understand what is unsupported
and why, customize the workspace to their taste, and trust that credentials
never leave the server.

---

## 4. New and upgraded capabilities (complete feature specification)

All v1 capabilities are preserved. Everything below is required for v2 unless
explicitly marked optional. Every feature must degrade gracefully when the
provider does not support the underlying Enduser API action.

### 4.1 Instance model and VPS switcher (multi-VPS)

- Discover all VPSes available to the configured Enduser credentials using the
  account-level listing (`listvs`), in addition to the env-configured default.
- A prominent, keyboard-accessible **VPS switcher** in the topbar showing name,
  status dot and IP; remembers the last selected instance per browser and via
  the optional persistence layer.
- `VIRTUALIZOR_VPS_ID` remains the default/primary instance and must keep working
  with zero extra configuration.
- Selecting an instance scopes the entire dashboard (all routes, queries, and
  mutations) to that `svs`. Never display one instance's data while another is
  selected.
- A per-instance settings record (display name override, tags/color, pinned
  quick actions, alert thresholds) stored locally and optionally server-side.
- If the account exposes exactly one VPS, the switcher collapses elegantly into
  a status chip and the app behaves effectively single-VPS.

### 4.2 Command deck (Overview / Home)

- Hero header: instance identity, live status, uptime/created, OS, region/
  virtualization, primary IP, and a large, legible status treatment.
- Customizable widget grid (drag to reorder, show/hide, resize; persisted):
  resource gauges with sparklines, power controls, quick actions, recent tasks,
  recent audit events, health score, bandwidth quota, backup freshness,
  open alerts.
- **Health score** derived only from real signals (reachability, auth, resource
  pressure, pending tasks, backup age, firewall posture) with a transparent
  breakdown; never invent values.
- Quick actions with inline confirmation for destructive items.
- "Last updated X seconds ago" that actually ticks, with a graceful
  refreshing indicator and manual refresh that is scoped (not global).
- Optional inline compact noVNC preview when available.

### 4.3 Monitoring and analytics

- Unified, typed time-series model. Support both live polling and, where the API
  provides them, `monitor`, `statuslogs`, and `bandwidth` series.
- Metrics: CPU %, RAM used/limit/%, swap, disk used/limit/% and inodes if
  present, network in/out, bandwidth monthly/daily, I/O when available, and
  host CPU manufacturer.
- Charts: interactive SVG or a vetted chart library with crosshair + tooltip,
  time axis ticks, y-axis ticks, area/line/bar modes, threshold/annotation
  lines, legend, null-gap handling (do not bridge missing samples), and a
  visually hidden data table equivalent for screen readers.
- Real time-range selection (Live, 1H, 6H, 12H, 24H, 7D, 30D, custom) computed
  from actual sample timestamps where available; never map ranges to arbitrary
  point counts without label truth.
- Per-metric summary: current, min, max, average, last sample time, sample
  count, and data source ("Virtualizor status logs" vs "live samples collected
  by Vantage").
- When Virtualizor does not provide history, optionally persist live samples
  (only when the persistence layer is configured) and clearly label them as
  Vantage-collected; otherwise state that history is unavailable.
- Export current series as CSV and JSON.
- Optional alert thresholds per metric with notification integrations (4.12).

### 4.4 Power and lifecycle

- Start, graceful shutdown, restart, hard poweroff. Bulk power actions for
  multi-VPS accounts.
- State-aware controls (disabled when invalid), optimistic status with rollback,
  and post-action refresh.
- Optional scheduled power actions (start/stop/restart at a time or on a
  recurring schedule) via the persistence layer + Vercel Cron, clearly marked
  optional and disabled when persistence is not configured.
- Confirmation dialogs with clear consequences; typed phrase (`POWER OFF`) only
  for the hardest action, standard confirm for the rest.

### 4.5 Console

- Retrieve VNC/noVNC info server-side only.
- Embedded noVNC in an iframe/panel when the API returns a usable URL; external
  open in a new tab as fallback; full-screen mode; connection status; clipboard
  helper; reconnect.
- Graceful "VNC not available" state with the provider reason, plus host/port/
  password details for native clients when provided.
- VNC password management with strength guidance and confirmation.

### 4.6 VPS management

- Reinstall OS: searchable OS template combobox (grouped by distro/family),
  explicit irreversible warning, typed `REINSTALL` confirmation, optional
  rebuild of SSH host keys, password generator, and post-action task tracking.
- Root password: change with confirmation, strength meter, generator, show/hide,
  never display or log the existing password.
- Hostname: current value, validation, explanation of when it applies.
- Rescue mode: enable with password + confirmation, disable with confirmation,
  current status surfaced in Overview and Monitoring.
- Per-operation result panel with the real upstream message.

### 4.7 Networking

- IP addresses: IPv4/IPv6, primary vs secondary correctly identified, reverse
  DNS displayed inline, copy buttons with proper accessible names.
- Reverse DNS: list, add, edit, delete with IPv4/IPv6 and hostname validation.
- DNS: zones list, records per zone (A/AAAA/CNAME/MX/NS/TXT/SRV), create/edit/
  delete, priority/TTL handling, searchable records, and clear unsupported
  states.
- Optional inline "what is this?" help for each DNS record type.

### 4.8 Security and firewall

- Firewall plans with a proper rule editor: add/edit/remove multiple rules per
  plan, action (ACCEPT/DROP), protocol (TCP/UDP/ICMP/ALL), port(s), source,
  destination, comment; default policy; ordering where supported.
- Reusable firewall **templates/presets** (e.g. "Web server", "SSH only") built
  from real supported fields, with a clear lock-out warning and a suggested rule
  that always preserves a management path.
- Delete plan/rule with confirmation.
- SSH keys: list, add, edit, delete, apply selected keys to the VPS; strict
  OpenSSH public-key validation (anchored prefix, base64 body, fingerprint
  computed and shown); optional keypair generation when the API returns a
  private key, shown exactly once with an emphatic "save it now" warning and
  copy button; never persist private keys server-side unless securely designed.
- Rescue mode surfaced alongside security posture.
- Security posture checklist (VNC enabled?, rescue off?, firewall present?,
  recent auth failures) computed only from real data.

### 4.9 Storage

- Volumes: list (size, format, attached/detached, mount point, target VPS),
  create (name/size/format/attach target/mountpoint), attach/detach where
  supported, resize where supported, delete with typed/simple confirmation.
  Correct attached/detached reporting.
- ISO: list end-user ISOs, add from URL, delete, size/age display, warning that
  many providers reap end-user ISOs, and clear unsupported states.
- Storage usage visualization combining VPS disk and attached volumes.

### 4.10 Backups and recovery

- List backups with name, date, size, type, status; storage usage; provider
  limits/quotas where returned.
- Create backup with task/status lifecycle (requested, processing, completed,
  failed) using real API status only.
- Restore backup with typed `RESTORE` confirmation, clear overwrite warning, and
  long-timeout handling; delete backup with confirmation.
- Backup policy panel: last successful backup age, next scheduled (optional),
  and reminders/alerts via notification integrations.
- Export the backup inventory as CSV/JSON.

### 4.11 Services and processes

- Services: list name/status/autostart/pid where available; start, stop,
  restart; bulk selection; search/filter; clear "guest agent required" state.
- Processes: sortable, searchable, virtualized table; sort by CPU/memory/PID;
  select and kill with typed `KILL` confirmation; refresh; never allow arbitrary
  shell execution.
- Both pages must clearly explain when the guest agent is not installed.

### 4.12 Tasks, activity, notifications, and integrations

- Tasks/Activity center: unified timeline of background Virtualizor tasks plus
  user-initiated actions, with status, progress (only if the API reports it),
  timestamps, and auto-refresh while relevant tasks are active.
- **Audit log**: every mutation recorded with actor, action, target VPS, params
  (secrets omitted), result, error code, timestamp, and request id. Persisted
  when the persistence layer is configured; otherwise available for the current
  process/session with a clear notice. Never store credential material.
- Notification center in the topbar (bell) with unread counts and grouping.
- Alert rules (optional, requires persistence): threshold or event based
  (VPS down, high CPU/RAM/disk, task failed, backup stale, auth failure streak).
- Notification integrations (optional): generic webhook, Discord webhook,
  Slack webhook, and email/SMTP. Must be explicitly configured, off by default,
  testable with a "send test" button, and must never leak secrets into logs or
  the client. If the user mentioned a "Discord/audit system", this is where it
  belongs: the v1 project has **no** Discord integration; add it as optional.

### 4.13 Settings and personalization

- Connection tab: show configured/missing environment variable names and the
  normalized panel origin, never secret values; auth status; one-click
  "run diagnostics".
- Console tab: VNC password management.
- Server tab: hostname and root password.
- Account API keys: list, create, delete; when a new key is returned it is shown
  once with copy and a strong warning; never re-display after dismissal.
- **Preferences** (persisted per browser, optionally per user):
  - Theme: dark, light, system.
  - Accent color: a curated palette (e.g. Indigo, Azure, Violet, Emerald,
    Amber, Rose) plus a custom accent.
  - Density: comfortable, compact.
  - Corner radius: soft, rounded, sharp.
  - Reduce motion toggle; high-contrast mode.
  - Polling intervals for live/stats/static resources, with safe minimums.
  - Locale, timezone, 12/24h, date format, number/byte formatting.
  - Default landing page; sidebar default state; table page size.
  - Dashboard widget layout reset.
  - Export/import preferences as JSON.
- **Security tab**: session information, sign out, guidance for rotating
  `AUTH_SECRET` (which invalidates all sessions), and account/session overview.
- About tab: version, supported Enduser capabilities detected for this account,
  and documentation links.

### 4.14 Health and diagnostics

- Read-only checks: configuration present, URL valid, DNS/network reachable,
  TLS trusted, authentication accepted, VPS accessible, account listing works,
  optional persistence reachable, optional integrations configured.
- Show per-check status, latency, last success timestamp, and sanitized reason.
- Never display credentials, secrets, or raw payloads containing them.
- "Copy diagnostic report" and "Download JSON report" (sanitized) for support.
- Auto-run on page load and on demand; safe to run repeatedly.

### 4.15 Onboarding and help

- First-run wizard: verify env configuration, run health checks, optionally
  select the default instance, choose theme/accent, and finish with a checklist.
- Contextual help: inline explanatory popovers for non-obvious fields, a help
  drawer, and links to the docs pages.
- A per-page "what this does / provider support" note where relevant.

### 4.16 Command palette, search, and keyboard shortcuts

- Cmd/Ctrl-K command palette: navigate, switch VPS, run safe actions (power,
  refresh, theme, density), open settings, search resources.
- Global search across instances, IPs, hostnames, services, processes, backups,
  DNS records, and tasks (client-side over already-fetched data; server-side only
  where safe).
- Shortcuts: Cmd/Ctrl-K palette, `?` shortcuts help, `g` + key navigation,
  `r` refresh, `t` theme, `Esc` close, arrow/Home/End in tablists and menus.
- All shortcuts discoverable and disable-able in preferences.

### 4.17 Optional persistence and scheduling

- The app must be fully functional with **zero database**. Persistence is an
  additive, explicitly optional layer (e.g. Vercel KV/Upstash Redis or Vercel
  Postgres/Neon) enabled by configuration.
- When configured it powers: preferences, dashboard layouts, audit log,
  Vantage-collected metric samples, schedules, alert rules, notification
  delivery state, and cached capability detection.
- All persistence must be server-side only, never expose connection strings to
  the client, and degrade gracefully with clear notices when absent.

### 4.18 Optional multi-user and roles

- Default remains a single shared dashboard password (the v1 model) but hardened
  (see 6.12).
- Optional multi-user mode (requires persistence): users with hashed passwords
  (Argon2id or bcrypt), roles `admin` and `viewer`, session listing/revocation,
  and per-user preferences. Viewer role cannot perform mutations or view
  secrets.
- Never store plaintext passwords anywhere. Provide a documented way to seed the
  first admin.

---

## 5. UI/UX and design system (highest priority)

### 5.1 Brand and personality

Calm, precise, trustworthy, technical-but-warm. Think Apple-grade polish crossed
with a modern infrastructure console. Original identity: name "Vantage", design
system "Orbit", a subtle aperture/orbit mark rendered as clean inline SVG (no
third-party logos). Voice: clear, concise, no hype, no emoji.

### 5.2 Design tokens (single source of truth)

Define tokens as CSS custom properties and consume them everywhere. No hard-coded
hex values in components.

- Color: layered neutral scale for canvas, surface 1/2/3, elevated, overlay,
  plus borders (subtle/strong), and text (primary/secondary/tertiary/disabled).
  Semantic: primary/accent, success, warning, danger, info, each with fg/bg/
  border/ring variants. Provide complete light and dark values.
- Typography: `Inter` (variable, self-hosted via `next/font`) for UI and a mono
  (`JetBrains Mono` or `Geist Mono`) for code, IDs, IPs, keys. Type scale with
  clear roles (display, title-1/2/3, body-lg/body/body-sm, caption, overline,
  code) and intentional line-heights/tracking.
- Space: a consistent 4px-based scale; semantic layout spacing tokens.
- Radius: tokenized (control, card, surface, pill) honoring the user radius
  preference.
- Elevation: 5-6 shadow levels plus inner highlights; real, tasteful depth.
- Blur/translucency: controlled token set for glass surfaces (limited use).
- Motion: duration (instant/fast/base/slow) and easing (standard/entrance/exit/
  spring-like) tokens.
- Z-index: a single documented scale (no collisions).
- Breakpoints: documented, plus container-query usage where valuable.

### 5.3 Theming

- Dark, light, and system themes with **no flash of incorrect theme**
  (`next-themes` or an inline pre-hydration script reading the saved choice).
- Full token parity between themes; every screen must be reviewed in both.
- Accent color customization and live preview.
- Density (comfortable/compact) and radius (soft/rounded/sharp) preferences that
  affect the whole system.
- Optional high-contrast mode and a reduce-motion preference.

### 5.4 Typography and content

- Crisp hierarchy: one clear page title, supporting description, section titles,
  and body. Avoid tiny all-caps tracking for important content; ensure AA
  contrast (target 4.5:1 for body, 3:1 for large text).
- Tabular/mono numerals for metrics and tables so columns align.
- Human, specific microcopy; explain destructive consequences and provider
  limitations plainly.

### 5.5 Surfaces, glass, gradients, depth

- A layered surface model with subtle borders and real elevation. Use
  translucent + blurred (glass) surfaces sparingly for the topbar, overlays,
  command palette, and floating panels, with proper fallbacks and contrast.
- Soft, restrained gradients and light washes for hero/status areas only; never
  rainbow or noisy backgrounds.
- Optional, very subtle grid/noise texture for empty or hero regions, disabled
  in reduced-motion/high-contrast modes.
- Focus on clarity and density for data screens; use whitespace deliberately.

### 5.6 Motion and micro-interactions

- Purposeful motion only: page/section entrance, list stagger, chart draw-in,
  number count-up, optimistic action feedback, dialog/sheet transitions,
  hover/press states, drag feedback, skeleton shimmer.
- Consistent easing/duration tokens; nothing bouncy or gratuitous.
- Full `prefers-reduced-motion` support that disables non-essential motion.
- No layout shift; reserve space with skeletons that match final dimensions.

### 5.7 Component library (build a real Orbit design system)

Primitives (accessible, composable, typed, documented): Button (variants, sizes,
loading, icon, asChild/link support), IconButton, ButtonGroup, Input, Textarea,
Select, Combobox, Checkbox, Radio, Switch, Slider, Field/Label/HelpText/Error,
Form, Card/SectionCard, Surface, Separator, Badge/Chip, StatusDot, Avatar,
Tooltip, Popover, DropdownMenu/ContextMenu, CommandPalette, Dialog, Sheet/Drawer,
ConfirmDialog (phrase gate), Alert/Banner, Toast (Sonner-style queue with
pause-on-hover, actions/undo, assertive errors, exit animation), Tabs
(URL-driven, roving tabindex, Arrow/Home/End), SegmentedControl, Accordion,
Progress, Meter, Skeleton, Spinner/InlineLoading, EmptyState (with tasteful
illustration), ErrorState, DataTable (see below), Pagination, Breadcrumb,
Breadcrumb/PageHeader, MetricCard (value + delta + sparkline + status),
Timeline, CodeBlock (highlighting + copy, secret masking), CopyButton (correct
accessible name), Toolbar, Kbd, ScrollArea, ThemeToggle, DensityToggle,
NotificationCenter, InstanceSwitcher, ChartFrame.

DataTable requirements: caption, sticky header, sortable columns with `aria-sort`,
global search, per-column filters, pagination, page-size control, column
visibility, row selection with select-all/indeterminate, bulk action bar, empty/
loading/error states, keyboard navigation, and a mobile card view. Virtualize
long lists (processes, DNS records).

All interactive primitives must have keyboard support, focus-visible styles,
correct ARIA, focus management (trap + restore for overlays, portal rendering),
and must be screen-reader friendly by default.

### 5.8 Layout and navigation

- App shell: a refined sidebar (grouped sections, collapsible icon rail on
  desktop, active-child highlighting including query-param routes), a glass
  topbar (instance switcher, command trigger/search, freshness indicator,
  notification bell, theme/density controls, profile/session menu), and a
  content area with consistent maxwidth and rhythm.
- Mobile: bottom navigation or a proper sheet drawer with focus trap, scroll
  lock, focus restore, and correct slide direction; topbar compresses gracefully.
- Tablet: icon-rail sidebar plus full labels on expand.
- URL-as-state: tabs, filters, selected instance, sorting, and pagination sync
  to the URL so refresh/back/forward/share work.
- Breadcrumbs and clear page headers with primary/secondary actions.
- Route-level `loading.tsx`, `error.tsx`, `not-found.tsx`, and `global-error.tsx`
  with polished, on-brand states.

### 5.9 Charts and data visualization

- A single charting approach (vetted library or a well-tested custom SVG layer)
  with consistent theming, responsive sizing, accessible summaries + hidden data
  tables, tooltips, crosshair, axes, legends, and threshold lines.
- Gauges/rings for quotas, area/line for trends, bars for daily usage.
- Never fake interpolation; show gaps for missing samples.
- Respect reduced motion (no animated draw-in when disabled).

### 5.10 Responsive behavior

- Fully usable at 360px through ultra-wide. No horizontal page scroll.
- Tables become either horizontally scrollable with sticky key columns or
  card-based on small screens. Charts resize fluidly. Dialogs become sheets on
  mobile. Touch targets >= 44px. Tooltips/popovers are touch-safe.

### 5.11 Accessibility (target WCAG 2.2 AA)

- Semantic landmarks, correct heading order, skip links beyond main, visible
  focus, keyboard-complete flows, no color-only status, `aria-live` for async
  status (assertive for errors), labeled controls, `aria-describedby`/`aria-
  invalid` for form errors, accessible dialogs/menus/comboboxes/tabs, accessible
  names on all icon buttons, pause/extend for timed toasts, hit-target size,
  reduced-motion and high-contrast support. Verify with axe and manual keyboard
  testing.

### 5.12 Anti-patterns (do not ship)

Huge empty areas, excessive/decorative gradients, cheap glassmorphism, overly
rounded bubbly cards, gratuitous animation, fake 3D, fake metrics, placeholder
"lorem" UI, inconsistent spacing/typography, guaranteed-contrast failures,
copying another brand, or anything that looks like a generic AI-generated admin
template.

---

## 6. Architecture and technical requirements

### 6.1 Stack (recommended)

- Next.js 15+ App Router, React 19, TypeScript strict (no `any` except where
  unavoidable and documented), Node runtime route handlers.
- Tailwind CSS v4 (CSS-first tokens) or v3.4 LTS if tooling stability requires;
  tokens must be centralized either way.
- Accessible headless primitives (e.g. Radix Primitives) styled with the Orbit
  system; a command palette primitive (e.g. `cmdk`); charting via a vetted
  library (e.g. Recharts/visx) or a rigorously tested custom SVG layer.
- TanStack Query v5 for client data, TanStack Table v8 for tables, React Hook
  Form + Zod for forms, `next-themes` for theming, `dnd-kit` for widget
  reordering, `sonner`-style toasts or a custom implementation.
- Zod for all input validation; Vitest + React Testing Library + MSW for unit/
  integration; Playwright + axe for e2e/a11y.
- Add only dependencies you actually use; remove unused ones. Prefer fewer, well
  maintained libraries.

### 6.2 Folder structure (adapt as needed, keep it clean)

```
app/
  (marketing)/ or root landing
  login/
  dashboard/
    layout.tsx
    page.tsx                 # Command deck
    [instance]/              # optional scoped routes, or query-scoped
    monitoring/ console/ networking/ security/ storage/
    backups/ services/ processes/ tasks/ activity/ settings/ health/
  api/
    auth/                    # login, logout, session
    virtualizor/             # one route per capability group
    preferences/ audit/ notifications/   # optional persistence-backed
  error.tsx  loading.tsx  not-found.tsx  global-error.tsx
components/
  orbit/        # design system primitives + tokens docs
  layout/       # shell, sidebar, topbar, switcher, command palette
  charts/
  features/     # per-domain feature components
hooks/
lib/
  virtualizor/  # config, client, operations registry, parse, types, validators, capabilities
  api/          # envelope, guard, handlers, rate-limit, origin, logger, audit
  store/        # optional persistence adapters
  format/       # locale/timezone/bytes/dates
  auth/         # sessions, users, roles (optional)
docs/
tests/
```

### 6.3 Server-only boundary and rendering

- Use `import "server-only"` (not a `typeof window` check) in every module that
  touches credentials or the Virtualizor client. Add a lint rule or unit test
  that fails if such a module is imported from a client component.
- Default to React Server Components; use client components only where
  interactivity requires it. Dynamically import heavy client-only pieces
  (charts, command palette, drag-and-drop).
- The browser only ever calls same-origin `/api/*`. Same-origin means no CORS
  and no reverse proxy needed for this app type; do not expose Virtualizor
  directly and do not open CORS.

### 6.4 Virtualizor client and operation registry

- One server-only client that: normalizes the panel URL (scheme defaults to
  https, strip path/query/hash), builds authenticated requests, supports GET and
  POST (form-urlencoded), serializes arrays as `key[]=...`, enforces per-request
  timeouts (short and long), caps upstream response size, handles redirects
  safely (`manual` or validated; never follow to a different origin with
  credentials in the URL), parses JSON, classifies upstream errors, and redacts
  secrets from every message and log line.
- A typed **operation registry/descriptor** where each operation declares: name,
  `act`, method, param builder, long-running flag, whether `svs` applies,
  expected response parser, mutation vs read, and a capability probe. Routes and
  hooks are generated/derived from this registry to eliminate duplication and
  drift.
- Never place credentials in a loggable URL string; construct requests so secrets
  are not interpolated into error messages. If credentials must be in the query
  string (as Virtualizor requires), ensure URLs are never logged and redirects
  are not followed cross-origin.
- TLS verification is always enabled. Self-signed panels must show a clear,
  actionable configuration error; never bypass TLS and never set
  `NODE_TLS_REJECT_UNAUTHORIZED=0`.

### 6.5 Capability detection

- Probe which Enduser actions this account/provider supports and cache the
  result server-side for a configurable TTL (in-memory with optional
  persistence). Use it to show/hide or disable navigation and actions honestly.
- Never conflate "empty list" with "unsupported"; distinguish no-data from
  unsupported from error, and label each in the UI.

### 6.6 API route design and envelope

- Group related operations into coherent routes with explicit, validated
  operations (discriminated unions) rather than hundreds of tiny files.
- Validate every body/query with Zod. Bound all arrays and strings, and enforce
  a request body size limit. Reject unknown fields where sensible.
- Success envelope: `{ success: true, data, fetchedAt }`. Error envelope:
  `{ success: false, error: { code, message } }`. No nested `success`. No stack
  traces, filesystem paths, upstream raw HTML, or secret material ever returned.
- Every response sets `Cache-Control: no-store` (including auth and config).
- Return consistent HTTP statuses: 400 validation, 401 auth required, 403
  forbidden, 404 not found, 409 conflict, 429 rate limited, 501 unsupported,
  502/504 upstream, 503 config/unavailable.
- Add origin checking (same-origin) for mutations in addition to `SameSite`
  cookies.

### 6.7 Data fetching, state, caching, and polling

- TanStack Query with a documented query-key factory. Sensible per-resource
  `staleTime`; live/actionable state near-zero; static-ish data short TTLs.
- Centralized, coalesced refresh: never invalidate the entire cache from a
  single button; scope invalidation per action (from the operation registry).
- Adaptive polling: pause when hidden/unfocused, back off on errors, resume on
  focus, configurable intervals with safe minimums, and a visible freshness
  indicator that actually updates. Optionally bridge to streaming for live
  metrics using serverless-friendly streaming, but never require a persistent
  server.
- Optimistic updates with rollback for safe actions (e.g. power state) and
  explicit pending states for long-running operations.
- URL-driven UI state; persisted preferences.

### 6.8 Optional persistence layer

- Adapter interface with a no-op/in-memory default and concrete adapters for
  Vercel KV/Redis and Postgres. Detect configuration at runtime.
- Store only non-secret, non-credential data (preferences, layouts, audit
  events, Vantage-collected samples, schedules, alert rules, capability cache,
  notification delivery metadata). If multi-user is enabled, store only hashed
  passwords.
- All persistence code is server-only; never expose connection strings.

### 6.9 Environment and configuration

Required: `VIRTUALIZOR_URL`, `VIRTUALIZOR_API_KEY`, `VIRTUALIZOR_API_PASS`.
Primary/default instance: `VIRTUALIZOR_VPS_ID` (keep as default; multi-VPS list is
discovered at runtime).
Tuning: `VIRTUALIZOR_TIMEOUT_MS` (15000), `VIRTUALIZOR_LONG_TIMEOUT_MS` (60000).
Auth: `DASHBOARD_PASSWORD`, `AUTH_SECRET`, `AUTH_SESSION_HOURS` (12), plus an
explicit production requirement that auth be configured.
Optional: persistence (KV/Postgres URLs), notification webhooks (generic/Discord/
Slack) and SMTP, `APP_NAME`/branding, `LOG_LEVEL`, rate-limit settings, capability
cache TTL, polling defaults.
Rules: none of the Virtualizor or auth secrets may be `NEXT_PUBLIC_`; provide a
thorough `.env.example` with placeholders and comments only; gitignore all
`.env*`; validate configuration with a clear, non-throwing inspector for the UI
and a throwing loader for the runtime. Do not read or print any existing `.env`.

### 6.10 Error taxonomy and resilience

- Preserve a stable, documented error-code taxonomy (the v1 codes are a good
  baseline) and add codes for new failure classes. Include a `requestId` in
  every error response and correlate it with server logs.
- Error boundaries at route level and for critical widgets; friendly, actionable
  messages that distinguish configuration, connectivity, TLS, auth,
  permission, not-found, unsupported, timeout, rate-limit, and unexpected
  errors. Provide retry/backoff and an "offline/connection lost" indicator.
- Distinguish user-caused (400) from auth (401/403) from upstream (502/504) from
  unsupported (501) from config (503), and reflect that in both the UI and the
  HTTP status.
- Long-running operations report task status; never fake progress.

### 6.11 Logging and observability

- Structured JSON logger (server-side) with levels, timestamps, request id,
  operation, duration, outcome, and error code. Redact secrets centrally.
- Never log credentials, full request URLs containing credentials, raw payloads
  that may contain them, session tokens, or user passwords.
- Optional error/analytics integration (e.g. Sentry) behind configuration and
  with PII/secret scrubbing. Health and metrics endpoints for uptime checks.

### 6.12 Security requirements (must all be satisfied)

- Fail closed: if authentication is not fully configured, production must refuse
  to serve the dashboard/API (503 with clear guidance), never expose the proxy
  silently. Treat a partial configuration (password without secret or vice
  versa) as misconfigured.
- Session: HMAC-signed, HttpOnly, Secure, SameSite=Lax (or Strict) cookies;
  constant-time comparisons without early length leaks; bounded session
  lifetime; session revocation where persistence exists; a clear "sign out"
  everywhere and an optional "sign out all devices".
- Unify unauthenticated responses on 401 so the client reliably redirects to
  login; consistently use the API guard and middleware (no divergence).
- Rate limit login (per trusted client identifier, pruned store or platform
  limiter, no self-lockout from successes, `Retry-After`) and rate limit
  destructive mutations. Never build an unbounded in-memory map.
- Validate and bound all input; enforce body-size limits; restrict ISO URLs to
  https (and optionally an allow-list); validate SSH keys strictly.
- Origin/CSRF protection for mutations; no state-changing GETs.
- Set strong security headers app-wide (CSP with a nonce or hashes, HSTS,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options`/`frame-ancestors`,
  `Referrer-Policy`, `Permissions-Policy`) and ensure the policy still allows
  the embedded noVNC iframe only when explicitly enabled.
- Never expose or hardcode secrets; never place them in client bundles, logs,
  errors, props, URLs, or source. Ensure `server-only` boundaries and a test that
  guards the client bundle.
- Address SSRF: `VIRTUALIZOR_URL` is trusted server configuration. If any
  future feature lets users supply URLs, implement strict validation/allow-lists
  and block private/link-local ranges. Do not allow arbitrary fetch of
  user-supplied URLs.
- No arbitrary shell/command execution anywhere.

### 6.13 Performance and scalability

- Server Components by default; minimal client JS; dynamic import heavy
  features; code-split by route.
- Memoize carefully; virtualize long tables; avoid duplicate requests via the
  query-key factory and coalesced refresh.
- Realistic performance budgets (e.g. Lighthouse performance >= 90 on key pages,
  LCP < 2.5s on broadband, CLS < 0.1, INP < 200ms). Optimize fonts, images, and
  third-party scripts. Ship no unused dependencies and analyze the bundle.
- Serverless-friendly: short-lived stateless handlers, conservative polling,
  no persistent processes, optional streaming for live updates only if it stays
  serverless-compatible.
- Scale horizontally: no reliance on in-process memory for correctness; any
  shared state goes through the optional persistence layer.

### 6.14 Internationalization, locale, timezone

- Central formatting layer for dates, times (12/24h), relative time,
  timezones, numbers, percentages, and bytes. User-selectable locale/timezone.
- Even if full translation is optional, all user-facing strings must be
  centralized and ready for i18n, with English shipped by default.

### 6.15 PWA and installability (optional but preferred)

- Manifest, icons, theme-color, and offline-friendly shell. Do not cache
  sensitive API responses in the service worker; network-first for all `/api`.

---

## 7. Testing and quality gates

- Unit tests (Vitest): config/URL normalization, client request building (URL,
  auth, `svs`, array params), timeout/HTTP/non-JSON/upstream/TLS error mapping,
  secret redaction, every parser (including the v1 bugs above as regression
  tests), validators, formatting, capability detection, error taxonomy, session
  create/verify (round-trip, expiry, tampered signature, malformed base64),
  rate limiter, logger redaction.
- Integration tests: route handlers via `protectedGet`/`protectedMutation`,
  auth guard, middleware (auth enabled/disabled/misconfigured, API 401, page
  redirect, `next` handling), request validation, body-size limits, audit
  logging, and at least one test per destructive action.
- Component tests (RTL): data table interactions, forms, dialogs/confirm
  phrase, toasts, tabs keyboard behavior, command palette, theme switching.
- E2E (Playwright) with mocked Virtualizor: onboarding, login, overview, power
  confirmation, monitoring range change, console states, each manager's
  add/delete flows, settings/preferences persistence, theme toggle, responsive
  breakpoints, and accessibility scans (axe) on every primary route.
- Enforce coverage thresholds in CI and include `app/`, `middleware.ts`,
  `hooks/`, and components in coverage (fix v1's exclusion-by-construction).
- Provide `npm run lint`, `typecheck`, `test`, `test:e2e`, and a `verify` script
  that runs lint + typecheck + unit + build + e2e smoke.

---

## 8. Documentation deliverables

- `README.md`: what it is, architecture, requirements, installation, local dev,
  full environment variable reference, how to create Virtualizor Enduser API
  credentials, how to find the VPS ID and panel URL, how to test the API, how to
  deploy to Vercel, how to configure Vercel env vars, security considerations,
  API architecture, troubleshooting, common Virtualizor errors, credential
  rotation, and how to disable unsupported features.
- `docs/ARCHITECTURE.md`: system diagram, layers, request lifecycle, server/
  client boundary, operation registry, capability model, caching/polling,
  optional persistence.
- `docs/VIRTUALIZOR.md`: Enduser API notes, base request shape, auth, params,
  array encoding, response envelope, recognized actions, provider limitations,
  TLS policy.
- `docs/API-MAP.md`: full mapping Virtualizor act -> client -> internal route ->
  hook -> UI, with methods, params, and errors.
- `docs/SECURITY.md`: credential isolation, auth/session model, fail-closed
  behavior, rate limiting, validation, headers/CSP, threat model, rotation.
- `docs/DEPLOYMENT.md`: Vercel + self-host Node, networking/TLS requirements,
  optional persistence setup, Cron/schedules, preview vs production.
- `docs/TROUBLESHOOTING.md`: symptom -> cause -> fix, sanity-check commands.
- `docs/DESIGN-SYSTEM.md`: Orbit tokens, components, theming, motion,
  accessibility, contribution rules.
- `docs/OPERATIONS.md`: audit log, alerts/integrations, schedules, backups of
  Vantage itself.

## 9. Deployment

- Vercel: zero-config Next.js; document each env var and remind that Vercel
  snapshots env per deployment (redeploy after changes). No `vercel.json` needed
  unless required for Cron or headers.
- Self-host Node: `next build` + `next start`, env via process manager/secrets,
  never commit `.env`.
- Network: panel must be reachable over HTTPS; outbound to its port; TLS
  verification always on.
- Optional services (KV/Postgres, Cron, webhooks) documented as opt-in with
  graceful degradation when absent.

---

## 10. Build phases

1. Project scaffold, tooling, strict TS, lint/format, design tokens and theme.
2. Orbit design system primitives + docs, layout shell, navigation, responsive.
3. Server-only Virtualizor client, operation registry, parsers, validators,
   error taxonomy, logger, config inspector.
4. Auth (fail-closed), middleware, guard, rate limiting, security headers.
5. Routes and hooks per capability; capability detection; caching/polling.
6. Command deck, monitoring/charts, console.
7. VPS management, networking, security/firewall, storage, backups.
8. Services, processes, tasks/activity, audit, notifications/integrations.
9. Settings/preferences, personalization, onboarding, command palette/search.
10. Optional persistence: preferences, audit, samples, schedules, alerts,
    multi-user/RBAC.
11. Tests across all layers plus e2e/a11y; fix every defect found.
12. Documentation; production build verification; final report.

---

## 11. Strict acceptance criteria

The build is complete only when all of the following are demonstrably true:

Functional:

- All v1 capabilities are present and working through real Enduser API calls.
- Multi-VPS discovery/switching works and never shows the wrong instance's data.
- Every one of the v1 defects in 2.6 is fixed and covered by a regression test
  (or explicitly documented as intentionally removed with justification).
- Unsupported/absent data is never faked; it is explicitly labeled.
- Mutations validate input, require confirmation where destructive, show real
  loading states, surface the real upstream message, and refresh relevant data
  via scoped invalidation.
- Long-running operations use the long timeout and report task status without
  fake progress.

UI/UX:

- Dark, light, and system themes are complete, consistent, and flash-free; accent
  and density preferences work and persist.
- The design feels bespoke, premium, Apple-inspired, and AAA SaaS; it does not
  look like a generic template.
- Fully responsive from 360px to ultra-wide with no horizontal scroll; touch
  targets >= 44px; dialogs become sheets on mobile.
- Charts are interactive, themed, and accessible with a hidden data table.
- URL-driven tabs/filters/sorting/pagination; active nav highlighting is
  correct; no duplicate destinations.
- Command palette, global search, and keyboard shortcuts work and are
  discoverable.
- Every async operation has a proper loading state; every list has a meaningful
  empty state; every failure has a friendly, actionable error state.
- Route-level loading/error/not-found/global-error states exist and are styled.

Accessibility:

- WCAG 2.2 AA verified with axe and manual keyboard/screen-reader testing on all
  primary routes, including forms, dialogs, menus, tabs, tables, and toasts.
- No color-only status; all icon-only controls have accessible names; errors are
  announced and linked to their fields; reduced-motion and high-contrast modes
  work.

Security:

- Virtualizor credentials never reach the browser, logs, errors, props, URLs, or
  source; `server-only` boundaries enforced and tested.
- Auth fails closed in production; unified 401 handling; sessions are hardened;
  login and destructive actions are rate limited; origin/CSRF checked; all input
  bounded and validated; strong security headers set; TLS never bypassed;
  redirects safe; no SSRF or command execution paths.
- No secret from any `.env` is read, printed, or hardcoded.

Quality:

- Strict TypeScript with no `any` escape hatches; no dead code, unused imports,
  unused dependencies, `console.log` spam, hardcoded credentials/VPS IDs/URLs,
  fake responses, or TODO placeholders for core functionality.
- Tests pass with enforced coverage thresholds; lint and typecheck pass; a
  production build succeeds; e2e/a11y suites pass.
- Documentation is complete and accurate.

---

## 12. Final report requirements

When done, report, truthfully and verifiably:

1. What was implemented (feature by feature).
2. Files/directories created and their purpose.
3. Environment variables required (names and meaning; never values).
4. How to run locally (commands).
5. How to deploy to Vercel and configure env vars.
6. How to connect the Virtualizor VPS, including multi-VPS discovery.
7. Which Enduser API features are supported and which are unavailable, with the
   capability-detection results.
8. Provider-specific limitations observed or anticipated.
9. Which v1 defects were fixed (map to section 2.6) and how they are tested.
10. Test results, coverage, lint/typecheck/build results.
11. Security audit results (credential isolation, fail-closed auth, headers,
    rate limiting, validation, TLS, SSRF, logging redaction).
12. Accessibility audit results (axe + manual).
13. Any remaining limitations and the exact reason.

Do not claim anything works that was not actually built and verified. If an API
endpoint is undocumented or unavailable, say so explicitly. The result must be a
real, secure, maintainable, highly customizable, error-free, production-ready
Virtualizor Enduser VPS control panel.
