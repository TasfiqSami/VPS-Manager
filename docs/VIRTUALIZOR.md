# Virtualizor Enduser API Notes

This document records how Vantage talks to the Virtualizor **Enduser** API and
which parts of the API surface it relies on. It is the source of truth for the
wire format implemented in `lib/virtualizor/client.ts`.

## 1. Base request shape

```
{baseUrl}/index.php?api=json&act={act}&apikey={key}&apipass={pass}[&svs={vpsId}][&...query]
```

- `baseUrl` is `VIRTUALIZOR_URL` normalized to its origin (plus any base path)
  by `normalizeBaseUrl()`.
- `api=json` requests the JSON response envelope.
- `act` selects the operation.
- `apikey` / `apipass` are the Enduser credentials.
- `svs` is the VPS scope. It is set from `VIRTUALIZOR_VPS_ID` unless the request
  overrides it (`vpsId: null` omits it entirely, for account-level actions).

## 2. Authentication

Enduser authentication is a pair of credentials created inside the enduser
panel: an **API key** and an **API pass**. Both are sent on every request as
query parameters (GET) or form fields (POST).

- Credentials are read from `process.env` at call time.
- They are never stored in the browser, never returned by any endpoint, and are
  redacted from logs and error messages by `redactSecrets()`.
- `AUTH_SECRET` / `DASHBOARD_PASSWORD` are also in the redaction set.

## 3. HTTP methods

- **Reads** use GET.
- **Mutations** use POST with an
  `application/x-www-form-urlencoded` body. Some panels accept mutations over
  GET as well; Vantage standardizes on POST so CSRF protections apply at the
  HTTP boundary.

## 4. Parameter and array encoding

`appendParams()` serializes parameters:

- `undefined` and `null` values are skipped.
- Scalars are stringified.
- Arrays are expanded using the `key[]` convention:

```
acts[]=start&acts[]=stop
```

Keys that already end in `[]` are passed through unchanged, so callers can
control the exact wire form when the panel expects something unusual.

POST bodies are serialized with the same function into
`URLSearchParams`/form encoding.

## 5. Response envelope

Virtualizor returns a JSON object whose shape varies by action. Vantage does not
assume a single shape; instead:

- `parse.ts` locates the meaningful sub-object (e.g. `vps`, `vs`, `info`,
  `volume`, `backups`, `var`) and tolerates both arrays and id-keyed objects.
- Domain objects are extracted with defensive helpers that accept numeric or
  string values.
- Errors may be reported as `error` (string or array) or inside `done.msg`.
  `extractUpstreamError()` and `classifyApiMessage()` normalize these.

A successful mutating call usually returns `{ done: { msg: "..." } }`. The
action layer surfaces that message, or a documented fallback message when the
panel returns an empty success body.

## 6. Recognized actions

Read actions used by Vantage:

| `act` | Purpose |
| --- | --- |
| `listvs` | List VPS instances on the account. |
| `vpsmanage` | Detailed info for the scoped VPS. |
| `ips` | Address list for the VPS. |
| `cpu`, `ram`, `disk`, `bandwidth` | Resource statistics. |
| `monitor` | Live resource snapshot. |
| `statuslogs` | Historical status samples. |
| `vnc` | VNC endpoint/port/password info. |
| `ostemplate` | Available OS templates for reinstall. |
| `firewallplan` | Firewall plans and rules. |
| `sshkeys` | SSH keys on the account. |
| `backup2` | Backup list. |
| `euiso` | ISO library. |
| `services` | Service list and running/autostart state. |
| `processes` | Process list. |
| `ctasks` | Background task list. |
| `volume` | Additional volumes. |
| `rdns` | Reverse DNS records. |
| `pdns` | DNS zones. |
| `managezone` | DNS records for a zone. |
| `apikey` | API key list (`do=add` to create). |

Mutation actions include power (`start`/`stop`/`restart`/`poweroff`), VNC
password, rescue enable/disable, hostname, root password, reinstall, firewall
plan add/delete, SSH key add/edit/delete/apply, backup create/restore/delete,
ISO add/delete, service start/stop/restart, process kill, volume add/delete,
reverse DNS add/delete, DNS record add/edit/delete, DNS zone delete, API key
create/delete.

The full mapping to routes and hooks is in `API-MAP.md`.

## 7. Provider limitations

Virtualizor deployments differ by version and configuration. Vantage handles
this with runtime capability detection:

- An unsupported action returns `supported[act] = false` and the UI marks the
  related feature `Unavailable`.
- Partial data (for example, a stats sub-resource that fails) is isolated: the
  stats bundle reports the failing resource in `errors` and keeps the rest.
- Vantage never substitutes zero, `0%` or a fabricated status for missing data.

Common limitations you may hit:

- Some builds do not expose `backup2`, `volume` or `pdns`.
- Some providers disable reinstall templates or restrict ISO uploads.
- VNC may be disabled per VPS, returning no port.

## 8. TLS policy

- `VIRTUALIZOR_URL` must use HTTPS. Plain HTTP is accepted **only** for
  `localhost` / `127.0.0.1` / `::1` during development.
- TLS verification is always on. Self-signed or expired certificates cause a
  clear configuration/connection error; install a valid certificate on the
  panel instead.
- The client **refuses to follow redirects**, so credentials cannot be replayed
  to a third-party origin. A redirect response is surfaced as
  `VIRTUALIZOR_UNSUPPORTED`/`HTTP_ERROR` with guidance to point
  `VIRTUALIZOR_URL` directly at the panel.

## 9. Timeouts and size limits

| Setting | Default | Applies to |
| --- | --- | --- |
| `VIRTUALIZOR_TIMEOUT_MS` | 15000 | Normal requests. |
| `VIRTUALIZOR_LONG_TIMEOUT_MS` | 60000 | Reinstall, backup, restore. |
| `VIRTUALIZOR_MAX_RESPONSE_BYTES` | 2097152 | Body size ceiling before abort. |

Capability probes use `min(timeout, 10s)` so a slow panel cannot stall startup.

## 10. Versioning and changes

Vantage pins behavior to the documented Enduser API surface and tolerates shape
differences in parsing. If a provider changes an `act`, the capability probe and
the `Unavailable` labeling surface the change rather than breaking the console.
