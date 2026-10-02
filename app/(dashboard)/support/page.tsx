"use client";

import { BookOpen, Download, LifeBuoy, MessageCircle, Stethoscope } from "lucide-react";
import { useMemo, useState } from "react";

import { ScopePanel } from "@/components/platform/scope-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyValue, KeyValueSection, ValueOrUnavailable } from "@/components/ui/key-value";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/use-session";
import { useCapabilities, useHealth } from "@/hooks/use-virtualizor";
import { formatDateTime } from "@/lib/utils";

const DOC_LINKS = [
  { title: "README", detail: "Project overview and quick start", href: "/docs" },
  { title: "Architecture", detail: "How Vantage talks to Virtualizor", href: "/docs" },
  { title: "API map", detail: "Every route and the action it calls", href: "/docs" },
  { title: "Deployment", detail: "Environment variables and hosting", href: "/docs" },
  { title: "Security", detail: "Credential handling and boundaries", href: "/docs" },
  { title: "Troubleshooting", detail: "Common failures and fixes", href: "/docs" },
];

function DiagnosticsPanel() {
  const health = useHealth();
  const capabilities = useCapabilities();
  const session = useSession();
  const [copied, setCopied] = useState(false);

  const bundle = useMemo(
    () => ({
      generatedAt: new Date().toISOString(),
      product: "Vantage",
      health: health.data
        ? {
            configured: health.data.configured,
            ok: health.data.ok,
            latencyMs: health.data.latencyMs,
            lastCheckedAt: health.data.lastCheckedAt,
            error: health.data.error,
            checks: health.data.checks,
          }
        : null,
      capabilities: capabilities.data ?? null,
      session: session.data
        ? { authenticated: session.data.authenticated, mode: session.data.mode, sessionSeconds: session.data.sessionSeconds }
        : null,
    }),
    [health.data, capabilities.data, session.data],
  );

  const download = () => {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `vantage-diagnostics-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <Panel>
        <PanelHeader
          title="Diagnostics bundle"
          description="Sanitized runtime state. Contains no credentials or secrets."
          icon={<Stethoscope className="h-4 w-4" />}
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(JSON.stringify(bundle, null, 2)).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
              >
                {copied ? "Copied" : "Copy JSON"}
              </Button>
              <Button variant="primary" size="sm" onClick={download}>
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
            </div>
          }
        />
        <PanelBody className="space-y-4">
          <KeyValueSection title="Connectivity">
            <KeyValue label="Configured"><ValueOrUnavailable value={health.data ? (health.data.configured ? "Yes" : "No") : undefined} /></KeyValue>
            <KeyValue label="Healthy"><ValueOrUnavailable value={health.data ? (health.data.ok ? "Yes" : "No") : undefined} /></KeyValue>
            <KeyValue label="Latency"><ValueOrUnavailable value={health.data?.latencyMs !== undefined ? `${health.data.latencyMs} ms` : undefined} /></KeyValue>
            <KeyValue label="Last checked"><ValueOrUnavailable value={health.data ? formatDateTime(health.data.lastCheckedAt) : undefined} /></KeyValue>
          </KeyValueSection>
          {health.data?.error ? (
            <p className="rounded-card border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
              {health.data.error.code}: {health.data.error.message}
            </p>
          ) : null}
          {health.data ? (
            <div className="space-y-1">
              {health.data.checks.map((check) => (
                <div key={check.id} className="flex items-center justify-between gap-4 py-1">
                  <span className="text-xs text-content-muted">{check.label}</span>
                  <Badge tone={check.status === "pass" ? "success" : check.status === "fail" ? "danger" : "neutral"}>{check.status}</Badge>
                </div>
              ))}
            </div>
          ) : null}
        </PanelBody>
      </Panel>
    </div>
  );
}

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Support"
        description="Self-service diagnostics, documentation and the escalation path for this deployment."
        actions={<Badge tone="neutral"><LifeBuoy className="h-3 w-3" /> help</Badge>}
      />
      <Tabs defaultValue="diagnostics">
        <TabsList className="flex-wrap">
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
        </TabsList>
        <TabsContent value="diagnostics"><DiagnosticsPanel /></TabsContent>
        <TabsContent value="docs">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DOC_LINKS.map((doc) => (
              <a key={doc.title} href={doc.href} className="orbit-panel orbit-hairline block p-4 transition-colors hover:border-border-strong">
                <p className="flex items-center gap-2 text-sm font-medium text-content">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  {doc.title}
                </p>
                <p className="mt-1.5 text-xs text-content-subtle">{doc.detail}</p>
              </a>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="status">
          <ScopePanel
            title="Service status"
            items={[
              "Virtualizor API reachability is verified by the health endpoint",
              "Per-endpoint support is verified by the capability report",
              "Provider maintenance is announced in the client area",
              "Latency and last-check timestamps are shown in Diagnostics",
            ]}
            links={[{ href: "/health", label: "Health" }, { href: "/infrastructure", label: "Capability detection" }]}
          />
        </TabsContent>
        <TabsContent value="contact">
          <ScopePanel
            title="Escalation"
            items={[
              "Gather the diagnostics bundle before opening a ticket",
              "Include the request id from a failed operation",
              "Attach the relevant audit entries from the Security center",
              "Contact your Virtualizor provider for API-level failures",
            ]}
            links={[{ href: "/security", label: "Event log" }, { href: "/logs", label: "Logs" }]}
            note="Vantage has no built-in ticket system. Support is handled by your infrastructure provider."
          />
          <div className="mt-4 flex items-center gap-2 text-xs text-content-subtle">
            <MessageCircle className="h-3.5 w-3.5" /> Include the diagnostics JSON when contacting support.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
