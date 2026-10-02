"use client";

import { Bell, BellRing, CheckCheck, Filter, Mail, MessageSquare, MonitorSmartphone } from "lucide-react";
import { useMemo, useState } from "react";

import { CapabilityNotice } from "@/components/ui/capability-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocalPreference } from "@/hooks/use-local-preference";
import { useAuditLog, useCapabilities } from "@/hooks/use-virtualizor";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { AuditRecordInfo } from "@/lib/virtualizor/types";

type Channel = "inApp" | "email" | "webhook";
type Category = "power" | "backup" | "security" | "billing";

interface NotificationPrefs {
  channels: Record<Channel, boolean>;
  categories: Record<Category, boolean>;
}

const DEFAULT_PREFS: NotificationPrefs = {
  channels: { inApp: true, email: false, webhook: false },
  categories: { power: true, backup: true, security: true, billing: false },
};

const CATEGORY_LABEL: Record<Category, string> = {
  power: "Power & lifecycle",
  backup: "Backups & snapshots",
  security: "Security & access",
  billing: "Billing & quota",
};

const RESOURCE_CATEGORY: Record<string, Category> = {
  power: "power",
  vps: "power",
  backups: "backup",
  snapshots: "backup",
  firewall: "security",
  "ssh-keys": "security",
  auth: "security",
  "api-keys": "security",
};

function categoryOf(record: AuditRecordInfo): Category {
  return RESOURCE_CATEGORY[record.resource] ?? "power";
}

function severityOf(record: AuditRecordInfo): "info" | "success" | "warning" {
  if (!record.success) return "warning";
  return "success";
}

function NotificationList({ records }: { records: AuditRecordInfo[] }) {
  const [prefs] = useLocalPreference<NotificationPrefs>("vantage.notifications", DEFAULT_PREFS);

  const visible = useMemo(
    () => records.filter((record) => prefs.categories[categoryOf(record)]),
    [records, prefs.categories],
  );

  if (visible.length === 0) {
    return (
      <p className="text-sm text-content-subtle">
        No notifications match your categories yet. Events are generated from real operations recorded by Vantage.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {visible.slice(0, 40).map((record) => {
        const severity = severityOf(record);
        return (
          <li key={record.id} className="flex items-start gap-3 rounded-card border border-border bg-surface-muted/30 p-3">
            <span
              className={cn(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-control border",
                severity === "warning"
                  ? "border-danger/30 bg-danger-soft text-danger"
                  : "border-success/30 bg-success-soft text-success",
              )}
            >
              {severity === "warning" ? <BellRing className="h-3.5 w-3.5" /> : <CheckCheck className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-content">
                {record.method} {record.path}
              </p>
              <p className="truncate text-xs text-content-subtle">
                {record.actor} · {CATEGORY_LABEL[categoryOf(record)]} · status {record.status}
              </p>
            </div>
            <span className="tabular shrink-0 text-2xs text-content-disabled">{formatRelativeTime(new Date(record.timestamp))}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function NotificationsPage() {
  const audit = useAuditLog();
  const capabilities = useCapabilities();
  const [prefs, setPrefs] = useLocalPreference<NotificationPrefs>("vantage.notifications", DEFAULT_PREFS);

  const toggleChannel = (channel: Channel) =>
    setPrefs({ ...prefs, channels: { ...prefs.channels, [channel]: !prefs.channels[channel] } });
  const toggleCategory = (category: Category) =>
    setPrefs({ ...prefs, categories: { ...prefs.categories, [category]: !prefs.categories[category] } });

  const records = audit.data?.records ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Notifications"
        description="Category preferences for this browser plus a live feed built from real operations recorded by Vantage."
        actions={<Badge tone="neutral"><Bell className="h-3 w-3" /> {records.length} events</Badge>}
      />
      <Tabs defaultValue="inbox">
        <TabsList className="flex-wrap">
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <Panel>
            <PanelHeader title="Event feed" description="Filtered by your category preferences" icon={<BellRing className="h-4 w-4" />} />
            <PanelBody>
              <NotificationList records={records} />
            </PanelBody>
          </Panel>
        </TabsContent>

        <TabsContent value="preferences">
          <Panel>
            <PanelHeader title="Categories" description="Stored in this browser only" icon={<Filter className="h-4 w-4" />} />
            <PanelBody className="space-y-1">
              {(Object.keys(CATEGORY_LABEL) as Category[]).map((category) => (
                <label key={category} className="flex items-center justify-between gap-4 py-2">
                  <span className="text-sm text-content">{CATEGORY_LABEL[category]}</span>
                  <Switch checked={prefs.categories[category]} onCheckedChange={() => toggleCategory(category)} aria-label={CATEGORY_LABEL[category]} />
                </label>
              ))}
              <p className="pt-2 text-xs text-content-subtle">Preferences persist in localStorage and never change server state.</p>
            </PanelBody>
          </Panel>
        </TabsContent>

        <TabsContent value="channels">
          <div className="space-y-4">
            <Panel>
              <PanelHeader title="Delivery channels" icon={<MonitorSmartphone className="h-4 w-4" />} />
              <PanelBody className="space-y-1">
                <label className="flex items-center justify-between gap-4 py-2">
                  <span className="flex items-center gap-2 text-sm text-content"><MonitorSmartphone className="h-4 w-4 text-content-subtle" /> In-app</span>
                  <Switch checked={prefs.channels.inApp} onCheckedChange={() => toggleChannel("inApp")} aria-label="In-app notifications" />
                </label>
                <label className="flex items-center justify-between gap-4 py-2">
                  <span className="flex items-center gap-2 text-sm text-content"><Mail className="h-4 w-4 text-content-subtle" /> Email</span>
                  <Switch checked={prefs.channels.email} onCheckedChange={() => toggleChannel("email")} aria-label="Email notifications" />
                </label>
                <label className="flex items-center justify-between gap-4 py-2">
                  <span className="flex items-center gap-2 text-sm text-content"><MessageSquare className="h-4 w-4 text-content-subtle" /> Webhook</span>
                  <Switch checked={prefs.channels.webhook} onCheckedChange={() => toggleChannel("webhook")} aria-label="Webhook notifications" />
                </label>
              </PanelBody>
            </Panel>
            <CapabilityNotice report={capabilities.data} act="apikey" feature="Outbound delivery">
              <p className="text-xs text-content-muted">
                Email and webhook delivery require an external delivery service. Vantage records the preference; delivery is not simulated.
              </p>
            </CapabilityNotice>
          </div>
        </TabsContent>
      </Tabs>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setPrefs(DEFAULT_PREFS)}>Reset preferences</Button>
        <span className="text-2xs text-content-disabled">Retention: {audit.data?.retention ?? "in-memory"}</span>
      </div>
    </div>
  );
}
