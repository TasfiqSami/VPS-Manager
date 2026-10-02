"use client";

import { Ban, CheckCircle2, Globe, KeyRound, Lock, ShieldCheck, Users } from "lucide-react";

import { ScopePanel } from "@/components/platform/scope-panel";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Timeline, type TimelineEntry } from "@/components/ui/timeline";
import { useAuditLog, useCapabilities } from "@/hooks/use-virtualizor";
import { formatDateTime } from "@/lib/utils";

const ROLES: Array<{ role: string; scope: string; capabilities: string[] }> = [
  { role: "Master", scope: "Full account", capabilities: ["Servers", "Billing", "Users", "API keys", "Firewall", "DNS"] },
  { role: "Administrator", scope: "Assigned servers", capabilities: ["Servers", "Backups", "Firewall", "Snapshots", "Console"] },
  { role: "Operator", scope: "Assigned servers", capabilities: ["Power controls", "Backups", "Console", "Monitoring"] },
  { role: "Read-only", scope: "Assigned servers", capabilities: ["Monitoring", "Logs", "Task history"] },
];

function SessionsPanel() {
  const audit = useAuditLog();
  const authEvents = (audit.data?.records ?? []).filter((record) => record.resource === "auth").slice(0, 20);
  const entries: TimelineEntry[] = authEvents.map((record) => ({
    id: record.id,
    title: record.success ? "Authentication succeeded" : "Authentication failed",
    description: `${record.actor} · ${record.ip} · ${record.method} ${record.path}`,
    timestamp: formatDateTime(record.timestamp),
    tone: record.success ? "success" : "danger",
  }));

  return (
    <Panel>
      <PanelHeader title="Session history" description="Authentication events recorded by this Vantage instance" icon={<KeyRound className="h-4 w-4" />} />
      <PanelBody>
        {entries.length === 0 ? (
          <p className="text-sm text-content-subtle">
            No authentication events recorded yet. Sign-in audit records appear here; retention is {audit.data?.retention ?? "in-memory"}.
          </p>
        ) : (
          <Timeline entries={entries} />
        )}
      </PanelBody>
    </Panel>
  );
}

function PermissionMatrix() {
  return (
    <Panel>
      <PanelHeader title="Role capability matrix" description="How Virtualizor sub-account roles map onto Vantage sections" icon={<Users className="h-4 w-4" />} />
      <PanelBody className="space-y-3">
        {ROLES.map((entry) => (
          <div key={entry.role} className="rounded-card border border-border bg-surface-muted/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-content">{entry.role}</p>
              <Badge tone="neutral">{entry.scope}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entry.capabilities.map((capability) => (
                <span key={capability} className="rounded-control border border-border bg-surface px-2 py-0.5 text-2xs text-content-muted">
                  {capability}
                </span>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs text-content-subtle">
          Roles are enforced by the Virtualizor panel. Vantage inherits the effective permissions of the configured API account.
        </p>
      </PanelBody>
    </Panel>
  );
}

export default function AccessPage() {
  const capabilities = useCapabilities();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Access control"
        description="Who can reach the panel and the servers, how sessions are governed, and where each control is enforced."
        actions={<Badge tone="neutral"><Lock className="h-3 w-3" /> panel-enforced</Badge>}
      />
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roles">Roles & permissions</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="network">Network policy</TabsTrigger>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 lg:grid-cols-2">
            <ScopePanel
              title="Access overview"
              items={[
                "Role-based access delegated by the panel",
                "Two-factor authentication for panel accounts",
                "IP allowlisting and connection restrictions",
                "Session timeout controls for the dashboard",
              ]}
              links={[{ href: "/settings", label: "Vantage session settings" }, { href: "/security", label: "Security center" }]}
              note="Vantage fails closed in production: when authentication is misconfigured it returns 503 rather than allowing open access."
            />
            <Panel>
              <PanelHeader title="Enforcement status" icon={<ShieldCheck className="h-4 w-4" />} />
              <PanelBody className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-content-muted">SSH key API</span>
                  <Badge tone={capabilities.data?.supported.sshkeys ? "success" : "warning"}>
                    {capabilities.data?.supported.sshkeys ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}
                    {capabilities.data?.supported.sshkeys ? "Available" : "Unverified"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-content-muted">IP address management</span>
                  <Badge tone={capabilities.data?.supported.ips ? "success" : "warning"}>
                    {capabilities.data?.supported.ips ? "Available" : "Unverified"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-content-muted">Panel 2FA / sub-users</span>
                  <Badge tone="neutral"><Ban className="mr-1 h-3 w-3" /> Not exposed</Badge>
                </div>
              </PanelBody>
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="roles"><PermissionMatrix /></TabsContent>
        <TabsContent value="sessions"><SessionsPanel /></TabsContent>

        <TabsContent value="network">
          <ScopePanel
            title="Network policy"
            items={[
              "Restrict panel and SSH access to trusted IP ranges",
              "Firewall plans are applied per server under Security",
              "Reverse DNS and DNS zones are managed under Network",
              "Baseboard and out-of-band access is controlled by the provider",
            ]}
            links={[{ href: "/security", label: "Firewall plans" }, { href: "/network", label: "Network" }]}
            note="IP allowlists are configured in the Virtualizor panel. Vantage does not modify provider-level network policy."
          />
        </TabsContent>

        <TabsContent value="auth">
          <ScopePanel
            title="Authentication"
            items={[
              "Dashboard authentication uses a signed session cookie",
              "Sessions expire after the configured window (AUTH_SESSION_HOURS)",
              "Panel credentials are separate from your Virtualizor API key",
              "Logout invalidates the session immediately",
            ]}
            links={[{ href: "/settings", label: "Session settings" }, { href: "/developers", label: "API keys" }]}
            note="Two-factor authentication and password policy are enforced by the Virtualizor panel, not by Vantage."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
