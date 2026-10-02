"use client";

import { ArchiveRestore, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";

import { VpsGate } from "@/components/dashboard/vps-gate";
import { ScopePanel } from "@/components/platform/scope-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiMutation, useBackups } from "@/hooks/use-virtualizor";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import type { ActionSuccess, BackupInfo } from "@/lib/virtualizor/types";

type Pending = { kind: "restore" | "delete"; backup: BackupInfo } | null;

function BackupsTable({ vpsId }: { vpsId: string }) {
  const query = useBackups(vpsId);
  const [pending, setPending] = useState<Pending>(null);
  const [creating, setCreating] = useState(false);

  const create = useApiMutation<void, ActionSuccess>({
    mutationFn: () => apiFetch<ActionSuccess>(`/api/vps/${vpsId}/backups`, { method: "POST" }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "backups"], ["vps", vpsId, "tasks"]],
  });

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
      header: "Backup",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-content">{row.name ?? `Backup ${row.id}`}</p>
          <p className="tabular text-2xs text-content-subtle">#{row.id}</p>
        </div>
      ),
      sortValue: (row) => row.name ?? row.id,
    },
    {
      key: "type",
      header: "Type",
      render: (row) => <Badge tone="neutral">{row.type ?? "full"}</Badge>,
      sortValue: (row) => row.type ?? "",
    },
    {
      key: "size",
      header: "Size",
      align: "right",
      render: (row) => <span className="tabular">{row.sizeMb !== undefined ? `${row.sizeMb.toFixed(1)} MB` : "Unavailable"}</span>,
      sortValue: (row) => row.sizeMb ?? -1,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge tone={row.status === "failed" ? "danger" : row.status ? "success" : "neutral"}>{row.status ?? "unknown"}</Badge>
      ),
      sortValue: (row) => row.status ?? "",
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
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setPending({ kind: "restore", backup: row })}>
            <RotateCcw className="h-3.5 w-3.5" />
            Restore
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setPending({ kind: "delete", backup: row })}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const busy = restore.isPending || remove.isPending;

  return (
    <>
      <DataTable
        data={query.data}
        columns={columns}
        getRowId={(row) => row.id}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        errorTitle="Backups unavailable"
        onRetry={() => query.refetch()}
        searchPlaceholder="Search backups…"
        searchText={(row) => `${row.id} ${row.name ?? ""} ${row.status ?? ""} ${row.type ?? ""}`}
        emptyTitle="No backups"
        emptyDescription="Create a backup to protect this server's data."
        toolbar={
          <Button
            variant="primary"
            size="sm"
            disabled={create.isPending}
            onClick={() => {
              setCreating(true);
              create.mutate(undefined, { onSettled: () => setCreating(false) });
            }}
          >
            {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Create backup
          </Button>
        }
      />

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        destructive={pending?.kind === "delete" || pending?.kind === "restore"}
        loading={busy || creating}
        title={
          pending?.kind === "delete"
            ? "Delete this backup?"
            : pending?.kind === "restore"
              ? "Restore this backup?"
              : ""
        }
        description={
          pending?.kind === "delete"
            ? "The backup is permanently removed. This cannot be undone."
            : "Restoring overwrites the server's current disk contents with the backup snapshot."
        }
        confirmLabel={pending?.kind === "delete" ? "Delete" : "Restore"}
        onConfirm={() => {
          if (!pending) return;
          if (pending.kind === "delete") {
            remove.mutate(pending.backup.id, { onSettled: () => setPending(null) });
          } else {
            restore.mutate(pending.backup.id, { onSettled: () => setPending(null) });
          }
        }}
      />
    </>
  );
}

function BackupsBody({ vpsId }: { vpsId: string }) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operate"
        title="Backups"
        description="Create, verify, restore and prune server backups. Restore and delete require confirmation."
        actions={<Badge tone="info"><ArchiveRestore className="h-3 w-3" /> backup2</Badge>}
      />
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Backup list</TabsTrigger>
          <TabsTrigger value="retention">Storage &amp; retention</TabsTrigger>
          <TabsTrigger value="restore">Restore options</TabsTrigger>
        </TabsList>
        <TabsContent value="list"><BackupsTable vpsId={vpsId} /></TabsContent>
        <TabsContent value="retention">
          <ScopePanel
            title="Storage targets & retention"
            items={[
              "Local, S3, S3-compatible, NFS and remote targets are configured on the Virtualizor server",
              "Retention windows (daily, weekly, monthly) are enforced by the panel, not by Vantage",
              "Per-backup encryption and integrity verification are panel-managed",
            ]}
            links={[{ href: "/storage", label: "Storage overview" }, { href: "/settings", label: "Settings" }]}
            note="Vantage surfaces what the panel exposes and never fabricates target status that the API does not report."
          />
        </TabsContent>
        <TabsContent value="restore">
          <ScopePanel
            title="Restore options"
            items={[
              "Restore a full backup to the existing server (from the backup list)",
              "File and disk-level restore depend on panel capabilities",
              "Restoring as a new VPS is not exposed by the Enduser API",
            ]}
            links={[{ href: "/snapshots", label: "Snapshots & restore points" }]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function BackupsPage() {
  return <VpsGate>{(vpsId) => <BackupsBody vpsId={vpsId} />}</VpsGate>;
}
