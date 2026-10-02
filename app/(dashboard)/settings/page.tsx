"use client";

import {
  AlertTriangle,
  KeyRound,
  Loader2,
  Lock,
  MonitorSmartphone,
  Pencil,
  Plus,
  RotateCw,
  ServerCog,
  ShieldCheck,
  Terminal,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

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
} from "@/components/ui/dialog";
import { Input, Select, Textarea } from "@/components/ui/input";
import { KeyValue } from "@/components/ui/key-value";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, InlineAlert } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useApiKeys,
  useApiMutation,
  useReinstallOptions,
  useSshKeys,
  useVnc,
  useVpsInfo,
} from "@/hooks/use-virtualizor";
import { apiFetch, isApiError } from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/utils";
import type { ActionSuccess, ApiKeyInfo, SshKeyInfo } from "@/lib/virtualizor/types";

/* ------------------------------ Hostname ----------------------------- */

function HostnamePanel({ vpsId }: { vpsId: string }) {
  const info = useVpsInfo(vpsId);
  const [hostname, setHostname] = useState("");

  useEffect(() => {
    if (info.data?.hostname) setHostname(info.data.hostname);
  }, [info.data?.hostname]);

  const update = useApiMutation<string, ActionSuccess>({
    mutationFn: (value) => apiFetch<ActionSuccess>(`/api/vps/${vpsId}/hostname`, { method: "POST", body: { hostname: value } }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "info"], ["vps", vpsId, "tasks"], ["vps-list"]],
  });

  const dirty = hostname.trim().length > 0 && hostname.trim() !== info.data?.hostname;

  return (
    <Panel>
      <PanelHeader title="Hostname" description="The server's network name" icon={<ServerCog className="h-4 w-4" />} />
      <PanelBody className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="hostname">Hostname</Label>
          <Input
            id="hostname"
            value={hostname}
            onChange={(event) => setHostname(event.target.value)}
            placeholder="vps.example.com"
            autoComplete="off"
          />
          <p className="text-2xs text-content-subtle">
            Use a fully qualified domain name. The change is applied by the guest agent.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => update.mutate(hostname.trim())}
          disabled={!dirty || update.isPending}
        >
          {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save hostname
        </Button>
      </PanelBody>
    </Panel>
  );
}

/* ------------------------------ VNC panel ---------------------------- */

