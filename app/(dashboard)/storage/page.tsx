"use client";

import {
  Disc3,
  Download,
  HardDrive,
  Loader2,
  Plus,
  RotateCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { VpsGate } from "@/components/dashboard/vps-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiMutation, useBackups, useIsos, useVolumes } from "@/hooks/use-virtualizor";
import { apiFetch, isApiError } from "@/lib/api-client";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import type { ActionSuccess, BackupInfo, IsoInfo, VolumeInfo } from "@/lib/virtualizor/types";

/* ------------------------------ Volumes ------------------------------ */

function VolumesTab() {
  const query = useVolumes();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [size, setSize] = useState("20");
  const [format, setFormat] = useState("ext4");
  const [attach, setAttach] = useState(true);
  const [mountPoint, setMountPoint] = useState("");
  const [pendingDelete, setPendingDelete] = useState<VolumeInfo | null>(null);

  const create = useApiMutation<Record<string, unknown>, ActionSuccess>({
    mutationFn: (body) => apiFetch<ActionSuccess>("/api/volumes", { method: "POST", body }),
    successMessage: (result) => result.message,
    invalidateKeys: [["volumes"]],
  });

  const remove = useApiMutation<string, ActionSuccess>({
    mutationFn: (volumeId) => apiFetch<ActionSuccess>(`/api/volumes/${volumeId}`, { method: "DELETE" }),
    successMessage: (result) => result.message,
    invalidateKeys: [["volumes"]],
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate(
      {
        name: name.trim(),
        size: Number(size),
        format,
        attach,
        ...(mountPoint.trim() ? { mountPoint: mountPoint.trim() } : {}),
      },
      {
        onSuccess: () => {
          setOpen(false);
          setName("");
          setSize("20");
          setFormat("ext4");
          setAttach(true);
          setMountPoint("");
        },
      },
    );
  }

  return (
    <>
      <Panel>
        <PanelHeader
          title="Volumes"
          description="Additional block storage attached to your account"
          icon={<HardDrive className="h-4 w-4" />}
          action={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
                <RotateCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button variant="primary" size="sm">
                    <Plus className="h-3.5 w-3.5" />
                    New volume
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create volume</DialogTitle>
                  </DialogHeader>
                  <form className="space-y-4" onSubmit={submit}>
                    <div className="space-y-1.5">
                      <Label htmlFor="vol-name">Name</Label>
                      <Input
                        id="vol-name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="data-01"
                        autoComplete="off"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="vol-size">Size (GB)</Label>
                        <Input
                          id="vol-size"
                          value={size}
                          onChange={(event) => setSize(event.target.value.replace(/[^\d]/g, ""))}
                          inputMode="numeric"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="vol-format">Filesystem</Label>
                        <Select id="vol-format" value={format} onChange={(event) => setFormat(event.target.value)}>
                          {["ext4", "ext3", "xfs", "btrfs"].map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="vol-mount">Mount point (optional)</Label>
                      <Input
                        id="vol-mount"
                        value={mountPoint}
                        onChange={(event) => setMountPoint(event.target.value)}
                        placeholder="/mnt/data"
                        autoComplete="off"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-content-muted">
                      <input
                        type="checkbox"
                        checked={attach}
                        onChange={(event) => setAttach(event.target.checked)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      Attach to the selected server after creation
                    </label>
                    <DialogFooter>
                      <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending}>
                        Cancel
                      </Button>
                      <Button type="submit" variant="primary" disabled={create.isPending || !name.trim()}>
                        {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        Create volume
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          }
        />
        <PanelBody className="p-0">
          {query.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState
              title="Volumes unavailable"
              description={isApiError(query.error) ? query.error.message : undefined}
              onRetry={() => query.refetch()}
            />
          ) : (query.data?.length ?? 0) === 0 ? (
            <EmptyState icon={<HardDrive className="h-5 w-5" />} title="No volumes" description="Create a volume to add storage." />
          ) : (
            <ul className="divide-y divide-border">
              {query.data?.map((volume) => (
                <li key={volume.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-content">{volume.name ?? `Volume ${volume.id}`}</p>
                      {volume.attached ? <Badge tone="success">Attached</Badge> : <Badge tone="neutral">Detached</Badge>}
                      {volume.format ? <Badge tone="neutral">{volume.format}</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-content-subtle">
                      {volume.size !== undefined ? `${volume.size} ${volume.sizeUnit ?? "GB"}` : "Size unavailable"}
                      {volume.mountPoint ? ` · mounted at ${volume.mountPoint}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${volume.name ?? volume.id}`}
                    onClick={() => setPendingDelete(volume)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => (next ? undefined : setPendingDelete(null))}
        title="Delete this volume?"
        description="All data stored on the volume will be permanently destroyed. This cannot be undone."
        confirmLabel="Delete volume"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
        }}
      />
    </>
  );
}

/* ------------------------------ Backups ------------------------------ */

function BackupsTab({ vpsId }: { vpsId: string }) {
  const query = useBackups(vpsId);
  const [pendingRestore, setPendingRestore] = useState<BackupInfo | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BackupInfo | null>(null);

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

  return (
    <>
      <Panel>
        <PanelHeader
          title="Backups"
          description="Snapshots that can be restored to this server"
          icon={<Upload className="h-4 w-4" />}
          action={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
                <RotateCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="primary" size="sm" onClick={() => create.mutate()} disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Create backup
              </Button>
            </div>
          }
        />
        <PanelBody className="p-0">
          {query.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState
              title="Backups unavailable"
              description={isApiError(query.error) ? query.error.message : undefined}
              onRetry={() => query.refetch()}
            />
          ) : (query.data?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Upload className="h-5 w-5" />}
              title="No backups"
              description="Create your first backup to protect this server."
            />
          ) : (
            <ul className="divide-y divide-border">
              {query.data?.map((backup) => (
                <li key={backup.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-content">{backup.name ?? `Backup ${backup.id}`}</p>
                      {backup.status ? <Badge tone="neutral">{backup.status}</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-content-subtle">
                      {backup.createdAt
                        ? `${formatDateTime(backup.createdAt)} (${formatRelativeTime(new Date(backup.createdAt))})`
                        : "Created time unavailable"}
                      {backup.sizeMb !== undefined ? ` · ${backup.sizeMb} MB` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="secondary" size="sm" onClick={() => setPendingRestore(backup)}>
                      <Download className="h-3.5 w-3.5" />
                      Restore
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete backup ${backup.id}`}
                      onClick={() => setPendingDelete(backup)}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>

      <ConfirmDialog
        open={pendingRestore !== null}
        onOpenChange={(next) => (next ? undefined : setPendingRestore(null))}
        title="Restore this backup?"
        description="The server will be stopped and its disk overwritten with the snapshot. Current data will be lost."
        confirmLabel="Restore backup"
        destructive
        loading={restore.isPending}
        onConfirm={() => {
          if (pendingRestore) restore.mutate(pendingRestore.id, { onSuccess: () => setPendingRestore(null) });
        }}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => (next ? undefined : setPendingDelete(null))}
        title="Delete this backup?"
        description="The snapshot will be permanently removed. This cannot be undone."
        confirmLabel="Delete backup"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
        }}
      />
    </>
  );
}

/* -------------------------------- ISOs ------------------------------- */

function IsosTab({ vpsId }: { vpsId: string }) {
  const query = useIsos(vpsId);
  const [open, setOpen] = useState(false);
  const [filename, setFilename] = useState("");
  const [isoUrl, setIsoUrl] = useState("");
  const [pendingDelete, setPendingDelete] = useState<IsoInfo | null>(null);

  const add = useApiMutation<{ filename: string; isoUrl: string }, ActionSuccess>({
    mutationFn: (body) => apiFetch<ActionSuccess>(`/api/vps/${vpsId}/isos`, { method: "POST", body }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "isos"]],
  });

  const remove = useApiMutation<string, ActionSuccess>({
    mutationFn: (isoId) => apiFetch<ActionSuccess>(`/api/vps/${vpsId}/isos/${isoId}`, { method: "DELETE" }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "isos"]],
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    add.mutate(
      { filename: filename.trim(), isoUrl: isoUrl.trim() },
      {
        onSuccess: () => {
          setOpen(false);
          setFilename("");
          setIsoUrl("");
        },
      },
    );
  }

  return (
    <>
      <Panel>
        <PanelHeader
          title="ISO library"
          description="Images available to mount on this server"
          icon={<Disc3 className="h-4 w-4" />}
          action={
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="primary" size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Add ISO
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add ISO from URL</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={submit}>
                  <div className="space-y-1.5">
                    <Label htmlFor="iso-name">Filename</Label>
                    <Input
                      id="iso-name"
                      value={filename}
                      onChange={(event) => setFilename(event.target.value)}
                      placeholder="ubuntu-24.04.iso"
                      autoComplete="off"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="iso-url">HTTPS URL</Label>
                    <Input
                      id="iso-url"
                      value={isoUrl}
                      onChange={(event) => setIsoUrl(event.target.value)}
                      placeholder="https://example.com/ubuntu-24.04.iso"
                      autoComplete="off"
                    />
                    <p className="text-2xs text-content-subtle">
                      The panel downloads the image over the network; only HTTPS sources are accepted.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={add.isPending}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={add.isPending || !filename.trim() || !isoUrl.trim()}>
                      {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Add ISO
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          }
        />
        <PanelBody className="p-0">
          {query.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState
              title="ISO library unavailable"
              description={isApiError(query.error) ? query.error.message : undefined}
              onRetry={() => query.refetch()}
            />
          ) : (query.data?.length ?? 0) === 0 ? (
            <EmptyState icon={<Disc3 className="h-5 w-5" />} title="No ISO images" description="Add an image by URL to mount it." />
          ) : (
            <ul className="divide-y divide-border">
              {query.data?.map((iso) => (
                <li key={iso.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-content">{iso.name}</p>
                      {iso.active ? <Badge tone="success">Mounted</Badge> : null}
                      {iso.downloaded === false ? <Badge tone="warning">Downloading</Badge> : null}
                      {iso.distro ? <Badge tone="neutral">{iso.distro}</Badge> : null}
                    </div>
                    <p className="mt-0.5 text-xs text-content-subtle">
                      {iso.size !== undefined ? `${iso.size} MB` : "Size unavailable"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${iso.name}`}
                    onClick={() => setPendingDelete(iso)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => (next ? undefined : setPendingDelete(null))}
        title="Delete this ISO?"
        description="The image will be removed from the server. This cannot be undone."
        confirmLabel="Delete ISO"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
        }}
      />
    </>
  );
}

/* ------------------------------- Page -------------------------------- */

function StorageBody({ vpsId }: { vpsId: string }) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operate"
        title="Storage"
        description="Volumes, server backups and ISO images managed through Virtualizor."
      />
      <Tabs defaultValue="backups">
        <TabsList>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="volumes">Volumes</TabsTrigger>
          <TabsTrigger value="isos">ISO library</TabsTrigger>
        </TabsList>
        <TabsContent value="backups">
          <BackupsTab vpsId={vpsId} />
        </TabsContent>
        <TabsContent value="volumes">
          <VolumesTab />
        </TabsContent>
        <TabsContent value="isos">
          <IsosTab vpsId={vpsId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function StoragePage() {
  return <VpsGate>{(vpsId) => <StorageBody vpsId={vpsId} />}</VpsGate>;
}
