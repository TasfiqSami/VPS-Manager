"use client";

import { Fingerprint, KeyRound, Plus, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";

import { VpsGate } from "@/components/dashboard/vps-gate";
import { ScopePanel } from "@/components/platform/scope-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CapabilityNotice } from "@/components/ui/capability-notice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useApiMutation,
  useAuditLog,
  useCapabilities,
  useFirewallPlans,
  useSshKeys,
} from "@/hooks/use-virtualizor";
import { useActiveVps } from "@/hooks/use-active-vps";
import { apiFetch } from "@/lib/api-client";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import type {
  ActionSuccess,
  AuditRecordInfo,
  FirewallPlan,
  SshKeyInfo,
} from "@/lib/virtualizor/types";

/* ------------------------------- SSH keys ------------------------------ */

function AddKeyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const mutation = useApiMutation<{ name: string; value: string }, ActionSuccess>({
    mutationFn: (body) => apiFetch<ActionSuccess>("/api/ssh-keys", { method: "POST", body }),
    successMessage: (result) => result.message,
    invalidateKeys: [["ssh-keys"]],
  });

  const submit = () => {
    mutation.mutate(
      { name: name.trim(), value: value.trim() },
      {
        onSuccess: () => {
          setName("");
          setValue("");
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add SSH key</DialogTitle>
          <DialogDescription>Register an OpenSSH public key with the panel. Private keys never leave your device.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="key-name">Key name</Label>
            <Input id="key-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="workstation-ed25519" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="key-value">Public key</Label>
            <Textarea
              id="key-value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5… user@host"
              className="min-h-[7rem] font-mono text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim() || !value.trim() || mutation.isPending} onClick={submit}>
            Add key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SshKeysPanel() {
  const query = useSshKeys();
  const [addOpen, setAddOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SshKeyInfo | null>(null);

  const remove = useApiMutation<string, ActionSuccess>({
    mutationFn: (keyId) => apiFetch<ActionSuccess>(`/api/ssh-keys/${encodeURIComponent(keyId)}`, { method: "DELETE" }),
    successMessage: (result) => result.message,
    invalidateKeys: [["ssh-keys"]],
  });

  const columns: DataTableColumn<SshKeyInfo>[] = [
    {
      key: "name",
      header: "Key",
      render: (row) => (
        <div className="flex items-center gap-3">
          <KeyRound className="h-4 w-4 text-content-subtle" />
          <div className="min-w-0">
            <p className="truncate font-medium text-content">{row.name}</p>
            {row.fingerprint ? <p className="truncate font-mono text-2xs text-content-subtle">{row.fingerprint}</p> : null}
          </div>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: "value",
      header: "Public key",
      render: (row) =>
        row.value ? <span className="font-mono text-xs text-content-muted">{row.value.slice(0, 48)}…</span> : <Badge tone="neutral">Hidden</Badge>,
      sortValue: (row) => row.value ?? "",
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <Button variant="ghost" size="icon" aria-label={`Delete ${row.name}`} onClick={() => setPendingDelete(row)}>
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
        errorTitle="SSH keys unavailable"
        onRetry={() => query.refetch()}
        searchPlaceholder="Search keys…"
        emptyTitle="No SSH keys"
        emptyDescription="Add an OpenSSH public key to enable passwordless access."
        actions={<Button size="sm" variant="primary" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add key</Button>}
      />
      <AddKeyDialog open={addOpen} onOpenChange={setAddOpen} />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete SSH key"
        description={pendingDelete ? `"${pendingDelete.name}" will be permanently removed and revoked from any server using it.` : undefined}
        confirmLabel="Delete key"
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

/* ------------------------------- Firewall ------------------------------ */

function FirewallPanel() {
  const { vpsId } = useActiveVps();
  const query = useFirewallPlans(vpsId);
  const [pendingDelete, setPendingDelete] = useState<FirewallPlan | null>(null);

  const remove = useApiMutation<string[], ActionSuccess>({
    mutationFn: (planIds) => apiFetch<ActionSuccess>(`/api/vps/${vpsId}/firewall`, { method: "DELETE", body: { planIds } }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "firewall"]],
  });

  if (!vpsId) {
    return <ScopePanel title="Firewall" items={["Select a server to view its firewall plans"]} />;
  }

  const columns: DataTableColumn<FirewallPlan>[] = [
    {
      key: "name",
      header: "Plan",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-content">{row.name}</p>
          {row.note ? <p className="truncate text-2xs text-content-subtle">{row.note}</p> : null}
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: "policy",
      header: "Default policy",
      render: (row) => (
        <Badge tone={row.defaultPolicy === "DROP" ? "danger" : "success"}>{row.defaultPolicy ?? "Unspecified"}</Badge>
      ),
      sortValue: (row) => row.defaultPolicy ?? "",
    },
    {
      key: "rules",
      header: "Rules",
      align: "right",
      render: (row) => <span className="tabular">{row.rules.length}</span>,
      sortValue: (row) => row.rules.length,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (row) => (
        <Button variant="ghost" size="icon" aria-label={`Delete ${row.name}`} onClick={() => setPendingDelete(row)}>
          <Trash2 className="h-4 w-4 text-danger" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <DataTable
        data={query.data}
        columns={columns}
        getRowId={(row) => row.id}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        errorTitle="Firewall plans unavailable"
        onRetry={() => query.refetch()}
        searchPlaceholder="Search firewall plans…"
        emptyTitle="No firewall plans"
        emptyDescription="Firewall plans created in the panel appear here."
      />
      <Panel>
        <PanelHeader title="Rules preview" description="Rules reported for each plan" icon={<ShieldCheck className="h-4 w-4" />} />
        <PanelBody className="space-y-4">
          {(query.data ?? []).length === 0 ? (
            <p className="text-sm text-content-subtle">No plan rules to display.</p>
          ) : (
            (query.data ?? []).map((plan) => (
              <div key={plan.id} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-content-subtle">{plan.name}</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-xs">
                    <thead className="text-content-disabled">
                      <tr>
                        <th className="pb-1 pr-4 font-medium">Action</th>
                        <th className="pb-1 pr-4 font-medium">Protocol</th>
                        <th className="pb-1 pr-4 font-medium">Port</th>
                        <th className="pb-1 pr-4 font-medium">Source</th>
                        <th className="pb-1 font-medium">Destination</th>
                      </tr>
                    </thead>
                    <tbody className="text-content-muted">
                      {plan.rules.map((rule, index) => (
                        <tr key={rule.id ?? `${plan.id}-${index}`} className="border-t border-border/70">
                          <td className="py-1.5 pr-4">
                            <Badge tone={rule.action === "ACCEPT" ? "success" : "danger"}>{rule.action}</Badge>
                          </td>
                          <td className="py-1.5 pr-4">{rule.protocol}</td>
                          <td className="py-1.5 pr-4 tabular">{rule.port ?? "any"}</td>
                          <td className="py-1.5 pr-4">{rule.source ?? "any"}</td>
                          <td className="py-1.5">{rule.destination ?? "any"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </PanelBody>
      </Panel>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete firewall plan"
        description={pendingDelete ? `"${pendingDelete.name}" will be removed from the server. This cannot be undone.` : undefined}
        confirmLabel="Delete plan"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (!pendingDelete) return;
          remove.mutate([pendingDelete.id], { onSuccess: () => setPendingDelete(null) });
        }}
      />
    </div>
  );
}

/* -------------------------------- Events ------------------------------- */

function EventsPanel() {
  const query = useAuditLog();
  const [outcome, setOutcome] = useState<"all" | "success" | "failure">("all");

  const records = (query.data?.records ?? []).filter((record) =>
    outcome === "all" ? true : outcome === "success" ? record.success : !record.success,
  );

  const columns: DataTableColumn<AuditRecordInfo>[] = [
    {
      key: "time",
      header: "Time",
      render: (row) => <span className="tabular text-xs text-content-muted">{formatDateTime(row.timestamp)}</span>,
      sortValue: (row) => row.timestamp,
    },
    {
      key: "operation",
      header: "Operation",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-content">{row.method} {row.path}</p>
          {row.code ? <p className="truncate text-2xs text-content-subtle">{row.code}</p> : null}
        </div>
      ),
      sortValue: (row) => `${row.method} ${row.path}`,
    },
    {
      key: "actor",
      header: "Actor",
      render: (row) => <span className="text-xs text-content-muted">{row.actor}</span>,
      sortValue: (row) => row.actor,
    },
    {
      key: "status",
      header: "Result",
      render: (row) => (
        <Badge tone={row.success ? "success" : "danger"}>{row.status}</Badge>
      ),
      sortValue: (row) => row.status,
    },
    {
      key: "duration",
      header: "Duration",
      align: "right",
      render: (row) => <span className="tabular text-xs">{row.durationMs}ms</span>,
      sortValue: (row) => row.durationMs,
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs text-content-subtle">
        Retention: {query.data?.retention ?? "in-memory"}
        {query.data?.records?.[0]?.timestamp ? ` · last event ${formatRelativeTime(new Date(query.data.records[0].timestamp))}` : ""} · mutations recorded by this Vantage instance.
      </p>
      <DataTable
        data={records}
        columns={columns}
        getRowId={(row) => row.id}
        loading={query.isLoading}
        error={query.isError ? query.error : undefined}
        errorTitle="Security event log unavailable"
        onRetry={() => query.refetch()}
        searchPlaceholder="Search events…"
        emptyTitle="No events recorded"
        emptyDescription="Mutating operations performed through Vantage appear here."
        filters={
          <Select value={outcome} onChange={(event) => setOutcome(event.target.value as typeof outcome)} aria-label="Filter by outcome">
            <option value="all">All outcomes</option>
            <option value="success">Succeeded</option>
            <option value="failure">Failed</option>
          </Select>
        }
      />
    </div>
  );
}

/* -------------------------------- Page -------------------------------- */

function SecurityBody() {
  const capabilities = useCapabilities();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security"
        title="Security center"
        description="SSH access, firewall plans and a tamper-evident view of every mutating operation Vantage performed."
        actions={
          <Badge tone={capabilities.data?.supported.sshkeys ? "success" : "warning"}>
            <ShieldCheck className="h-3 w-3" /> SSH API {capabilities.data?.supported.sshkeys ? "available" : "unverified"}
          </Badge>
        }
      />
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ssh">SSH keys</TabsTrigger>
          <TabsTrigger value="firewall">Firewall</TabsTrigger>
          <TabsTrigger value="events">Event log</TabsTrigger>
          <TabsTrigger value="access">Access control</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ScopePanel
            title="Security posture"
            items={[
              "Register and revoke OpenSSH public keys",
              "Inspect firewall plans and per-rule policies",
              "Review every mutating request with actor, status and latency",
              "Track unsupported controls honestly instead of simulating them",
            ]}
            links={[{ href: "/access", label: "Access control" }, { href: "/developers", label: "API keys" }]}
            note="Two-factor authentication and sub-account roles are managed by the Virtualizor panel and are not exposed through the Enduser API."
          />
        </TabsContent>
        <TabsContent value="ssh">
          <CapabilityNotice report={capabilities.data} act="sshkeys" feature="SSH key management">
            <SshKeysPanel />
          </CapabilityNotice>
        </TabsContent>
        <TabsContent value="firewall"><FirewallPanel /></TabsContent>
        <TabsContent value="events"><EventsPanel /></TabsContent>
        <TabsContent value="access">
          <ScopePanel
            title="Access control"
            items={[
              "Panel-enforced two-factor authentication",
              "Role-based sub-accounts and delegated permissions",
              "IP allowlisting for panel and SSH access",
              "Session timeout and concurrent session limits",
            ]}
            links={[{ href: "/access", label: "Open access center" }, { href: "/settings", label: "Server settings" }]}
            note="These controls live in the Virtualizor panel. Vantage surfaces the account state it can verify and links to where the controls are enforced."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <VpsGate>
      {() => (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs text-content-subtle">
            <Fingerprint className="h-3.5 w-3.5" /> Signed audit identity: requests are attributed to the authenticated actor.
            <ShieldAlert className="ml-auto h-3.5 w-3.5" /> Secrets never reach the browser.
          </div>
          <SecurityBody />
        </div>
      )}
    </VpsGate>
  );
}
