"use client";

import { CalendarClock, Play, Power, RefreshCw, Workflow } from "lucide-react";
import { useState } from "react";

import { ScopePanel } from "@/components/platform/scope-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiMutation, useVpsList } from "@/hooks/use-virtualizor";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { ActionSuccess, VpsListItem, VpsStatus } from "@/lib/virtualizor/types";

const POWER_ACTIONS: Array<{ action: "start" | "stop" | "restart" | "poweroff"; label: string; destructive?: boolean }> = [
  { action: "start", label: "Start" },
  { action: "restart", label: "Restart" },
  { action: "stop", label: "Stop" },
  { action: "poweroff", label: "Power off", destructive: true },
];

const RUNBOOKS = [
  { name: "Nightly snapshot", detail: "Create a snapshot, then a backup, then prune the oldest", steps: 3 },
  { name: "Scale maintenance", detail: "Gracefully stop services, patch, restart", steps: 4 },
  { name: "Incident drain", detail: "Suspend inbound traffic, capture console logs", steps: 3 },
  { name: "Pre-deploy checkpoint", detail: "Snapshot, tag the release, notify the team", steps: 3 },
];

function statusTone(status: VpsStatus): "success" | "danger" | "warning" | "neutral" {
  if (status === "running") return "success";
  if (status === "suspended") return "danger";
  if (status === "stopped") return "warning";
  return "neutral";
}

function BulkPower() {
  const list = useVpsList();
  const [pending, setPending] = useState<{ vps: VpsListItem; action: (typeof POWER_ACTIONS)[number] } | null>(null);

  const power = useApiMutation<{ id: string; action: string }, ActionSuccess>({
    mutationFn: ({ id, action }) => apiFetch<ActionSuccess>(`/api/vps/${id}/power`, { method: "POST", body: { action } }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps-list"]],
  });

  const columns: DataTableColumn<VpsListItem>[] = [
    {
      key: "name",
      header: "Server",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-content">{row.name}</p>
          <p className="truncate text-2xs text-content-subtle">{row.primaryIp ?? "no address"}</p>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: "status",
      header: "State",
      render: (row) => <Badge tone={statusTone(row.status)}>{row.statusLabel}</Badge>,
      sortValue: (row) => row.status,
    },
    {
      key: "actions",
      header: "Power",
      align: "right",
      render: (row) => (
        <div className="flex justify-end gap-1">
          {POWER_ACTIONS.map((entry) => (
            <Button
              key={entry.action}
              variant={entry.destructive ? "ghost" : "outline"}
              size="sm"
              className={cn("h-7 px-2 text-2xs", entry.destructive && "text-danger")}
              disabled={power.isPending}
              onClick={() => setPending({ vps: row, action: entry })}
            >
              {entry.label}
            </Button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={list.data}
        columns={columns}
        getRowId={(row) => row.id}
        loading={list.isLoading}
        error={list.isError ? list.error : undefined}
        errorTitle="Servers unavailable"
        onRetry={() => list.refetch()}
        searchPlaceholder="Search servers…"
        emptyTitle="No servers"
        emptyDescription="Bulk power operations appear once servers are available."
        minWidthClassName="min-w-[640px]"
      />
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending ? `${pending.action.label} ${pending.vps.name}` : "Confirm power action"}
        description={pending ? `This sends a ${pending.action.action} command to the guest immediately.` : undefined}
        confirmLabel={pending?.action.label ?? "Confirm"}
        destructive={pending?.action.destructive}
        loading={power.isPending}
        onConfirm={() => {
          if (!pending) return;
          power.mutate(
            { id: pending.vps.id, action: pending.action.action },
            { onSuccess: () => setPending(null) },
          );
        }}
      />
    </>
  );
}

export default function AutomationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Automation"
        title="Automation"
        description="Bulk operations across your fleet, reusable runbook patterns, and the scheduling boundary of the Virtualizor Enduser API."
        actions={<Badge tone="neutral"><Workflow className="h-3 w-3" /> operations</Badge>}
      />
      <Tabs defaultValue="bulk">
        <TabsList className="flex-wrap">
          <TabsTrigger value="bulk">Bulk actions</TabsTrigger>
          <TabsTrigger value="runbooks">Runbooks</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="triggers">Triggers</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk">
          <Panel>
            <PanelHeader title="Fleet power control" description="Start, restart, stop or force power off any server" icon={<Power className="h-4 w-4" />} />
            <PanelBody>
              <BulkPower />
            </PanelBody>
          </Panel>
        </TabsContent>

        <TabsContent value="runbooks">
          <div className="grid gap-3 sm:grid-cols-2">
            {RUNBOOKS.map((runbook) => (
              <div key={runbook.name} className="orbit-panel orbit-hairline p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-medium text-content">
                    <Play className="h-3.5 w-3.5 text-primary" />
                    {runbook.name}
                  </p>
                  <Badge tone="neutral">{runbook.steps} steps</Badge>
                </div>
                <p className="mt-2 text-xs text-content-subtle">{runbook.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <ScopePanel
              title="Runbooks are operational patterns"
              items={[
                "Vantage exposes the primitive operations each runbook needs",
                "Compose them from Backups, Snapshots, Console and Power controls",
                "Execution history is available in Logs and Tasks",
              ]}
              links={[{ href: "/backups", label: "Backups" }, { href: "/snapshots", label: "Snapshots" }, { href: "/tasks", label: "Tasks" }]}
            />
          </div>
        </TabsContent>

        <TabsContent value="schedules">
          <ScopePanel
            title="Scheduled jobs"
            items={["Cron-style recurring operations", "Maintenance windows with suppression", "Failure alerts and retries", "Per-server schedule overrides"]}
            note="The Virtualizor Enduser API does not expose cron or scheduling endpoints, so Vantage does not simulate a scheduler. Configure recurring tasks in the provider panel."
            links={[{ href: "/logs", label: "Operation log" }]}
          />
        </TabsContent>

        <TabsContent value="triggers">
          <ScopePanel
            title="Event triggers"
            items={["Trigger on task completion", "Trigger on resource threshold", "Trigger on status change", "Webhook fan-out"]}
            note="Event subscriptions require a backend event source the Enduser API does not provide. Threshold alerts can be reviewed from Monitoring."
            links={[{ href: "/monitoring", label: "Monitoring" }, { href: "/notifications", label: "Notifications" }]}
          />
        </TabsContent>
      </Tabs>
      <Panel>
        <PanelHeader title="Automation boundary" icon={<CalendarClock className="h-4 w-4" />} />
        <PanelBody className="flex flex-wrap items-center gap-3 text-xs text-content-subtle">
          <RefreshCw className="h-3.5 w-3.5" />
          Operations execute against the Virtualizor API in real time. Unsupported scheduling is stated explicitly rather than implied.
        </PanelBody>
      </Panel>
    </div>
  );
}
