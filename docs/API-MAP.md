# API Map

Complete mapping from Virtualizor `act` to the Vantage action, internal route,
data hook and UI surface. All internal routes are same-origin and return the
`{ success, data, error, requestId }` envelope.

Legend: **M** = mutation (POST/PUT/DELETE, requires auth + Origin + rate limit).

## Account and session

| Route | Methods | Action | Hook | UI |
| --- | --- | --- | --- | --- |
| `/api/auth/login` | POST | `verifyPassword` → signed session cookie | — | `app/login` |
| `/api/auth/logout` | POST | clears session cookie | — | topbar sign-out |
| `/api/auth/session` | GET | `getAuthConfig` | `useSession` | shell |
| `/api/health` | GET | `getConfigStatus` | `useHealth` | `/system` |
| `/api/capabilities` | GET | `detectCapabilities` | `useCapabilities` | `/system`, feature gates |
| `/api/audit` | GET | `listAudit` (in-memory, Vantage-native) | `useAuditLog` | `/logs`, `/security`, `/notifications`, `/admin` |

## VPS

| `act` | Action | Route | Hook | UI |
| --- | --- | --- | --- | --- |
| `listvs` | `listVps` | GET `/api/vps` | `useVpsList` | VPS switcher, dashboard |
| `vpsmanage` (+ `listvs` fallback) | `getVpsInfo` | GET `/api/vps/[id]` | `useVpsInfo` | `vps-identity`, overview |
| `ips` | `getIps` | GET `/api/vps/[id]` (`info.ips`) | `useVpsInfo` | overview, network |
| `cpu`,`ram`,`disk`,`bandwidth` | `getStatsBundle` | GET `/api/vps/[id]/stats` | `useStats` | `stat-grid` |
| `monitor` | `getMonitor` | GET `/api/vps/[id]/monitor` | `useMonitor` | `monitor-panel` |
| `statuslogs` | `getStatusLogs` | GET `/api/vps/[id]/monitor/history` | `useMonitorHistory` | monitoring |
| power acts | `powerAction` | M `/api/vps/[id]/power` | `useApiMutation` | `power-controls` |
| `vnc` | `getVncInfo` / `setVncPassword` | GET/POST `/api/vps/[id]/vnc` | `useVnc` | `/settings` |
| rescue acts | `enableRescue` / `disableRescue` | POST/DELETE `/api/vps/[id]/rescue` | `useApiMutation` | `/settings` |
| `ostemplate` | `getReinstallOptions` / `reinstallOs` | GET/POST `/api/vps/[id]/reinstall` | `useReinstallOptions` | `/settings` |
| hostname act | `changeHostname` | POST `/api/vps/[id]/hostname` | `useApiMutation` | `/settings` |
| root password act | `changeRootPassword` | POST `/api/vps/[id]/root-password` | `useApiMutation` | `/settings` |

## Firewall

| `act` | Action | Route | Hook | UI |
| --- | --- | --- | --- | --- |
| `firewallplan` | `getFirewallPlans` | GET `/api/vps/[id]/firewall` | `useFirewallPlans` | `/network`, `/security` |
| `firewallplan` (add) | `addFirewallPlan` | M POST `/api/vps/[id]/firewall` | `useApiMutation` | `/network`, `/security` |
| `firewallplan` (del) | `deleteFirewallPlans` | M DELETE `/api/vps/[id]/firewall` | `useApiMutation` | `/network`, `/security` |

## SSH keys

| `act` | Action | Route | Hook | UI |
| --- | --- | --- | --- | --- |
| `sshkeys` | `getSshKeys` | GET `/api/ssh-keys` | `useSshKeys` | `/settings`, `/security` |
| `sshkeys` | `addSshKey` | M POST `/api/ssh-keys` | `useApiMutation` | `/settings`, `/security` |
| `sshkeys` | `editSshKey` | M PUT `/api/ssh-keys/[keyId]` | `useApiMutation` | `/settings` |
| `sshkeys` | `deleteSshKey` | M DELETE `/api/ssh-keys/[keyId]` | `useApiMutation` | `/settings`, `/security` |
| `sshkeys` (apply) | `applySshKeys` | M POST `/api/vps/[id]/ssh-keys` | `useApiMutation` | `/settings` |

## Backups, ISO, volumes

