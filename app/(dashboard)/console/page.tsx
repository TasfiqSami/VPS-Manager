"use client";

import { Eye, EyeOff, MonitorSmartphone, Terminal } from "lucide-react";
import { useState, type ReactNode } from "react";

import { VpsGate } from "@/components/dashboard/vps-gate";
import { ScopePanel } from "@/components/platform/scope-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CapabilityNotice } from "@/components/ui/capability-notice";
import { ConsoleFrame } from "@/components/ui/console-frame";
import { CopyButton } from "@/components/ui/copy-button";
import { KeyValueSection, ValueOrUnavailable } from "@/components/ui/key-value";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalPreference } from "@/hooks/use-local-preference";
import { useCapabilities, useVnc } from "@/hooks/use-virtualizor";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-xs text-content-subtle">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium text-content">
        <ValueOrUnavailable value={children} />
      </span>
    </div>
  );
}

function SessionInfo({ vpsId }: { vpsId: string }) {
  const vnc = useVnc(vpsId);
  const [reveal, setReveal] = useState(false);
  const [terminalTheme, setTerminalTheme] = useLocalPreference<string>("vantage.console.theme", "orbit");
  const [fontSize, setFontSize] = useLocalPreference<number>("vantage.console.fontSize", 13);

  return (
    <Panel>
      <PanelHeader
        title="Console preferences"
        description="Applies to the browser console in this browser only"
        icon={<MonitorSmartphone className="h-4 w-4" />}
      />
      <PanelBody className="space-y-4">
        {vnc.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <KeyValueSection title="Session" columns={1}>
            <Field label="Protocol">{vnc.data?.available ? "VNC (RFB)" : "Unavailable"}</Field>
            <Field label="Host">{vnc.data?.host}</Field>
            <Field label="Port">{vnc.data?.port}</Field>
            <Field label="Password">
              {vnc.data?.password ? (
                <span className="inline-flex items-center gap-2">
                  <span className="font-mono text-xs">{reveal ? vnc.data.password : "••••••••"}</span>
                  <button
                    type="button"
                    aria-label={reveal ? "Hide console password" : "Show console password"}
                    onClick={() => setReveal((current) => !current)}
                    className="text-content-subtle hover:text-content"
                  >
                    {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <CopyButton value={vnc.data.password} label="Copy" />
                </span>
              ) : undefined}
            </Field>
            {vnc.data?.reason ? <Field label="Status">{vnc.data.reason}</Field> : null}
          </KeyValueSection>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-content-subtle">Terminal theme</span>
            <Select value={terminalTheme} onChange={(event) => setTerminalTheme(event.target.value)}>
              <option value="orbit">Orbit</option>
              <option value="midnight">Midnight</option>
              <option value="light">Light</option>
            </Select>
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-content-subtle">Font size</span>
            <Select value={String(fontSize)} onChange={(event) => setFontSize(Number(event.target.value))}>
              <option value="12">12 px</option>
              <option value="13">13 px</option>
              <option value="14">14 px</option>
              <option value="16">16 px</option>
            </Select>
          </label>
        </div>
      </PanelBody>
    </Panel>
  );
}

function VncTab({ vpsId }: { vpsId: string }) {
  const vnc = useVnc(vpsId);
  const status = vnc.isLoading
    ? "connecting"
    : vnc.isError
      ? "error"
      : vnc.data?.available
        ? "connected"
        : "disconnected";

  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <ConsoleFrame
        title="VNC console"
        subtitle={vnc.data?.novncUrl ? "noVNC bridge" : "Remote framebuffer"}
        status={status}
        loading={vnc.isLoading}
        error={vnc.isError ? vnc.error : undefined}
        errorTitle="VNC console unavailable"
        onRetry={() => vnc.refetch()}
        onReconnect={() => vnc.refetch()}
        footer="Clipboard and keyboard capture are provided by the noVNC client when a bridge URL is available."
      >
        {vnc.data?.novncUrl ? (
          <iframe
            title="VNC console"
            src={vnc.data.novncUrl}
            className="h-full min-h-[420px] w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        ) : (
          <EmptyState
            title={vnc.data?.available ? "Console credentials issued" : "Console not available"}
            description={
              vnc.data?.available
                ? "The panel issued VNC credentials but did not return an embeddable noVNC URL. Use the connection details alongside with your VNC client."
                : vnc.data?.reason ?? "This panel does not expose a VNC console for this server."
            }
          />
        )}
      </ConsoleFrame>
      <SessionInfo vpsId={vpsId} />
    </div>
  );
}

function ConsoleBody({ vpsId }: { vpsId: string }) {
  const capabilities = useCapabilities();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operate"
        title="Console"
        description="Remote console access to the instance with session details and browser-local preferences."
        actions={<Badge tone="info"><Terminal className="h-3 w-3" /> VNC</Badge>}
      />
      <Tabs defaultValue="vnc">
        <TabsList className="flex-wrap">
          <TabsTrigger value="vnc">VNC</TabsTrigger>
          <TabsTrigger value="terminal">Web terminal</TabsTrigger>
          <TabsTrigger value="serial">Serial</TabsTrigger>
          <TabsTrigger value="spice">SPICE</TabsTrigger>
          <TabsTrigger value="rescue">Rescue console</TabsTrigger>
          <TabsTrigger value="history">Connection history</TabsTrigger>
        </TabsList>
        <TabsContent value="vnc"><VncTab vpsId={vpsId} /></TabsContent>
        <TabsContent value="terminal">
          <CapabilityNotice report={capabilities.data} act="vnc" feature="Web terminal" />
        </TabsContent>
        <TabsContent value="serial">
          <CapabilityNotice report={capabilities.data} act="serial" feature="Serial console" />
        </TabsContent>
        <TabsContent value="spice">
          <CapabilityNotice report={capabilities.data} act="spice" feature="SPICE console" />
        </TabsContent>
        <TabsContent value="rescue">
          <ScopePanel
            title="Rescue console"
            items={["Boot a recovery environment", "Mount and repair disks", "Recover data over the network"]}
            links={[{ href: "/settings", label: "Enable rescue mode" }, { href: "/vps", label: "VPS overview" }]}
            note="Rescue mode is toggled from Settings; the console connection itself uses the VNC tab."
          />
        </TabsContent>
        <TabsContent value="history">
          <ScopePanel
            title="Connection history"
            items={[
              "Console sessions connect directly to the panel and are not proxied by Vantage",
              "Operations performed in Vantage are recorded under Logs",
              "Session credentials are issued per request and never stored",
            ]}
            links={[{ href: "/logs", label: "Open operation logs" }]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ConsolePage() {
  return <VpsGate>{(vpsId) => <ConsoleBody vpsId={vpsId} />}</VpsGate>;
}
