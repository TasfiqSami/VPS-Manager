"use client";

import { Globe, Loader2, Plus, RotateCw, Shield, Trash2, Network as NetworkIcon } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { VpsGate } from "@/components/dashboard/vps-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Select } from "@/components/ui/input";
import { KeyValue } from "@/components/ui/key-value";
import { Label } from "@/components/ui/label";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiMutation, useDnsZones, useFirewallPlans, useReverseDns, useVpsInfo, useZoneRecords } from "@/hooks/use-virtualizor";
import { apiFetch, isApiError } from "@/lib/api-client";
import type { ActionSuccess, FirewallRule, VpsInfo } from "@/lib/virtualizor/types";

/* ----------------------------- Addresses ----------------------------- */

function AddressesTab({ vpsId }: { vpsId: string }) {
  const { data, isLoading } = useVpsInfo(vpsId);

  if (isLoading || !data) {
    return <Skeleton className="h-32 w-full rounded-card" />;
  }

  const addresses = [
    ...data.ips.map((ip) => ({ ip, version: 4 as const })),
    ...data.ipv6.map((ip) => ({ ip, version: 6 as const })),
  ];

  if (addresses.length === 0) {
    return (
      <Panel>
        <EmptyState
          icon={<Globe className="h-5 w-5" />}
          title="No addresses reported"
          description="This panel did not return IP addresses for the server."
        />
      </Panel>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {addresses.map((address, index) => (
        <div
          key={address.ip}
          className="orbit-panel flex items-center justify-between gap-3 px-4 py-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="tabular truncate text-sm font-medium text-content">{address.ip}</span>
              {index === 0 ? <Badge tone="primary">Primary</Badge> : null}
            </div>
            <p className="text-2xs uppercase tracking-wide text-content-subtle">IPv{address.version}</p>
          </div>
          <CopyButton value={address.ip} label="Copy" />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------- Reverse DNS ---------------------------- */

function ReverseDnsTab() {
  const query = useReverseDns();
  const [ip, setIp] = useState("");
  const [domain, setDomain] = useState("");

  const add = useApiMutation<{ ip: string; domain: string }, ActionSuccess>({
    mutationFn: (input) => apiFetch<ActionSuccess>("/api/reverse-dns", { method: "POST", body: input }),
    successMessage: (result) => result.message,
    invalidateKeys: [["reverse-dns"]],
  });

  const remove = useApiMutation<string, ActionSuccess>({
    mutationFn: (recordId) => apiFetch<ActionSuccess>(`/api/reverse-dns/${recordId}`, { method: "DELETE" }),
    successMessage: (result) => result.message,
    invalidateKeys: [["reverse-dns"]],
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    add.mutate(
      { ip: ip.trim(), domain: domain.trim() },
      {
        onSuccess: () => {
          setIp("");
          setDomain("");
        },
      },
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Panel>
        <PanelHeader
          title="Reverse DNS records"
          description="PTR entries associated with your addresses"
          action={
            <Button variant="ghost" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
              <RotateCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />
        <PanelBody className="p-0">
          {query.isLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <ErrorState
              title="Reverse DNS unavailable"
              description={isApiError(query.error) ? query.error.message : undefined}
              onRetry={() => query.refetch()}
            />
          ) : (query.data?.length ?? 0) === 0 ? (
            <EmptyState icon={<NetworkIcon className="h-5 w-5" />} title="No reverse DNS records" />
          ) : (
            <ul className="divide-y divide-border">
              {query.data?.map((record) => (
                <li key={record.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="tabular truncate text-sm font-medium text-content">{record.ip}</p>
                    <p className="truncate text-xs text-content-subtle">{record.domain}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete reverse DNS for ${record.ip}`}
                    onClick={() => remove.mutate(record.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title="Add record" description="Point an address at a hostname" icon={<Plus className="h-4 w-4" />} />
        <PanelBody>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-1.5">
              <Label htmlFor="rdns-ip">IPv4 address</Label>
              <Input
                id="rdns-ip"
                value={ip}
                onChange={(event) => setIp(event.target.value)}
                placeholder="203.0.113.10"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rdns-domain">Hostname</Label>
              <Input
                id="rdns-domain"
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder="server.example.com"
                autoComplete="off"
              />
            </div>
            <Button type="submit" variant="primary" disabled={add.isPending || !ip || !domain}>
              {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add record
            </Button>
          </form>
        </PanelBody>
      </Panel>
    </div>
  );
}

/* ------------------------------ Firewall ----------------------------- */

interface RuleDraft {
  action: "ACCEPT" | "DROP";
  protocol: "TCP" | "UDP" | "ICMP" | "ALL";
  port: string;
  source: string;
  destination: string;
}

const EMPTY_RULE: RuleDraft = { action: "ACCEPT", protocol: "TCP", port: "", source: "", destination: "" };

function FirewallTab({ vpsId }: { vpsId: string }) {
  const query = useFirewallPlans(vpsId);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [policy, setPolicy] = useState<"ACCEPT" | "DROP">("DROP");
  const [rules, setRules] = useState<RuleDraft[]>([{ ...EMPTY_RULE }]);

  const create = useApiMutation<{ name: string; defaultPolicy: "ACCEPT" | "DROP"; rules: RuleDraft[] }, ActionSuccess>({
    mutationFn: (input) =>
      apiFetch<ActionSuccess>(`/api/vps/${vpsId}/firewall`, {
        method: "POST",
        body: {
          name: input.name,
          defaultPolicy: input.defaultPolicy,
          rules: input.rules.map((rule) => ({
            action: rule.action,
            protocol: rule.protocol,
            ...(rule.port ? { port: rule.port } : {}),
            ...(rule.source ? { source: rule.source } : {}),
            ...(rule.destination ? { destination: rule.destination } : {}),
          })),
        },
      }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "firewall"]],
  });

  const remove = useApiMutation<string, ActionSuccess>({
    mutationFn: (planId) =>
      apiFetch<ActionSuccess>(`/api/vps/${vpsId}/firewall`, { method: "DELETE", body: { planIds: [planId] } }),
    successMessage: (result) => result.message,
    invalidateKeys: [["vps", vpsId, "firewall"]],
  });

  function updateRule(index: number, patch: Partial<RuleDraft>) {
    setRules((current) => current.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  }

  function submit() {
    create.mutate(
      { name: name.trim(), defaultPolicy: policy, rules },
      {
        onSuccess: () => {
          setOpen(false);
          setName("");
          setPolicy("DROP");
          setRules([{ ...EMPTY_RULE }]);
        },
      },
    );
  }

  return (
    <Panel>
      <PanelHeader
        title="Firewall plans"
        description="Rule sets that can be applied to the server"
        icon={<Shield className="h-4 w-4" />}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="primary" size="sm">
                <Plus className="h-3.5 w-3.5" />
                New plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create firewall plan</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fw-name">Plan name</Label>
                    <Input id="fw-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Web server" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="fw-policy">Default policy</Label>
                    <Select
                      id="fw-policy"
                      value={policy}
                      onChange={(event) => setPolicy(event.target.value as "ACCEPT" | "DROP")}
                    >
                      <option value="DROP">DROP (recommended)</option>
                      <option value="ACCEPT">ACCEPT</option>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Rules</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRules((current) => [...current, { ...EMPTY_RULE }])}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add rule
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {rules.map((rule, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2 rounded-card border border-border bg-surface-muted/40 p-3 sm:grid-cols-5">
                        <Select
                          aria-label="Action"
                          value={rule.action}
                          onChange={(event) => updateRule(index, { action: event.target.value as RuleDraft["action"] })}
                        >
                          <option value="ACCEPT">ACCEPT</option>
                          <option value="DROP">DROP</option>
                        </Select>
                        <Select
                          aria-label="Protocol"
                          value={rule.protocol}
                          onChange={(event) => updateRule(index, { protocol: event.target.value as RuleDraft["protocol"] })}
                        >
                          <option value="TCP">TCP</option>
                          <option value="UDP">UDP</option>
                          <option value="ICMP">ICMP</option>
                          <option value="ALL">ALL</option>
                        </Select>
                        <Input
                          aria-label="Port"
                          value={rule.port}
                          onChange={(event) => updateRule(index, { port: event.target.value })}
                          placeholder="22"
                        />
                        <Input
                          aria-label="Source"
                          value={rule.source}
                          onChange={(event) => updateRule(index, { source: event.target.value })}
                          placeholder="0.0.0.0/0"
                        />
                        <div className="flex gap-2">
                          <Input
                            aria-label="Destination"
                            value={rule.destination}
                            onChange={(event) => updateRule(index, { destination: event.target.value })}
                            placeholder="Any"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove rule"
                            disabled={rules.length === 1}
                            onClick={() => setRules((current) => current.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="h-4 w-4 text-danger" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={submit} disabled={create.isPending || name.trim().length === 0}>
                  {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Create plan
                </Button>
              </DialogFooter>
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
            title="Firewall plans unavailable"
            description={isApiError(query.error) ? query.error.message : undefined}
            onRetry={() => query.refetch()}
          />
        ) : (query.data?.length ?? 0) === 0 ? (
          <EmptyState icon={<Shield className="h-5 w-5" />} title="No firewall plans" description="Create a plan to get started." />
        ) : (
          <ul className="divide-y divide-border">
            {query.data?.map((plan) => (
              <li key={plan.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-content">{plan.name}</p>
                      {plan.defaultPolicy ? <Badge tone="neutral">{plan.defaultPolicy}</Badge> : null}
                    </div>
                    {plan.note ? <p className="mt-0.5 text-xs text-content-subtle">{plan.note}</p> : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${plan.name}`}
                    onClick={() => remove.mutate(plan.id)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
                {plan.rules.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {plan.rules.map((rule: FirewallRule, index) => (
                      <Badge key={rule.id ?? index} tone={rule.action === "DROP" ? "danger" : "success"}>
                        {rule.action} {rule.protocol}
                        {rule.port ? ` :${rule.port}` : ""}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-2xs text-content-disabled">No rules parsed from this plan.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </PanelBody>
    </Panel>
  );
}

/* -------------------------------- DNS -------------------------------- */

function DnsTab() {
  const zones = useDnsZones();
  const [zoneId, setZoneId] = useState<string | null>(null);
  const activeZoneId = zoneId ?? zones.data?.[0]?.id ?? null;
  const records = useZoneRecords(activeZoneId);

  const [recordName, setRecordName] = useState("");
  const [recordType, setRecordType] = useState("A");
  const [recordContent, setRecordContent] = useState("");
  const [recordTtl, setRecordTtl] = useState("");

  const addRecord = useApiMutation<void, ActionSuccess>({
    mutationFn: () =>
      apiFetch<ActionSuccess>(`/api/dns/${activeZoneId}/records`, {
        method: "POST",
        body: {
          name: recordName.trim(),
          type: recordType,
          content: recordContent.trim(),
          ...(recordTtl ? { ttl: Number(recordTtl) } : {}),
        },
      }),
    successMessage: (result) => result.message,
    invalidateKeys: [["dns-records", activeZoneId]],
  });

  const removeRecord = useApiMutation<string, ActionSuccess>({
    mutationFn: (recordId) =>
      apiFetch<ActionSuccess>(`/api/dns/${activeZoneId}/records/${recordId}`, { method: "DELETE" }),
    successMessage: (result) => result.message,
    invalidateKeys: [["dns-records", activeZoneId]],
  });

  const zone = useMemo(() => zones.data?.find((item) => item.id === activeZoneId), [zones.data, activeZoneId]);

  if (zones.isLoading) {
    return <Skeleton className="h-40 w-full rounded-card" />;
  }
  if (zones.isError) {
    return (
      <Panel>
        <ErrorState
          title="DNS zones unavailable"
          description={isApiError(zones.error) ? zones.error.message : undefined}
          onRetry={() => zones.refetch()}
        />
      </Panel>
    );
  }
  if ((zones.data?.length ?? 0) === 0) {
    return (
      <Panel>
        <EmptyState
          icon={<NetworkIcon className="h-5 w-5" />}
          title="No DNS zones"
          description="DNS management is not enabled for this account."
        />
      </Panel>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <Panel>
        <PanelHeader title="Zones" description="Select a managed domain" />
        <PanelBody className="p-2">
          <ul className="space-y-1">
            {zones.data?.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setZoneId(item.id)}
                  className={`w-full truncate rounded-control px-3 py-2 text-left text-sm transition-colors ${
                    item.id === activeZoneId
                      ? "bg-surface-muted text-content shadow-e1"
                      : "text-content-muted hover:bg-surface-muted/60 hover:text-content"
                  }`}
                >
                  {item.domain}
                </button>
              </li>
            ))}
          </ul>
        </PanelBody>
      </Panel>

      <div className="space-y-6">
        <Panel>
          <PanelHeader title={`Records · ${zone?.domain ?? ""}`} description="A, AAAA, CNAME, MX, NS, TXT and SRV" />
          <PanelBody className="p-0">
            {records.isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-9 w-full" />
                ))}
              </div>
            ) : records.isError ? (
              <ErrorState
                title="Records unavailable"
                description={isApiError(records.error) ? records.error.message : undefined}
                onRetry={() => records.refetch()}
              />
            ) : (records.data?.length ?? 0) === 0 ? (
              <EmptyState title="No records" description="Add the first record for this zone." />
            ) : (
              <ul className="divide-y divide-border">
                {records.data?.map((record) => (
                  <li key={record.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">{record.type}</Badge>
                        <span className="truncate text-sm font-medium text-content">{record.name}</span>
                      </div>
                      <p className="tabular mt-0.5 truncate text-xs text-content-subtle">
                        {record.content}
                        {record.ttl !== undefined ? ` · TTL ${record.ttl}` : ""}
                        {record.priority !== undefined ? ` · priority ${record.priority}` : ""}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${record.name}`}
                      onClick={() => removeRecord.mutate(record.id)}
                      disabled={removeRecord.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title="Add record" icon={<Plus className="h-4 w-4" />} />
          <PanelBody>
            <form
              className="grid gap-3 sm:grid-cols-4"
              onSubmit={(event) => {
                event.preventDefault();
                addRecord.mutate(undefined, {
                  onSuccess: () => {
                    setRecordName("");
                    setRecordContent("");
                    setRecordTtl("");
                  },
                });
              }}
            >
              <Input
                aria-label="Record name"
                value={recordName}
                onChange={(event) => setRecordName(event.target.value)}
                placeholder="@ or www"
              />
              <Select aria-label="Record type" value={recordType} onChange={(event) => setRecordType(event.target.value)}>
                {["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SRV"].map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
              <Input
                aria-label="Record content"
                value={recordContent}
                onChange={(event) => setRecordContent(event.target.value)}
                placeholder="203.0.113.10"
              />
              <div className="flex gap-2">
                <Input
                  aria-label="TTL"
                  value={recordTtl}
                  onChange={(event) => setRecordTtl(event.target.value.replace(/\D/g, ""))}
                  placeholder="TTL"
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={addRecord.isPending || !recordName.trim() || !recordContent.trim()}
                >
                  {addRecord.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </PanelBody>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------- Page -------------------------------- */

function NetworkBody({ vpsId }: { vpsId: string }) {
  const { data: vps } = useVpsInfo(vpsId);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operate"
        title="Network"
        description="Addresses, reverse DNS, firewall plans and DNS zones for your server."
      />
      <Tabs defaultValue="addresses">
        <TabsList>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="rdns">Reverse DNS</TabsTrigger>
          <TabsTrigger value="firewall">Firewall</TabsTrigger>
          <TabsTrigger value="dns">DNS</TabsTrigger>
        </TabsList>
        <TabsContent value="addresses">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <KeyValue label="Primary IP">
              {(vps?.ips[0] as string | undefined) ?? "Unavailable"}
            </KeyValue>
            <KeyValue label="IPv6 count">{vps?.ipv6.length ?? 0}</KeyValue>
            <KeyValue label="Hostname">{vps?.hostname ?? "Unavailable"}</KeyValue>
          </div>
          <AddressesTab vpsId={vpsId} />
        </TabsContent>
        <TabsContent value="rdns">
          <ReverseDnsTab />
        </TabsContent>
        <TabsContent value="firewall">
          <FirewallTab vpsId={vpsId} />
        </TabsContent>
        <TabsContent value="dns">
          <DnsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function NetworkPage() {
  return <VpsGate>{(vpsId) => <NetworkBody vpsId={vpsId} />}</VpsGate>;
}
