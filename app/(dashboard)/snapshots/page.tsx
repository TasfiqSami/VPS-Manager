"use client";

import { Camera, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

import { VpsGate } from "@/components/dashboard/vps-gate";
import { ScopePanel } from "@/components/platform/scope-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiMutation, useBackups, useCapabilities } from "@/hooks/use-virtualizor";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import type { ActionSuccess, BackupInfo } from "@/lib/virtualizor/types";

function RestorePoints({ vpsId }: { vpsId: string }) {
  const query = useBackups(vpsId);
  const [pending, setPending] = useState<{ kind: "restore" | "delete"; backup: BackupInfo } | null>(null);

  const restore = useApiMutation<string, ActionSuccess>({
    mutationFn: (backupId) => apiFetch<ActionSuccess>(`/api/vps/${vpsId}/backups/${backupId}`, { method: "POST" }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "backups"], ["vps", vpsId, "tasks"]],
  });
  const remove = useApiMutation<string, ActionSuccess>({
    mutationFn: (backupId) => apiFetch<ActionSuccess>(`/api/vps/${vpsId}/backups/${backupId}`, { method: "DELETE" }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "backups"]],
  });

  const columns: DataTableColumn<BackupInfo>[] = [
    {
      key: "name",
      header: "Restore point",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-content">{row.name ?? `Backup ${row.id}`}</p>
          <p className="tabular text-2xs text-content-subtle">#{row.id}</p>
        </div>
      ),
      sortValue: (row) => row.name ?? row.id,
    },
    {
      key: "created",
      header: "Created",
      render: (row) =>
        row.createdAt ? (
          <span className="text-xs text-content-subtle" title={formatDateTime(row.createdAt)}>
            {formatRelativeTime(new Date(row.createdAt))}
          </span>
        ) : (
          <span className="text-content-disabled">—</span>
        ),
      sortValue: (row) => (row.createdAt ? new Date(row.createdAt).getTime() : 0),
    },
    {
      key: "size",
      header: "Size",
      align: "right",
      render: (row) => <span className="tabular">{row.sizeMb !== undefined ? `${row.sizeMb.toFixed(1)} MB` : "Unavailable"}</span>,
      sortValue: (row) => row.sizeMb ?? -1,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setPending({ kind: "restore", backup: row })}>
            <RotateCcw className="h-3.5 w-3.5" /> Restore
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPending({ kind: "delete", backup: row })}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={query.data}
        columns={columns}
        getRowId={(row) => row.id}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        errorTitle="Restore points unavailable"
        onRetry={() => query.refetch()}
        searchPlaceholder="Search restore points…"
        emptyTitle="No restore points"
        emptyDescription="Create backups to populate restore points for this server."
      />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        destructive
        loading={restore.isPending || remove.isPending}
        title={pending?.kind === "delete" ? "Delete this restore point?" : "Restore this point?"}
        description={
          pending?.kind === "delete"
            ? "The backup is permanently removed."
            : "The server's disks will be reverted to this restore point."
        }
        confirmLabel={pending?.kind === "delete" ? "Delete" : "Restore"}
        onConfirm={() => {
          if (!pending) return;
          if (pending.kind === "delete") remove.mutate(pending.backup.id, { onSettled: () => setPending(null) });
          else restore.mutate(pending.backup.id, { onSettled: () => setPending(null) });
        }}
      />
    </>
  );
}

function SnapshotsBody({ vpsId }: { vpsId: string }) {
  const capabilities = useCapabilities();
  const snapshotSupported = capabilities.data?.supported.snapshot === true;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operate"
        title="Snapshots"
        description="Point-in-time restore points, schedules and retention."
        actions={
          <Badge tone={snapshotSupported ? "success" : "neutral"}>
            <Camera className="h-3 w-3" />
            {snapshotSupported ? "Native snapshots" : "Via backups"}
          </Badge>
        }
      />
      <Tabs defaultValue="points">
        <TabsList>
          <TabsTrigger value="points">Restore points</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
        </TabsList>
        <TabsContent value="points" className="space-y-5">
          {!snapshotSupported ? (
            <ScopePanel
              title="Native snapshots are not exposed"
              items={[
                "This Virtualizor panel does not advertise a snapshot endpoint",
                "Vantage uses server backups as restore points instead of inventing snapshot data",
                "Backups support restore and delete with full confirmation",
              ]}
              links={[{ href: "/backups", label: "Manage backups" }]}
              note="If your panel supports snapshots, the capability probe will detect it and this section will reflect native snapshots."
            />
          ) : null}
          <RestorePoints vpsId={vpsId} />
        </TabsContent>
        <TabsContent value="schedules">
          <ScopePanel
            title="Snapshot schedules"
            items={[
              "Hourly, daily, weekly, monthly and custom schedules are configured on the panel",
              "Vantage does not fabricate a scheduler that the API cannot enforce",
              "Use Virtualizor's scheduled backup feature for automatic captures",
            ]}
            links={[{ href: "/backups", label: "Backups & retention" }, { href: "/automation", label: "Automation" }]}
          />
        </TabsContent>
        <TabsContent value="policies">
          <ScopePanel
            title="Retention policies"
            items={[
              "Maximum snapshot count and automatic cleanup are panel-managed",
              "Retention windows are reported where the API exposes them",
              "Vantage never deletes restore points automatically",
            ]}
            links={[{ href: "/backups", label: "Backup retention" }]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SnapshotsPage() {
  return <VpsGate>{(vpsId) => <SnapshotsBody vpsId={vpsId} />}</VpsGate>;
}