| `act` | Action | Route | Hook | UI |
| --- | --- | --- | --- | --- |
| `backup2` | `getBackups` | GET `/api/vps/[id]/backups` | `useBackups` | `/storage` |
| `backup2` (create) | `createBackup` | M POST `/api/vps/[id]/backups` | `useApiMutation` | `/storage` |
| `backup2` (restore) | `restoreBackup` | M POST `/api/vps/[id]/backups/[backupId]` | `useApiMutation` | `/storage` |
| `backup2` (delete) | `deleteBackup` | M DELETE `/api/vps/[id]/backups/[backupId]` | `useApiMutation` | `/storage` |
| `euiso` | `getIsos` | GET `/api/vps/[id]/isos` | `useIsos` | `/storage` |
| `euiso` (add) | `addIso` | M POST `/api/vps/[id]/isos` | `useApiMutation` | `/storage` |
| `euiso` (delete) | `deleteIso` | M DELETE `/api/vps/[id]/isos/[isoId]` | `useApiMutation` | `/storage` |
| `volume` | `getVolumes` | GET `/api/volumes` | `useVolumes` | `/storage` |
| `volume` (add) | `addVolume` | M POST `/api/volumes` | `useApiMutation` | `/storage` |
| `volume` (delete) | `deleteVolume` | M DELETE `/api/volumes/[volumeId]` | `useApiMutation` | `/storage` |

## Services, processes, tasks

| `act` | Action | Route | Hook | UI |
| --- | --- | --- | --- | --- |
| `services` | `getServices` | GET `/api/vps/[id]/services` | `useServices` | `/services` |
| `services` | `manageService` | M POST `/api/vps/[id]/services` | `useApiMutation` | `/services` |
| `processes` | `getProcesses` | GET `/api/vps/[id]/processes` | `useProcesses` | `/services` |
| `processes` (kill) | `killProcesses` | M POST `/api/vps/[id]/processes` | `useApiMutation` | `/services` |
| `ctasks` | `getTasks` | GET `/api/vps/[id]/tasks` | `useTasks` | `/tasks` |

## Networking: reverse DNS, DNS, API keys

| `act` | Action | Route | Hook | UI |
| --- | --- | --- | --- | --- |
| `rdns` | `getReverseDns` | GET `/api/reverse-dns` | `useReverseDns` | `/network` |
| `rdns` (add) | `addReverseDns` | M POST `/api/reverse-dns` | `useApiMutation` | `/network` |
| `rdns` (delete) | `deleteReverseDns` | M DELETE `/api/reverse-dns/[recordId]` | `useApiMutation` | `/network` |
| `pdns` | `getDnsZones` | GET `/api/dns` | `useDnsZones` | `/network` |
| `pdns` (delete zone) | `deleteDnsZone` | M DELETE `/api/dns/[zoneId]` | `useApiMutation` | `/network` |
| `managezone` | `getZoneRecords` | GET `/api/dns/[zoneId]/records` | `useZoneRecords` | `/network` |
| `managezone` (add) | `addDnsRecord` | M POST `/api/dns/[zoneId]/records` | `useApiMutation` | `/network` |
| `managezone` (edit) | `editDnsRecord` | M PUT `/api/dns/[zoneId]/records/[recordId]` | `useApiMutation` | `/network` |
| `managezone` (delete) | `deleteDnsRecord` | M DELETE `/api/dns/[zoneId]/records/[recordId]` | `useApiMutation` | `/network` |
| `apikey` | `getApiKeys` | GET `/api/api-keys` | `useApiKeys` | `/settings`, `/developers` |
| `apikey` (`do=add`) | `createApiKey` | M POST `/api/api-keys` | `useApiMutation` | `/settings`, `/developers` |
| `apikey` (delete) | `deleteApiKey` | M DELETE `/api/api-keys/[keyId]` | `useApiMutation` | `/settings`, `/developers` |

## Validation and errors

Every mutation body is validated by a Zod schema in
`lib/virtualizor/validators.ts`. Notable schemas:

| Schema | Route | Notes |
| --- | --- | --- |
| `powerActionSchema` | power | enum `start/stop/restart/poweroff` |
| `vncPasswordSchema` | vnc | object `{ password }`, 6–8 chars |
| `passwordSchema` | rescue | object `{ password }`, 8–128 chars |
| `hostnameSchema` | hostname | object `{ hostname }`, RFC-ish hostname |
| `osReinstallSchema` | reinstall | `{ osId, newPassword, confirmPassword, rebuildSshKey? }` |
| `firewallRuleSchema` | firewall POST | `{ name, defaultPolicy?, note?, rules[] }` |
| `sshKeySchema` | ssh-keys | OpenSSH public key pattern |
| `volumeSchema` | volumes POST | `{ name, size, format?, attach?, mountPoint? }` |
| `reverseDnsSchema` | reverse-dns POST | `{ ip (v4), domain (hostname) }` |
| `dnsRecordSchema` | dns records | `{ domainId, name, type, content, priority?, ttl? }` |
| `isoAddSchema` | isos POST | `{ filename, isoUrl (https) }` |

Error codes and their statuses are listed in `ARCHITECTURE.md` §9. Upstream
failures map to `VIRTUALIZOR_*` codes and never expose credentials.
