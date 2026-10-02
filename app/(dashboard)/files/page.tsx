"use client";

import { Disc3, FolderOpen, HardDrive } from "lucide-react";

import { VpsGate } from "@/components/dashboard/vps-gate";
import { ScopePanel } from "@/components/platform/scope-panel";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCapabilities, useIsos, useVolumes } from "@/hooks/use-virtualizor";
import { formatMb } from "@/lib/utils";
import type { IsoInfo, VolumeInfo } from "@/lib/virtualizor/types";

function IsoTable({ vpsId }: { vpsId: string }) {
  const query = useIsos(vpsId);
  const columns: DataTableColumn<IsoInfo>[] = [
    {
      key: "name",
      header: "Image",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Disc3 className="h-4 w-4 text-content-subtle" />
          <div className="min-w-0">
            <p className="truncate font-medium text-content">{row.name}</p>
            {row.distro ? <p className="text-2xs text-content-subtle">{row.distro}</p> : null}
          </div>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: "size",
      header: "Size",
      align: "right",
      render: (row) => <span className="tabular">{row.size !== undefined ? formatMb(row.size, 1) : "Unavailable"}</span>,
      sortValue: (row) => row.size ?? -1,
    },
    {
      key: "state",
      header: "State",
      render: (row) => (
        <div className="flex items-center gap-1">
          {row.downloaded ? <Badge tone="success">Downloaded</Badge> : <Badge tone="warning">Pending</Badge>}
          {row.active ? <Badge tone="info">Mounted</Badge> : null}
        </div>
      ),
      sortValue: (row) => (row.downloaded ? "downloaded" : "pending"),
    },
  ];
  return (
    <DataTable
      data={query.data}
      columns={columns}
      getRowId={(row) => row.id}
      loading={query.isLoading}
      error={query.isError ? query.error : undefined}
      errorTitle="ISO library unavailable"
      onRetry={() => query.refetch()}
      searchPlaceholder="Search images…"
      emptyTitle="No ISO images"
      emptyDescription="ISO images added to the panel appear here."
    />
  );
}

function VolumeTable() {
  const query = useVolumes();
  const columns: DataTableColumn<VolumeInfo>[] = [
    {
      key: "name",
      header: "Volume",
      render: (row) => (
        <div className="flex items-center gap-3">
          <HardDrive className="h-4 w-4 text-content-subtle" />
          <div className="min-w-0">
            <p className="truncate font-medium text-content">{row.name ?? `Volume ${row.id}`}</p>
            <p className="tabular text-2xs text-content-subtle">#{row.id}</p>
          </div>
        </div>
      ),
      sortValue: (row) => row.name ?? row.id,
    },
    {
      key: "size",
      header: "Size",
      align: "right",
      render: (row) => <span className="tabular">{row.size !== undefined ? `${row.size} ${row.sizeUnit ?? "GB"}` : "Unavailable"}</span>,
      sortValue: (row) => row.size ?? -1,
    },
    {
      key: "format",
      header: "Format",
      render: (row) => <Badge tone="neutral">{row.format ?? "unknown"}</Badge>,
      sortValue: (row) => row.format ?? "",
    },
    {
      key: "attached",
      header: "Attachment",
      render: (row) => (row.attached ? <Badge tone="success">Attached</Badge> : <Badge tone="neutral">Detached</Badge>),
      sortValue: (row) => (row.attached ? 1 : 0),
    },
  ];
  return (
    <DataTable
      data={query.data}
      columns={columns}
      getRowId={(row) => row.id}
      loading={query.isLoading}
      error={query.isError ? query.error : undefined}
      errorTitle="Volumes unavailable"
      onRetry={() => query.refetch()}
      searchPlaceholder="Search volumes…"
      emptyTitle="No volumes"
      emptyDescription="Additional volumes attached to the account appear here."
    />
  );
}

function FilesBody({ vpsId }: { vpsId: string }) {
  const capabilities = useCapabilities();
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operate"
        title="Files"
        description="Storage artifacts the panel exposes, plus the file-manager capabilities available on this installation."
        actions={<Badge tone="neutral"><FolderOpen className="h-3 w-3" /> storage</Badge>}
      />
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="isos">ISO library</TabsTrigger>
          <TabsTrigger value="volumes">Volumes</TabsTrigger>
          <TabsTrigger value="editor">Editor &amp; archives</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ScopePanel
            title="File manager"
            items={[
              "Browse, upload, download, rename, copy, move and delete guest files",
              "Built-in editor with syntax highlighting and find/replace",
              "ZIP, TAR and GZIP archive extraction and compression",
              "chmod / chown permission management",
            ]}
            links={[{ href: "/storage", label: "Storage management" }]}
            note="The Virtualizor Enduser API does not expose a guest filesystem endpoint, so these controls are not simulated. Manage ISO images and volumes from Storage."
          />
        </TabsContent>
        <TabsContent value="isos"><IsoTable vpsId={vpsId} /></TabsContent>
        <TabsContent value="volumes"><VolumeTable /></TabsContent>
        <TabsContent value="editor">
          <ScopePanel
            title="Editor & archives"
            items={["Syntax highlighting", "Find and replace", "Save with unsaved-change guard", "Encoding and size metadata"]}
            note={
              capabilities.data?.supported.euiso === false
                ? "This panel does not expose the ISO endpoint either; only volumes are available."
                : "File editing requires a guest agent endpoint that the Enduser API does not provide."
            }
            links={[{ href: "/console", label: "Use the console for file operations" }]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function FilesPage() {
  return <VpsGate>{(vpsId) => <FilesBody vpsId={vpsId} />}</VpsGate>;
}
