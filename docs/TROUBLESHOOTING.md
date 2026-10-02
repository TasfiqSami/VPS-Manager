# Troubleshooting

Symptom → cause → fix, followed by sanity-check commands. All checks avoid
printing secrets.

## 1. Startup and configuration

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| API returns `503 AUTH_CONFIG` | Production without `DASHBOARD_PASSWORD` and `AUTH_SECRET` | Set both in the environment and redeploy/restart. |
| Dashboard redirects to `/login` repeatedly | Missing/expired session cookie, or `AUTH_SECRET` changed | Sign in again; keep `AUTH_SECRET` stable across deploys. |
| `VIRTUALIZOR_CONFIG_ERROR` with `Missing: ...` | One or more `VIRTUALIZOR_*` vars unset | Fill in `VIRTUALIZOR_URL`, `VIRTUALIZOR_API_KEY`, `VIRTUALIZOR_API_PASS`. |
| `VIRTUALIZOR_URL must use HTTPS` | Panel URL uses `http://` on a non-loopback host | Use an HTTPS panel origin. |
| `VIRTUALIZOR_URL is not a valid absolute URL` | Missing scheme or typo | Provide e.g. `https://panel.example.com:4083`. |

## 2. Connectivity and TLS

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `Could not reach the Virtualizor panel` | DNS/firewall/egress blocked | Confirm outbound HTTPS to the panel host and port. |
| Certificate/TLS error | Self-signed, expired or wrong-hostname cert | Install a valid certificate on the panel. |
| `The Virtualizor panel issued a redirect` | `VIRTUALIZOR_URL` points at a login page or proxy | Point it directly at the panel API origin. |
| Request times out | Large op under a short timeout | Raise `VIRTUALIZOR_LONG_TIMEOUT_MS` or `VIRTUALIZOR_TIMEOUT_MS`. |
| Response aborted for size | Body exceeded `VIRTUALIZOR_MAX_RESPONSE_BYTES` | Raise the ceiling (bounded) or inspect the panel response. |

## 3. Authentication to the panel

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `VIRTUALIZOR_HTTP_ERROR` on every action | Wrong/expired API key or pass | Regenerate credentials in the enduser panel and update env. |
| `400`/`error: Invalid credentials` | Key/pass mismatch | Re-copy both values without trailing whitespace. |
| `VIRTUALIZOR_NOT_FOUND` for the VPS | `VIRTUALIZOR_VPS_ID` wrong or not accessible to the key | Verify the numeric `svs` ID and key scope. |
| Account-level action fails | Key lacks permission for that `act` | Check the provider's key permissions. |

## 4. Features show "Unavailable"

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| A card says `Unavailable` | Capability probe marked the `act` unsupported | Confirm on the provider; Vantage intentionally does not fake data. |
| Capability list looks stale | Probe cache (default 300s) | Wait for TTL or restart; the cache key includes the panel URL and key suffix. |
| `409`-like behavior after changing key | Cache pinned to the old key suffix | Restart or wait for `VIRTUALIZOR_CAPABILITY_TTL_S`. |

## 5. Legacy data appears wrong

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Disk/memory shows `Unavailable` | Panel omits the field for this VPS | Expected; Vantage never substitutes zero. |
| Backup/volume list empty | Build does not expose `backup2`/`volume` | Expected; feature is gated. |

## 6. Rate limiting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `429 RATE_LIMITED` | Exceeded `RATE_LIMIT_*` window | Wait for `Retry-After` or raise the limit deliberately. |
| Login blocked for everyone | Shared IP behind a proxy maps many users to one key | Configure the platform to set `x-vercel-forwarded-for`/`x-real-ip`, or raise limits. |

## 7. Sanity-check commands

```bash
# Is the app up and configured? (no secrets returned)
curl -s http://localhost:3000/api/health

# Which Virtualizor actions are supported?
curl -s http://localhost:3000/api/capabilities

# Sign in and reuse the cookie
curl -s -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"password":"YOUR_DASHBOARD_PASSWORD"}'

# List VPS instances
curl -s -b cookies.txt http://localhost:3000/api/vps

# Inspect response headers (CSP etc.)
curl -sI http://localhost:3000/login | grep -i -E 'content-security|x-frame|referrer'
```

Local build sanity:

```bash
npm run lint && npm run typecheck && npm run test
npm run build
```

## 8. Log interpretation

Logs are single-line JSON with `level`, `time`, `message` and optional
`requestId`, `code`, `status`, `path`. Secrets and any field whose name matches
`pass`, `secret`, `key`, `token`, `authorization` or `cookie` are redacted.
Request URLs are never logged (they carry credentials in the query string).

Raise verbosity temporarily with `VANTAGE_LOG_LEVEL=debug`, then set it back to
`info`.
