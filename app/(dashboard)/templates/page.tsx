"use client";

import { Boxes, Package } from "lucide-react";

import { VpsGate } from "@/components/dashboard/vps-gate";
import { ScopePanel } from "@/components/platform/scope-panel";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCapabilities, useReinstallOptions } from "@/hooks/use-virtualizor";
import type { ReinstallOption } from "@/lib/virtualizor/types";

const APPLICATION_TEMPLATES = [
  { name: "Docker", detail: "Container runtime on a minimal base image" },
  { name: "Nginx", detail: "Reverse proxy and static web server" },
  { name: "Node.js", detail: "Node runtime with process manager" },
  { name: "WordPress", detail: "LAMP/LEMP stack with WordPress" },
  { name: "Minecraft", detail: "Java game server" },
  { name: "Pterodactyl", detail: "Game server management panel" },
];

function TemplatesBody({ vpsId }: { vpsId: string }) {
  const options = useReinstallOptions(vpsId);
  const capabilities = useCapabilities();

  const columns: DataTableColumn<ReinstallOption>[] = [
    {
      key: "name",
      header: "Operating system",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Package className="h-4 w-4 text-content-subtle" />
          <div className="min-w-0">
            <p className="truncate font-medium text-content">{row.name}</p>
            <p className="tabular text-2xs text-content-subtle">osid {row.osId}</p>
          </div>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: "group",
      header: "Family",
      render: (row) => <Badge tone="neutral">{row.group ?? "Other"}</Badge>,
      sortValue: (row) => row.group ?? "",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Automation"
        title="Templates & images"
        description="OS templates reported by the panel plus application templates."
        actions={<Badge tone={capabilities.data?.supported.ostemplate ? "success" : "warning"}><Boxes className="h-3 w-3" /> ostemplate</Badge>}
      />
      <Tabs defaultValue="os">
        <TabsList className="flex-wrap">
          <TabsTrigger value="os">OS templates</TabsTrigger>
          <TabsTrigger value="apps">Application templates</TabsTrigger>
          <TabsTrigger value="images">Custom images</TabsTrigger>
        </TabsList>
        <TabsContent value="os">
          <DataTable
            data={options.data}
            columns={columns}
            getRowId={(row) => row.osId}
            loading={options.isLoading}
            error={options.isError ? options.error : undefined}
            errorTitle="Templates unavailable"
            onRetry={() => options.refetch()}
            searchPlaceholder="Search templates…"
            emptyTitle="No templates"
            emptyDescription="The panel did not report any OS templates."
          />
        </TabsContent>
        <TabsContent value="apps">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {APPLICATION_TEMPLATES.map((template) => (
              <div key={template.name} className="orbit-panel orbit-hairline p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-control border border-border bg-surface-muted/60 text-primary">
                    <Boxes className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-medium text-content">{template.name}</p>
                </div>
                <p className="mt-2 text-xs text-content-subtle">{template.detail}</p>
                <p className="mt-3 text-2xs text-content-disabled">Provisioned by the panel, not Vantage</p>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="images">
          <ScopePanel
            title="Custom images"
            items={[
              "Import and export custom images through the Virtualizor panel",
              "Image library access depends on the panel's ISO and template endpoints",
              "Vantage lists ISO images under Storage",
            ]}
            links={[{ href: "/storage", label: "ISO library" }, { href: "/files", label: "Files" }]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function TemplatesPage() {
  return <VpsGate>{(vpsId) => <TemplatesBody vpsId={vpsId} />}</VpsGate>;
}
