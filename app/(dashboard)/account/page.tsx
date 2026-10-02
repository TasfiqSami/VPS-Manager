"use client";

import { Building2, CheckCircle2, CreditCard, Gauge, UserCog, Users } from "lucide-react";

import { ScopePanel } from "@/components/platform/scope-panel";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { KeyValue, KeyValueSection, ValueOrUnavailable } from "@/components/ui/key-value";
import { Label } from "@/components/ui/label";
import { MetricCard } from "@/components/ui/metric-card";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveVps } from "@/hooks/use-active-vps";
import { useLocalPreference } from "@/hooks/use-local-preference";
import { useSession } from "@/hooks/use-session";
import { useVpsInfo } from "@/hooks/use-virtualizor";

interface AccountPrefs {
  organization: string;
  timezone: string;
}

const DEFAULT_ACCOUNT_PREFS: AccountPrefs = { organization: "", timezone: "UTC" };

const TIMEZONES = ["UTC", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney"];

function ProfilePanel() {
  const session = useSession();
  const [prefs, setPrefs] = useLocalPreference<AccountPrefs>("vantage.account", DEFAULT_ACCOUNT_PREFS);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel>
        <PanelHeader title="Session identity" description="How this dashboard is authenticated" icon={<UserCog className="h-4 w-4" />} />
        <PanelBody>
          <KeyValueSection title="Dashboard session">
            <KeyValue label="Authenticated">
              {session.data ? (session.data.authenticated ? <Badge tone="success">Yes</Badge> : <Badge tone="danger">No</Badge>) : "Unavailable"}
            </KeyValue>
            <KeyValue label="Mode"><ValueOrUnavailable value={session.data?.mode} /></KeyValue>
            <KeyValue label="Session length"><ValueOrUnavailable value={session.data ? `${Math.round(session.data.sessionSeconds / 3600)}h` : undefined} /></KeyValue>
            <KeyValue label="Note"><ValueOrUnavailable value={session.data?.reason} fallback="No notes" /></KeyValue>
          </KeyValueSection>
        </PanelBody>
      </Panel>
      <Panel>
        <PanelHeader title="Organization" description="Shown only in this browser" icon={<Building2 className="h-4 w-4" />} />
        <PanelBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="org">Organization name</Label>
            <Input id="org" value={prefs.organization} onChange={(event) => setPrefs({ ...prefs, organization: event.target.value })} placeholder="Acme Infrastructure" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tz">Display timezone</Label>
            <Select id="tz" value={prefs.timezone} onChange={(event) => setPrefs({ ...prefs, timezone: event.target.value })}>
              {TIMEZONES.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
            </Select>
          </div>
          <p className="text-xs text-content-subtle">Stored in localStorage. Client display preferences only.</p>
        </PanelBody>
      </Panel>
    </div>
  );
}

function QuotaPanel() {
  const { vpsId } = useActiveVps();
  const info = useVpsInfo(vpsId);

  if (!vpsId) {
    return <ScopePanel title="Quota" items={["Select a server to review allocated resources"]} />;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="vCPU" value={info.data?.cpuCores ?? "Unavailable"} icon={<Gauge className="h-4 w-4" />} tone="primary" />
        <MetricCard label="Memory" value={info.data?.ramMb ?? "Unavailable"} unit={info.data?.ramMb !== undefined ? "MB" : undefined} icon={<Gauge className="h-4 w-4" />} tone="info" />
        <MetricCard label="Disk" value={info.data?.diskGb ?? "Unavailable"} unit={info.data?.diskGb !== undefined ? "GB" : undefined} icon={<Gauge className="h-4 w-4" />} tone="success" />
        <MetricCard label="Bandwidth" value={info.data?.bandwidthGb ?? "Unavailable"} unit={info.data?.bandwidthGb !== undefined ? "GB" : undefined} icon={<Gauge className="h-4 w-4" />} tone="warning" />
      </div>
      <Panel>
        <PanelHeader title="Plan details" icon={<CreditCard className="h-4 w-4" />} />
        <PanelBody>
          <KeyValueSection title="Provisioned plan">
            <KeyValue label="Virtualization"><ValueOrUnavailable value={info.data?.virtualization} /></KeyValue>
            <KeyValue label="Burst memory"><ValueOrUnavailable value={info.data?.burstMb !== undefined ? `${info.data.burstMb} MB` : undefined} /></KeyValue>
            <KeyValue label="Network speed"><ValueOrUnavailable value={info.data?.networkSpeedMbps !== undefined ? `${info.data.networkSpeedMbps} Mbps` : undefined} /></KeyValue>
            <KeyValue label="Suspended"><ValueOrUnavailable value={info.data ? (info.data.suspended ? "Yes" : "No") : undefined} /></KeyValue>
          </KeyValueSection>
          <p className="mt-3 text-xs text-content-subtle">
            Invoices, payment methods and upgrade options are managed by the provider panel and are not exposed by the Enduser API.
          </p>
        </PanelBody>
      </Panel>
    </div>
  );
}

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Account"
        description="Dashboard session, provisioned quota and local display preferences."
        actions={<Badge tone="neutral"><Users className="h-3 w-3" /> owner</Badge>}
      />
      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="quota">Quota &amp; plan</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfilePanel /></TabsContent>
        <TabsContent value="quota"><QuotaPanel /></TabsContent>
        <TabsContent value="team">
          <ScopePanel
            title="Team"
            items={["Invite operators by email", "Assign roles per server", "Revoke access instantly", "Audit sign-in and mutation history"]}
            note="Sub-account management is enforced by the Virtualizor panel. Vantage reflects the effective permissions of the configured API account."
            links={[{ href: "/access", label: "Access control" }, { href: "/security", label: "Security center" }]}
          />
        </TabsContent>
        <TabsContent value="billing">
          <ScopePanel
            title="Billing"
            items={["Current plan and renewals", "Usage against quota", "Invoices and receipts", "Payment methods"]}
            note="Billing data is not exposed by the Virtualizor Enduser API. Review it in the provider's client area."
            links={[{ href: "/account", label: "Quota" }]}
          />
        </TabsContent>
      </Tabs>
      <div className="flex items-center gap-2 text-xs text-content-subtle">
        <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Account identity is resolved server-side; no credentials are stored in this page.
      </div>
    </div>
  );
}
