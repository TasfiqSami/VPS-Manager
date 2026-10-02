"use client";

import { Activity, Gauge, ListChecks, Settings2, ShieldCheck, ToggleLeft } from "lucide-react";

import { CapabilityMatrix } from "@/components/platform/feature-gate";
import { ScopePanel } from "@/components/platform/scope-panel";
import { Badge } from "@/components/ui/badge";
import { KeyValueSection, ValueOrUnavailable } from "@/components/ui/key-value";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalPreference } from "@/hooks/use-local-preference";
import { useAuditLog, useCapabilities, useHealth } from "@/hooks/use-virtualizor";
import { CAPABILITY_SPECS } from "@/lib/capability-catalog";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

interface AdminFlags {
  compactTables: boolean;
  confirmDestructive: boolean;
  showRawFields: boolean;
}

const DEFAULT_FLAGS: AdminFlags = { compactTables: true, confirmDestructive: true, showRawFields: false };

const FLAG_LABEL: Record<keyof AdminFlags, { label: string; detail: string }> = {
  compactTables: { label: "Compact data tables", detail: "Reduce row height in dense views" },
  confirmDestructive: { label: "Confirm destructive actions", detail: "Always require confirmation before delete, reinstall or power-off" },
  showRawFields: { label: "Show raw API fields", detail: "Display unparsed Virtualizor fields in detail panels" },
};

export default function AdminPage() {
  const health = useHealth();
  const capabilities = useCapabilities();
  const audit = useAuditLog();
  const [flags, setFlags] = useLocalPreference<AdminFlags>("vantage.admin-flags", DEFAULT_FLAGS);

  const toggle = (key: keyof AdminFlags) => setFlags({ ...flags, [key]: !flags[key] });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Administration"
        description="Deployment configuration, backend capability detection and operator-level display preferences."
        actions={<Badge tone="neutral"><Settings2 className="h-3 w-3" /> operator</Badge>}
      />
      <Tabs defaultValue="configuration">
        <TabsList className="flex-wrap">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="flags">Display flags</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Backend configuration" description="Resolved server-side. Secrets are never returned." icon={<ShieldCheck className="h-4 w-4" />} />
              <PanelBody>
                <KeyValueSection title="Virtualizor connection">
                  <div className="flex items-center justify-between gap-4 py-2">
                    <span className="text-xs text-content-subtle">Configured</span>
                    <ValueOrUnavailable value={health.data ? (health.data.configured ? "Yes" : "No") : undefined} />
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <span className="text-xs text-content-subtle">Status</span>
                    {health.data ? (
                      <Badge tone={health.data.ok ? "success" : "danger"}>{health.data.ok ? "Healthy" : "Degraded"}</Badge>
                    ) : (
                      <ValueOrUnavailable value={undefined} />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <span className="text-xs text-content-subtle">Base URL</span>
                    <ValueOrUnavailable value={health.data?.baseUrl} />
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <span className="text-xs text-content-subtle">Latency</span>
                    <ValueOrUnavailable value={health.data?.latencyMs !== undefined ? `${health.data.latencyMs} ms` : undefined} />
                  </div>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <span className="text-xs text-content-subtle">Last check</span>
                    <ValueOrUnavailable value={health.data ? formatDateTime(health.data.lastCheckedAt) : undefined} />
                  </div>
                </KeyValueSection>
              </PanelBody>
            </Panel>
            <ScopePanel
              title="Runtime environment"
              items={[
                "Virtualizor credentials are read from server-only env vars",
                "Authentication fails closed in production",
                "Rate limiting is enforced best-effort per client",
                "Audit and logs live in memory for this instance",
              ]}
              links={[{ href: "/health", label: "Health & checks" }, { href: "/logs", label: "Logs" }]}
              note="Vantage never exposes credential values, request signatures or environment contents to the browser."
            />
          </div>
        </TabsContent>

        <TabsContent value="capabilities">
          <div className="space-y-4">
            <CapabilityMatrix specs={CAPABILITY_SPECS} />
            <p className="text-xs text-content-subtle">
              Probed {capabilities.data ? `${formatDateTime(capabilities.data.detectedAt)} (${formatRelativeTime(new Date(capabilities.data.detectedAt))})` : "—"}.
              Unsupported endpoints render truthful notices instead of simulated controls.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="retention">
          <Panel>
            <PanelHeader title="Audit retention" description="Where operational records live for this instance" icon={<ListChecks className="h-4 w-4" />} />
            <PanelBody className="space-y-4">
              <KeyValueSection title="Store">
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-xs text-content-subtle">Mode</span>
                  <Badge tone="warning">{audit.data?.retention ?? "in-memory"}</Badge>
                </div>
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-xs text-content-subtle">Records held</span>
                  <span className="tabular text-sm text-content">{audit.data?.records.length ?? 0}</span>
                </div>
                <div className="flex items-center justify-between gap-4 py-2">
                  <span className="text-xs text-content-subtle">Resources seen</span>
                  <span className="tabular text-sm text-content">{audit.data?.resources.length ?? 0}</span>
                </div>
              </KeyValueSection>
              <p className="text-xs text-content-subtle">
                In-memory means records reset when the serverless instance restarts. Configure the audit limit with VANTAGE_AUDIT_LIMIT.
              </p>
            </PanelBody>
          </Panel>
        </TabsContent>

        <TabsContent value="flags">
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Operator display flags" description="Stored in this browser only" icon={<ToggleLeft className="h-4 w-4" />} />
              <PanelBody className="space-y-1">
                {(Object.keys(FLAG_LABEL) as Array<keyof AdminFlags>).map((key) => (
                  <label key={key} className="flex items-center justify-between gap-4 py-2">
                    <span className="min-w-0">
                      <span className="block text-sm text-content">{FLAG_LABEL[key].label}</span>
                      <span className="block text-xs text-content-subtle">{FLAG_LABEL[key].detail}</span>
                    </span>
                    <Switch checked={flags[key]} onCheckedChange={() => toggle(key)} aria-label={FLAG_LABEL[key].label} />
                  </label>
                ))}
              </PanelBody>
            </Panel>
            <ScopePanel
              title="What these flags affect"
              items={[
                "Presentation density of shared data tables",
                "Whether destructive confirmations are always shown",
                "Whether unparsed API fields are surfaced in detail panels",
                "Nothing is written to the Virtualizor panel",
              ]}
              links={[{ href: "/settings", label: "Server settings" }]}
              note="These are client preferences. Server-side behaviour is controlled by environment variables at deploy time."
            />
          </div>
        </TabsContent>
      </Tabs>
      <div className="flex items-center gap-2 text-xs text-content-subtle">
        <Activity className="h-3.5 w-3.5" /> Configuration is validated server-side on every request.
        <Gauge className="ml-auto h-3.5 w-3.5" /> Efficiency-first: no polling beyond documented intervals.
      </div>
    </div>
  );
}
