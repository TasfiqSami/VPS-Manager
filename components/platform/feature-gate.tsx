"use client";

import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { CapabilityNotice, capabilityState } from "@/components/ui/capability-notice";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { useCapabilities } from "@/hooks/use-virtualizor";

export interface CapabilitySpec {
  act: string;
  label: string;
  detail?: string;
}

/**
 * Renders `children` only when every required capability is supported.
 * Otherwise it presents a truthful notice and an optional capability matrix,
 * never fabricated controls.
 */
export function FeatureGate({
  acts,
  feature,
  children,
  matrix,
  loadingFallback,
}: {
  acts: string[];
  feature: string;
  children: ReactNode;
  matrix?: CapabilitySpec[];
  loadingFallback?: ReactNode;
}) {
  const { data, isLoading } = useCapabilities();

  if (isLoading) {
    return <>{loadingFallback ?? <Skeleton className="h-28 w-full rounded-card" />}</>;
  }

  const states = acts.map((act) => capabilityState(data, act));
  const allSupported = states.every((state) => state === "supported");

  if (allSupported) {
    return (
      <div className="space-y-5">
        {children}
        {matrix ? <CapabilityMatrix specs={matrix} /> : null}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CapabilityNotice report={data} act={acts[0] ?? ""} feature={feature} />
      {matrix ? <CapabilityMatrix specs={matrix} /> : null}
    </div>
  );
}

const STATE_META = {
  supported: { tone: "success" as const, label: "Supported", icon: CheckCircle2 },
  unsupported: { tone: "neutral" as const, label: "Not supported", icon: XCircle },
  unknown: { tone: "warning" as const, label: "Unknown", icon: HelpCircle },
};

export function CapabilityMatrix({ specs }: { specs: CapabilitySpec[] }) {
  const { data } = useCapabilities();

  return (
    <Panel>
      <PanelHeader
        title="Backend capability matrix"
        description="Detected from read-only probes against your Virtualizor panel."
      />
      <PanelBody className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
        {specs.map((spec) => {
          const state = capabilityState(data, spec.act);
          const meta = STATE_META[state];
          const Icon = meta.icon;
          return (
            <div key={spec.act} className="flex items-center justify-between gap-4 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-content">{spec.label}</p>
                {spec.detail ? <p className="truncate text-2xs text-content-subtle">{spec.detail}</p> : null}
              </div>
              <Badge tone={meta.tone} className="shrink-0">
                <Icon className="mr-1 h-3 w-3" />
                {meta.label}
              </Badge>
            </div>
          );
        })}
      </PanelBody>
    </Panel>
  );
}
