"use client";

import { Cog, Loader2, Play, RotateCw, Square, Trash2 } from "lucide-react";
import { useState } from "react";

import { VpsGate } from "@/components/dashboard/vps-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { Meter } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiMutation, useProcesses, useServices } from "@/hooks/use-virtualizor";
import { apiFetch, isApiError } from "@/lib/api-client";
import type { ActionSuccess, ProcessInfo } from "@/lib/virtualizor/types";

type ServiceAction = "start" | "stop" | "restart";

/* ------------------------------ Services ----------------------------- */

function ServicesTab({ vpsId }: { vpsId: string }) {
  const query = useServices(vpsId);
  const [pendingAction, setPendingAction] = useState<{ action: ServiceAction; services: string[] } | null>(null);

  const manage = useApiMutation<{ action: ServiceAction; services: string[] }, ActionSuccess>({
    mutationFn: (body) => apiFetch<ActionSuccess>(`/api/vps/${vpsId}/services`, { method: "POST", body }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "services"]],
  });

  function run(action: ServiceAction, service: string) {
    setPendingAction({ action, services: [service] });
  }

  return (
    <>
      <Panel>
        <PanelHeader
          title="System services"
          description="Daemons reported by the guest agent"
          icon={<Cog className="h-4 w-4" />}
          action={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
                <RotateCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPendingAction({ action: "restart", services: (query.data ?? []).map((s) => s.name) })}
                disabled={(query.data?.length ?? 0) === 0}
              >
                <RotateCw className="h-3.5 w-3.5" />
                Restart all
              </Button>
            </div>
          }
        />
        <PanelBody className="p-0">
          {query.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState
              title="Services unavailable"
              description={isApiError(query.error) ? query.error.message : undefined}
              onRetry={() => query.refetch()}
            />
          ) : (query.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Cog className="h-5 w-5" />}
              title="No services reported"
              description="This server's panel does not expose an in-guest service list."
            />
          ) : (
            <ul className="divide-y divide-border">
              {query.data?.map((service) => (
                <li key={service.name} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${service.running ? "bg-success" : "bg-content-disabled"}`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-content">{service.name}</p>
                      <p className="text-2xs text-content-subtle">
                        {service.running ? "Running" : "Stopped"}
                        {service.pid !== undefined ? ` · PID ${service.pid}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => run("start", service.name)}
                      disabled={service.running}
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => run("restart", service.name)}
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      Restart
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => run("stop", service.name)}
                      disabled={!service.running}
                    >
                      <Square className="h-3.5 w-3.5" />
                      Stop
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>

      <ConfirmDialog
        open={pendingAction !== null}
        onOpenChange={(next) => (next ? undefined : setPendingAction(null))}
        title={`${pendingAction?.action === "stop" ? "Stop" : pendingAction?.action === "restart" ? "Restart" : "Start"} service${
          (pendingAction?.services.length ?? 0) > 1 ? "s" : ""
        }?`}
        description={
          pendingAction?.action === "restart"
            ? "Restarting a service briefly interrupts anything it powers."
            : pendingAction?.action === "stop"
              ? "Stopping a service takes it offline immediately."
              : "The service will be started."
        }
        confirmLabel={pendingAction?.action === "stop" ? "Stop service" : "Confirm"}
        destructive={pendingAction?.action === "stop"}
        loading={manage.isPending}
        onConfirm={() => {
          if (pendingAction) {
            manage.mutate(pendingAction, { onSuccess: () => setPendingAction(null) });
          }
        }}
      >
        {pendingAction && pendingAction.services.length <= 3 ? (
          <div className="flex flex-wrap gap-1.5">
            {pendingAction.services.map((name) => (
              <Badge key={name} tone="neutral">
                {name}
              </Badge>
            ))}
          </div>
        ) : pendingAction ? (
          <p className="text-xs text-content-subtle">{pendingAction.services.length} services will be affected.</p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}

/* ----------------------------- Processes ----------------------------- */

function ProcessesTab({ vpsId }: { vpsId: string }) {
  const query = useProcesses(vpsId);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState("");
  const [confirmKill, setConfirmKill] = useState(false);

  const kill = useApiMutation<number[], ActionSuccess>({
    mutationFn: (pids) => apiFetch<ActionSuccess>(`/api/vps/${vpsId}/processes`, { method: "POST", body: { pids } }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "processes"]],
  });

  const processes = query.data ?? [];
  const visible = filter.trim()
    ? processes.filter(
        (process) =>
          process.command.toLowerCase().includes(filter.trim().toLowerCase()) ||
          String(process.pid).includes(filter.trim()) ||
          (process.user ?? "").toLowerCase().includes(filter.trim().toLowerCase()),
      )
    : processes;

  function toggle(pid: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  }

  return (
    <>
      <Panel>
        <PanelHeader
          title="Running processes"
          description="Live process table for the guest"
          icon={<Cog className="h-4 w-4" />}
          action={
            <div className="flex items-center gap-2">
              <Input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter command, PID or user"
                className="h-8 w-56"
                aria-label="Filter processes"
              />
              <Button variant="ghost" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
                <RotateCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmKill(true)}
                disabled={selected.size === 0 || kill.isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Kill selected
              </Button>
            </div>
          }
        />
        <PanelBody className="p-0">
          {query.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-9 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState
              title="Process list unavailable"
              description={isApiError(query.error) ? query.error.message : undefined}
              onRetry={() => query.refetch()}
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={<Cog className="h-5 w-5" />}
              title={processes.length === 0 ? "No processes reported" : "No matching processes"}
              description={processes.length === 0 ? "The panel does not expose a process table for this server." : undefined}
            />
          ) : (
            <div className="overflow-x-auto orbit-scroll">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-border text-2xs uppercase tracking-wide text-content-subtle">
                    <th className="w-10 px-5 py-2.5">
                      <Checkbox
                        aria-label="Select all processes"
                        checked={visible.length > 0 && visible.every((process) => selected.has(process.pid))}
                        onCheckedChange={(checked) =>
                          setSelected(checked ? new Set(visible.map((process) => process.pid)) : new Set())
                        }
                      />
                    </th>
                    <th className="px-3 py-2.5 font-medium">PID</th>
                    <th className="px-3 py-2.5 font-medium">User</th>
                    <th className="px-3 py-2.5 font-medium">CPU</th>
                    <th className="px-3 py-2.5 font-medium">Memory</th>
                    <th className="px-3 py-2.5 font-medium">Command</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((process) => (
                    <ProcessRow
                      key={process.pid}
                      process={process}
                      checked={selected.has(process.pid)}
                      onToggle={() => toggle(process.pid)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </PanelBody>
      </Panel>

      <ConfirmDialog
        open={confirmKill}
        onOpenChange={setConfirmKill}
        title={`Kill ${selected.size} process${selected.size === 1 ? "" : "es"}?`}
        description="Selected processes are terminated immediately. Unsaved work in those processes will be lost."
        confirmLabel="Kill processes"
        destructive
        loading={kill.isPending}
        onConfirm={() => {
          kill.mutate([...selected], {
            onSuccess: () => {
              setSelected(new Set());
              setConfirmKill(false);
            },
          });
        }}
      />
    </>
  );
}

function ProcessRow({
  process,
  checked,
  onToggle,
}: {
  process: ProcessInfo;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <tr className="border-b border-border/60 text-sm last:border-0 hover:bg-surface-muted/40">
      <td className="px-5 py-3">
        <Checkbox aria-label={`Select process ${process.pid}`} checked={checked} onCheckedChange={onToggle} />
      </td>
      <td className="tabular px-3 py-3 text-content-muted">{process.pid}</td>
      <td className="px-3 py-3 text-content-muted">{process.user ?? "—"}</td>
      <td className="px-3 py-3">
        {process.cpuPercent === undefined ? (
          <span className="text-content-disabled">—</span>
        ) : (
          <span className="tabular text-content-muted">{process.cpuPercent.toFixed(1)}%</span>
        )}
      </td>
      <td className="px-3 py-3">
        {process.memoryPercent === undefined ? (
          <span className="text-content-disabled">—</span>
        ) : (
          <div className="w-24">
            <span className="tabular text-xs text-content-muted">{process.memoryPercent.toFixed(1)}%</span>
            <Meter value={process.memoryPercent} className="mt-1" />
          </div>
        )}
      </td>
      <td className="max-w-[28rem] truncate px-3 py-3 font-mono text-xs text-content" title={process.command}>
        {process.command}
      </td>
    </tr>
  );
}

/* ------------------------------- Page -------------------------------- */

function ServicesBody({ vpsId }: { vpsId: string }) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operate"
        title="Services"
        description="Control in-guest daemons and inspect the running process table."
      />
      <Tabs defaultValue="services">
        <TabsList>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="processes">Processes</TabsTrigger>
        </TabsList>
        <TabsContent value="services">
          <ServicesTab vpsId={vpsId} />
        </TabsContent>
        <TabsContent value="processes">
          <ProcessesTab vpsId={vpsId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ServicesPage() {
  return <VpsGate>{(vpsId) => <ServicesBody vpsId={vpsId} />}</VpsGate>;
}
