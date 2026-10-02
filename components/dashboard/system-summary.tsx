"use client";

import { Server } from "lucide-react";

import { KeyValueSection, ValueOrUnavailable } from "@/components/ui/key-value";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useBackups } from "@/hooks/use-virtualizor";
import { formatDateTime } from "@/lib/utils";
import { rawString } from "@/lib/virtualizor/raw";
import type { VpsInfo } from "@/lib/virtualizor/types";

function Field({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="text-xs text-content-subtle">{label}</span>
      <ValueOrUnavailable value={value} />
    </div>
  );
}

export function SystemSummary({ vps, vpsId }: { vps: VpsInfo | undefined; vpsId: string }) {
  const backups = useBackups(vpsId);
  const lastBackup = backups.data?.[0];

  if (!vps) {
    return (
      <Panel>
        <PanelHeader title="System & infrastructure" icon={<Server className="h-4 w-4" />} />
        <PanelBody>
          <Skeleton className="h-32 w-full" />
        </PanelBody>
      </Panel>
    );
  }

  const raw = vps.raw;

  return (
    <Panel>
      <PanelHeader
        title="System & infrastructure"
        description="Static identity and placement reported by the panel"
        icon={<Server className="h-4 w-4" />}
      />
      <PanelBody className="space-y-5">
        <KeyValueSection title="Operating system" columns={2}>
          <Field label="OS" value={vps.os} />
          <Field label="Virtualization" value={vps.virtualization} />
          <Field label="Kernel" value={rawString(raw, ["kernel", "kernel_version", "os_kernel"])} />
          <Field label="Architecture" value={rawString(raw, ["arch", "architecture", "cpu_arch"])} />
        </KeyValueSection>

        <KeyValueSection title="Placement" columns={2}>
          <Field label="Hostname" value={vps.hostname} />
          <Field label="Location" value={vps.location ?? rawString(raw, ["location", "region", "datacenter", "dc"])} />
          <Field label="Node / server" value={rawString(raw, ["server", "node", "hostname_node", "servername"])} />
          <Field label="Region" value={rawString(raw, ["region", "country"])} />
        </KeyValueSection>

        <KeyValueSection title="Lifecycle" columns={2}>
          <Field label="Created" value={vps.createdAt ? formatDateTime(vps.createdAt) : undefined} />
          <Field
            label="Last reboot"
            value={
              rawString(raw, ["last_reboot", "reboot_time", "uptime_since"])
                ? formatDateTime(rawString(raw, ["last_reboot", "reboot_time", "uptime_since"]))
                : undefined
            }
          />
          <Field label="Last backup" value={lastBackup?.createdAt ? formatDateTime(lastBackup.createdAt) : undefined} />
          <Field label="Last snapshot" value={undefined} />
        </KeyValueSection>
      </PanelBody>
    </Panel>
  );
}
