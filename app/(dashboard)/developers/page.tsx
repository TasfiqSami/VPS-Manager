"use client";

import { BookOpen, KeyRound, Plus, Terminal, Trash2, Webhook } from "lucide-react";
import { useState } from "react";

import { ScopePanel } from "@/components/platform/scope-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiKeys, useApiMutation, useCapabilities } from "@/hooks/use-virtualizor";
import { apiFetch } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/utils";
import type { ActionSuccess, ApiKeyInfo } from "@/lib/virtualizor/types";

const API_REFERENCE: Array<{ method: string; path: string; description: string }> = [
  { method: "GET", path: "/api/vps", description: "List servers on the account" },
  { method: "GET", path: "/api/vps/:id", description: "Server details and live state" },
  { method: "POST", path: "/api/vps/:id/power", description: "Start, stop, restart or kill the guest" },
  { method: "GET", path: "/api/vps/:id/stats", description: "CPU, memory, disk and bandwidth" },
  { method: "GET", path: "/api/vps/:id/monitor", description: "Latest resource monitor snapshot" },
  { method: "GET", path: "/api/vps/:id/tasks", description: "In-flight and recent panel tasks" },
  { method: "GET", path: "/api/vps/:id/backups", description: "Available backups" },
  { method: "POST", path: "/api/vps/:id/backups", description: "Create a backup" },
  { method: "GET", path: "/api/vps/:id/firewall", description: "Firewall plans" },
  { method: "GET", path: "/api/ssh-keys", description: "List SSH public keys" },
  { method: "GET", path: "/api/capabilities", description: "Backend capability detection report" },
  { method: "GET", path: "/api/health", description: "Connectivity and configuration health" },
  { method: "GET", path: "/api/audit", description: "Mutation audit trail" },
];

function ApiKeysPanel() {
  const query = useApiKeys();
  const [pendingDelete, setPendingDelete] = useState<ApiKeyInfo | null>(null);

  const create = useApiMutation<void, ActionSuccess>({
    mutationFn: () => apiFetch<ActionSuccess>("/api/api-keys", { method: "POST" }),
    successMessage: (result) => result.message,
    invalidateKeys: [["api-keys"]],
  });
  const remove = useApiMutation<string, ActionSuccess>({
    mutationFn: (keyId) => apiFetch<ActionSuccess>(`/api/api-keys/${encodeURIComponent(keyId)}`, { method: "DELETE" }),
    successMessage: (result) => result.message,
    invalidateKeys: [["api-keys"]],
  });

  const columns: DataTableColumn<ApiKeyInfo>[] = [
    {
      key: "name",
      header: "Key",
      render: (row) => (
        <div className="flex items-center gap-3">
          <KeyRound className="h-4 w-4 text-content-subtle" />
          <div className="min-w-0">
            <p className="truncate font-medium text-content">{row.name ?? `Key ${row.id}`}</p>
            <p className="tabular text-2xs text-content-subtle">#{row.id}</p>
          </div>
        </div>
      ),
      sortValue: (row) => row.name ?? row.id,
    },
    {
      key: "created",
      header: "Created",
      render: (row) => <span className="text-xs text-content-muted">{row.createdAt ? formatRelativeTime(new Date(row.createdAt)) : "Unavailable"}</span>,
      sortValue: (row) => row.createdAt ?? "",
    },
    {
      key: "lastUsed",
      header: "Last used",
      render: (row) => <span className="text-xs text-content-muted">{row.lastUsed ? formatRelativeTime(new Date(row.lastUsed)) : "Never"}</span>,
      sortValue: (row) => row.lastUsed ?? "",
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <Button variant="ghost" size="icon" aria-label={`Revoke ${row.name ?? row.id}`} onClick={() => setPendingDelete(row)}>
          <Trash2 className="h-4 w-4 text-danger" />
        </Button>
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
        errorTitle="API keys unavailable"
        onRetry={() => query.refetch()}
        searchPlaceholder="Search keys…"
        emptyTitle="No API keys"
        emptyDescription="Create a key to authenticate the Virtualizor API programmatically."
        actions={<Button size="sm" variant="primary" disabled={create.isPending} onClick={() => create.mutate()}><Plus className="h-4 w-4" />Create key</Button>}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Revoke API key"
        description={pendingDelete ? `"${pendingDelete.name ?? pendingDelete.id}" will stop working immediately for every integration.` : undefined}
        confirmLabel="Revoke key"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          remove.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
        }}
      />
    </>
  );
}

export default function DevelopersPage() {
  const capabilities = useCapabilities();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Automation"
        title="Developer center"
        description="API keys, the HTTP surface Vantage exposes, and integration notes for automating this deployment."
        actions={<Badge tone={capabilities.data?.supported.apikey ? "success" : "warning"}><Terminal className="h-3 w-3" /> apikey API</Badge>}
      />
      <Tabs defaultValue="keys">
        <TabsList className="flex-wrap">
          <TabsTrigger value="keys">API keys</TabsTrigger>
          <TabsTrigger value="reference">API reference</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="security">Best practices</TabsTrigger>
        </TabsList>
        <TabsContent value="keys"><ApiKeysPanel /></TabsContent>
        <TabsContent value="reference">
          <Panel>
            <PanelHeader title="Vantage HTTP API" description="All routes are served by this deployment and authenticated by the dashboard session." icon={<BookOpen className="h-4 w-4" />} />
            <PanelBody className="space-y-4">
              <div className="flex items-center gap-2 rounded-card border border-border bg-surface-muted/40 px-3 py-2">
                <code className="min-w-0 flex-1 truncate font-mono text-xs text-content">/api/vps</code>
                <CopyButton value="/api/vps" label="Copy base" />
              </div>
              <DataTable
                data={API_REFERENCE}
                getRowId={(row) => `${row.method}-${row.path}`}
                searchPlaceholder="Search endpoints…"
                minWidthClassName="min-w-[560px]"
                columns={[
                  {
                    key: "method",
                    header: "Method",
                    render: (row) => <Badge tone={row.method === "GET" ? "info" : "warning"}>{row.method}</Badge>,
                    sortValue: (row) => row.method,
                  },
                  {
                    key: "path",
                    header: "Path",
                    render: (row) => <code className="font-mono text-xs text-content">{row.path}</code>,
                    sortValue: (row) => row.path,
                  },
                  { key: "description", header: "Description", render: (row) => <span className="text-xs text-content-muted">{row.description}</span> },
                ]}
              />
            </PanelBody>
          </Panel>
        </TabsContent>
        <TabsContent value="webhooks">
          <ScopePanel
            title="Webhooks"
            items={["Outbound event delivery on task completion", "HMAC-signed payloads", "Configurable retry with backoff", "Delivery attempt history"]}
            note="The Virtualizor Enduser API does not provide event subscriptions, so Vantage does not register webhooks. Poll /api/vps/:id/tasks or use the audit stream instead."
            links={[{ href: "/logs", label: "Live logs" }, { href: "/tasks", label: "Task history" }]}
          />
        </TabsContent>
        <TabsContent value="security">
          <ScopePanel
            title="Integration security"
            items={[
              "Virtualizor credentials are used server-side only and never sent to the browser",
              "Never expose API keys in client bundles or logs",
              "Rotate keys on a schedule and revoke unused credentials",
              "Scope keys to the minimum privileges required",
            ]}
            links={[{ href: "/security", label: "Security center" }]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