function VncPanel({ vpsId }: { vpsId: string }) {
  const query = useVnc(vpsId);
  const [password, setPassword] = useState("");

  const setPasswordMutation = useApiMutation<string, ActionSuccess>({
    mutationFn: (value) => apiFetch<ActionSuccess>(`/api/vps/${vpsId}/vnc`, { method: "POST", body: { password: value } }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "vnc"]],
  });

  return (
    <Panel>
      <PanelHeader
        title="VNC console"
        description="Remote console credentials"
        icon={<MonitorSmartphone className="h-4 w-4" />}
        action={
          <Button variant="ghost" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RotateCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />
      <PanelBody className="space-y-4">
        {query.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : query.isError ? (
          <p className="text-xs text-content-subtle">
            {isApiError(query.error) ? query.error.message : "VNC information is unavailable."}
          </p>
        ) : (
          <div className="space-y-1">
            <KeyValue label="Status">
              {query.data?.available ? <Badge tone="success">Available</Badge> : <Badge tone="neutral">Unavailable</Badge>}
            </KeyValue>
            <KeyValue label="Host">{query.data?.host ?? "Unavailable"}</KeyValue>
            <KeyValue label="Port">{query.data?.port ?? "Unavailable"}</KeyValue>
          </div>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            setPasswordMutation.mutate(password, { onSuccess: () => setPassword("") });
          }}
        >
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="vnc-pass">New VNC password</Label>
            <Input
              id="vnc-pass"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="6-8 characters"
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={password.length < 6 || password.length > 8 || setPasswordMutation.isPending}>
            {setPasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Update
          </Button>
        </form>
        <p className="text-2xs text-content-subtle">VNC passwords are limited to 8 characters by the RFB protocol.</p>
      </PanelBody>
    </Panel>
  );
}

/* ----------------------------- Rescue mode --------------------------- */

function RescuePanel({ vpsId }: { vpsId: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);

  const enable = useApiMutation<string, ActionSuccess>({
    mutationFn: (value) => apiFetch<ActionSuccess>(`/api/vps/${vpsId}/rescue`, { method: "POST", body: { password: value } }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "tasks"]],
  });

  const disable = useApiMutation<void, ActionSuccess>({
    mutationFn: () => apiFetch<ActionSuccess>(`/api/vps/${vpsId}/rescue`, { method: "DELETE" }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "tasks"]],
  });

  return (
    <>
      <Panel>
        <PanelHeader
          title="Rescue mode"
          description="Boot a recovery environment to repair the server"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <PanelBody className="space-y-4">
          <InlineAlert tone="warning" title="Enabling rescue restarts the server">
            The server reboots into a temporary rescue system. Use it to recover data or repair the bootloader.
          </InlineAlert>
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              enable.mutate(password, { onSuccess: () => setPassword("") });
            }}
          >
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="rescue-pass">Rescue root password</Label>
              <Input
                id="rescue-pass"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" variant="secondary" disabled={password.length < 8 || enable.isPending}>
              {enable.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enable rescue
            </Button>
          </form>
          <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} disabled={disable.isPending}>
            <Terminal className="h-3.5 w-3.5" />
            Disable rescue mode
          </Button>
        </PanelBody>
      </Panel>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Disable rescue mode?"
        description="The server will reboot back into its normal operating system."
        confirmLabel="Disable rescue"
        loading={disable.isPending}
        onConfirm={() => disable.mutate(undefined, { onSuccess: () => setConfirm(false) })}
      />
    </>
  );
}

/* ------------------------------ SSH keys ----------------------------- */

function SshKeyDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: SshKeyInfo | null;
}) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setValue(editing?.value ?? "");
    }
  }, [open, editing]);

  const save = useApiMutation<{ name: string; value: string }, ActionSuccess>({
    mutationFn: (body) =>
      editing
        ? apiFetch<ActionSuccess>(`/api/ssh-keys/${editing.id}`, { method: "PUT", body })
        : apiFetch<ActionSuccess>("/api/ssh-keys", { method: "POST", body }),
    successMessage: (result) => result.message,
    invalidateKeys: [["ssh-keys"]],
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit SSH key" : "Add SSH key"}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate({ name: name.trim(), value: value.trim() }, { onSuccess: () => onOpenChange(false) });
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ssh-name">Name</Label>
            <Input id="ssh-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="laptop" autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ssh-value">Public key</Label>
            <Textarea
              id="ssh-value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="ssh-ed25519 AAAA... user@host"
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={save.isPending || !name.trim() || !value.trim()}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editing ? "Save changes" : "Add key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SshKeysPanel({ vpsId }: { vpsId: string }) {
  const query = useSshKeys();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SshKeyInfo | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SshKeyInfo | null>(null);
  const [pendingApply, setPendingApply] = useState<SshKeyInfo | null>(null);

  const remove = useApiMutation<string, ActionSuccess>({
    mutationFn: (keyId) => apiFetch<ActionSuccess>(`/api/ssh-keys/${keyId}`, { method: "DELETE" }),
    successMessage: (result) => result.message,
    invalidateKeys: [["ssh-keys"]],
  });

  const apply = useApiMutation<string, ActionSuccess>({
    mutationFn: (keyId) => apiFetch<ActionSuccess>(`/api/vps/${vpsId}/ssh-keys`, { method: "POST", body: { keyIds: [keyId] } }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "tasks"]],
  });

  return (
    <>
      <Panel>
        <PanelHeader
          title="SSH keys"
          description="Authorised keys that can be deployed to servers"
          icon={<KeyRound className="h-4 w-4" />}
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Add key
            </Button>
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
              title="SSH keys unavailable"
              description={isApiError(query.error) ? query.error.message : undefined}
              onRetry={() => query.refetch()}
            />
          ) : (query.data?.length ?? 0) === 0 ? (
            <EmptyState icon={<KeyRound className="h-5 w-5" />} title="No SSH keys" description="Add a public key to deploy it." />
          ) : (
            <ul className="divide-y divide-border">
              {query.data?.map((key) => (
                <li key={key.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-content">{key.name}</p>
                    <p className="truncate font-mono text-2xs text-content-subtle">
                      {key.fingerprint ?? key.value ?? `Key ${key.id}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="secondary" size="sm" onClick={() => setPendingApply(key)}>
                      Apply
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit ${key.name}`}
                      onClick={() => {
                        setEditing(key);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${key.name}`} onClick={() => setPendingDelete(key)}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>

      <SshKeyDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
      <ConfirmDialog
        open={pendingApply !== null}
        onOpenChange={(next) => (next ? undefined : setPendingApply(null))}
        title="Deploy this key?"
        description="The public key is appended to the server's authorised_keys file."
        confirmLabel="Deploy key"
        loading={apply.isPending}
        onConfirm={() => {
          if (pendingApply) apply.mutate(pendingApply.id, { onSuccess: () => setPendingApply(null) });
        }}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => (next ? undefined : setPendingDelete(null))}
        title="Delete this SSH key?"
        description="The key will be removed from your account. Servers that already have it are unaffected."
        confirmLabel="Delete key"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
        }}
      />
    </>
  );
}

/* ------------------------------ API keys ----------------------------- */

function ApiKeysPanel() {
  const query = useApiKeys();
  const [pendingDelete, setPendingDelete] = useState<ApiKeyInfo | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const create = useApiMutation<void, ActionSuccess>({
    mutationFn: () => apiFetch<ActionSuccess>("/api/api-keys", { method: "POST" }),
    successMessage: (result) => result.message,
    invalidateKeys: [["api-keys"]],
  });

  const remove = useApiMutation<string, ActionSuccess>({
    mutationFn: (keyId) => apiFetch<ActionSuccess>(`/api/api-keys/${keyId}`, { method: "DELETE" }),
    successMessage: (result) => result.message,
    invalidateKeys: [["api-keys"]],
  });

  function handleCreate() {
    create.mutate(undefined, {
      onSuccess: (result) => {
        const data = result.data;
        if (data && typeof data === "object") {
          const record = data as Record<string, unknown>;
          const candidate = record.apikey ?? record.key ?? record.api_key;
          if (typeof candidate === "string" && candidate.length > 0) setCreatedKey(candidate);
        }
      },
    });
  }

  return (
    <>
      <Panel>
        <PanelHeader
          title="API credentials"
          description="Programmatic access keys for this Virtualizor account"
          icon={<KeyRound className="h-4 w-4" />}
          action={
            <Button variant="primary" size="sm" onClick={handleCreate} disabled={create.isPending}>
              {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Create key
            </Button>
          }
        />
        <PanelBody className="p-0">
          {createdKey ? (
            <div className="border-b border-border bg-success-soft/60 px-5 py-3">
              <p className="text-xs font-medium text-success">New key created. Copy it now; it will not be shown again.</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="max-w-full truncate rounded-control border border-border bg-surface px-2 py-1 font-mono text-xs text-content">
                  {createdKey}
                </code>
                <Button variant="ghost" size="sm" onClick={() => setCreatedKey(null)}>
                  Dismiss
                </Button>
              </div>
            </div>
          ) : null}
          {query.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState
              title="API keys unavailable"
              description={isApiError(query.error) ? query.error.message : undefined}
              onRetry={() => query.refetch()}
            />
          ) : (query.data?.length ?? 0) === 0 ? (
            <EmptyState icon={<KeyRound className="h-5 w-5" />} title="No API keys" description="Create a key for automation." />
          ) : (
            <ul className="divide-y divide-border">
              {query.data?.map((key) => (
                <li key={key.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-content">{key.name ?? `Key ${key.id}`}</p>
                    <p className="text-2xs text-content-subtle">
                      {key.lastUsed ? `Last used ${formatRelativeTime(new Date(key.lastUsed))}` : "Never used"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${key.name ?? key.id}`}
                    onClick={() => setPendingDelete(key)}
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
        title="Delete this API key?"
        description="Automation using this key will stop working immediately."
        confirmLabel="Delete key"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (pendingDelete) remove.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
        }}
      />
    </>
  );
}

/* ------------------------------ Reinstall ---------------------------- */

function ReinstallPanel({ vpsId }: { vpsId: string }) {
  const options = useReinstallOptions(vpsId);
  const [osId, setOsId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [rebuildSshKey, setRebuildSshKey] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const reinstall = useApiMutation<
    { osId: string; newPassword: string; confirmPassword: string; rebuildSshKey: boolean },
    ActionSuccess
  >({
    mutationFn: (body) => apiFetch<ActionSuccess>(`/api/vps/${vpsId}/reinstall`, { method: "POST", body }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "info"], ["vps", vpsId, "tasks"]],
  });

  const mismatched = confirmPassword.length > 0 && password !== confirmPassword;
  const ready = osId !== "" && password.length >= 8 && password === confirmPassword;

  return (
    <>
      <Panel>
        <PanelHeader
          title="Reinstall operating system"
          description="Wipe the server and provision a fresh OS"
          icon={<AlertTriangle className="h-4 w-4" />}
        />
        <PanelBody className="space-y-5">
          <InlineAlert tone="danger" title="This destroys all data">
            Reinstalling erases the entire disk, including files, databases and configuration. Back up anything important first.
          </InlineAlert>

          {options.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : options.isError ? (
            <p className="text-xs text-content-subtle">
              {isApiError(options.error) ? options.error.message : "OS templates are unavailable."}
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="os-template">Operating system</Label>
              <Select id="os-template" value={osId} onChange={(event) => setOsId(event.target.value)}>
                <option value="">Select an OS template</option>
                {options.data?.map((option) => (
                  <option key={option.osId} value={option.osId}>
                    {option.group ? `${option.group} · ${option.name}` : option.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="reinstall-pass">New root password</Label>
              <Input
                id="reinstall-pass"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reinstall-confirm">Confirm password</Label>
              <Input
                id="reinstall-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
              {mismatched ? <p className="text-xs text-danger">Passwords do not match.</p> : null}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-content-muted">
            <input
              type="checkbox"
              checked={rebuildSshKey}
              onChange={(event) => setRebuildSshKey(event.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Regenerate server SSH host keys after install
          </label>

          <Button variant="danger" onClick={() => setConfirmOpen(true)} disabled={!ready || reinstall.isPending}>
            {reinstall.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Reinstall server
          </Button>
        </PanelBody>
      </Panel>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Reinstall this server?"
        description="All data on the server will be permanently erased and replaced with a fresh operating system."
        confirmLabel="Erase and reinstall"
        destructive
        loading={reinstall.isPending}
        onConfirm={() =>
          reinstall.mutate(
            { osId, newPassword: password, confirmPassword, rebuildSshKey },
            {
              onSuccess: () => {
                setConfirmOpen(false);
                setPassword("");
                setConfirmPassword("");
              },
            },
          )
        }
      />
    </>
  );
}

/* ------------------------------- Page -------------------------------- */

function SettingsBody({ vpsId }: { vpsId: string }) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Settings"
        description="Manage server identity, console access, SSH keys, API credentials and reinstalls."
      />
      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="reinstall">Reinstall</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-6">
              <HostnamePanel vpsId={vpsId} />
              <VncPanel vpsId={vpsId} />
            </div>
            <RescuePanel vpsId={vpsId} />
          </div>
        </TabsContent>
        <TabsContent value="access">
          <div className="grid gap-6 xl:grid-cols-2">
            <SshKeysPanel vpsId={vpsId} />
            <ApiKeysPanel />
          </div>
        </TabsContent>
        <TabsContent value="reinstall">
          <div className="max-w-2xl">
            <ReinstallPanel vpsId={vpsId} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return <VpsGate>{(vpsId) => <SettingsBody vpsId={vpsId} />}</VpsGate>;
}
