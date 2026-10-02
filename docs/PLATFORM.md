# Platform Sections

This document describes every section in the Vantage sidebar, what data source
backs it, and where the capability boundary lies. The guiding rule is simple:
if the Virtualizor Enduser API cannot provide something, Vantage says so rather
than fabricating a control.

## Navigation groups

| Group | Sections |
| --- | --- |
| Operate | Overview, VPS, Console, Network, Storage, Snapshots, Backups, Files |
| Insight | Monitoring, Health, Logs, Tasks, System |
| Security | Security, Access, API |
| Automation | Automation, Notifications, Templates |
| Platform | Infrastructure, Account, Support, Admin, Settings |

## Operate

| Section | Route | Data source | Notes |
| --- | --- | --- | --- |
| Overview | `/` | `listvs`, `vpsmanage`, stats, tasks | Widget board layout is a client preference. |
| VPS | `/vps` | `vpsmanage`, power acts | Compute, hardware, boot and OS controls. |
| Console | `/console` | `vnc` | VNC when the panel exposes it; otherwise a truthful notice. |
| Network | `/network` | `ips`, `rdns`, `pdns`, `firewallplan` | Addresses, reverse DNS, DNS zones, firewall. |
| Storage | `/storage` | `backup2`, `volume`, `euiso` | Backups, volumes, ISO library. |
| Snapshots | `/snapshots` | `backup2` | Snapshot-style restore points where reported. |
| Backups | `/backups` | `backup2` | Create, restore and delete. |
| Files | `/files` | `euiso`, `volume` | Read-only ISO/volume listing plus file-manager capability scope. No guest filesystem endpoint exists in the Enduser API. |

## Insight

| Section | Route | Data source | Notes |
| --- | --- | --- | --- |
| Monitoring | `/monitoring` | `monitor`, `statuslogs` | Live snapshot plus status history. |
| Health | `/health` | `/api/health`, stats | Connectivity checks and resource health. |
| Logs | `/logs` | `/api/audit`, tasks | Operator audit trail and task output. |
| Tasks | `/tasks` | `ctasks` | Sortable, filterable task queue. |
| System | `/system` | `/api/health`, `/api/capabilities` | Diagnostics and detected endpoints. |

## Security

| Section | Route | Data source | Notes |
| --- | --- | --- | --- |
| Security | `/security` | `sshkeys`, `firewallplan`, `/api/audit` | SSH keys (add/delete), firewall plans (delete), event log. |
| Access | `/access` | `/api/audit`, capability report | Roles, sessions and where each control is enforced. Panel 2FA/sub-users are not exposed by the Enduser API. |
| API | `/developers` | `apikey` | API key create/revoke and the internal HTTP surface. |

## Automation

| Section | Route | Data source | Notes |
| --- | --- | --- | --- |
| Automation | `/automation` | `listvs`, power acts | Fleet power control plus runbook patterns. Scheduling is not exposed by the Enduser API. |
| Notifications | `/notifications` | `/api/audit` | Category/channel preferences (local) over the real event feed. Email/webhook delivery is not simulated. |
| Templates | `/templates` | `ostemplate`, `euiso` | OS templates and application-template scope. |

## Platform

| Section | Route | Data source | Notes |
| --- | --- | --- | --- |
| Infrastructure | `/infrastructure` | `listvs`, `vpsmanage`, stats, capabilities | Fleet inventory, per-server capacity, endpoint detection. Node topology is provider-only. |
| Account | `/account` | `/api/auth/session`, `vpsmanage` | Session identity, provisioned quota, client preferences. Billing is provider-only. |
| Support | `/support` | `/api/health`, `/api/capabilities`, `/api/auth/session` | Sanitized diagnostics bundle (no secrets), docs, escalation. |
| Admin | `/admin` | `/api/health`, `/api/capabilities`, `/api/audit` | Configuration status, capability catalog, audit retention, display flags. |
| Settings | `/settings` | multiple | Server, console, security, appearance and unit preferences. |

## Capability catalog

`lib/capability-catalog.ts` maps UI sections to the read-only `act` endpoints
that back them. The runtime report from `/api/capabilities` only contains
booleans for acts that were actually probed. UI sections use
`CapabilityNotice` / `FeatureGate` to render a truthful state
(`supported` / `unsupported` / `unknown`) instead of a broken control.

## Audit trail

`lib/api/audit.ts` records every mutating request that flows through the
dashboard (method, path, actor, IP, status, duration, request id). It is
in-memory and process-local — Vantage runs without a database — and the UI
labels it as such. Configure retention with `VANTAGE_AUDIT_LIMIT`
(default 500, capped at 5000).
