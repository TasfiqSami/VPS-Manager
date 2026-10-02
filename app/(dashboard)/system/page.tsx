"use client";

import { Activity, CheckCircle2, CircleSlash, Cpu, RefreshCw, ServerCog, XCircle } from "lucide-react";
import type { ReactElement } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { KeyValue, KeyValueGrid } from "@/components/ui/key-value";
import { PageHeader } from "@/components/ui/page-header";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, InlineAlert } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCapabilities, useHealth } from "@/hooks/use-virtualizor";
import { isApiError } from "@/lib/api-client";
import { formatDateTime, formatDuration, formatRelativeTime } from "@/lib/utils";
import type { HealthCheckResult } from "@/lib/virtualizor/types";

const CHECK_ICON: Record<HealthCheckResult["status"], ReactElement> = {
  pass: <CheckCircle2 className="h-4 w-4 text-success" />,
  fail: <XCircle className="h-4 w-4 text-danger" />,
  skip: <CircleSlash className="h-4 w-4 text-content-disabled" />,
};

function HealthSection() {
  const query = useHealth();
  const report = query.data;

  return (
    <Panel>
      <PanelHeader
        title="Connection health"
        description="Live diagnostics against the Virtualizor endpoint"
        icon={<Activity className="h-4 w-4" />}
        action={
          <Button variant="secondary" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
            Run checks
          </Button>
        }
      />
      <PanelBody className="space-y-5">
        {query.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState
            title="Health report unavailable"
            description={isApiError(query.error) ? query.error.message : undefined}
            onRetry={() => query.refetch()}
          />
        ) : !report ? null : (
          <>
            <InlineAlert
              tone={report.ok ? "success" : report.configured ? "danger" : "warning"}
              title={
                report.ok
                  ? "All checks passed"
                  : report.configured
                    ? "One or more checks failed"
                    : "Virtualizor is not configured"
              }
            >
              {report.error
                ? report.error.message
                : report.ok
                  ? "Vantage can reach the panel and read server data."
                  : "Review the failing checks below before continuing."}
            </InlineAlert>

            <KeyValueGrid>
              <KeyValue label="Configured">{report.configured ? "Yes" : "No"}</KeyValue>
              <KeyValue label="Overall status">{report.ok ? "Healthy" : "Degraded"}</KeyValue>
              <KeyValue label="Endpoint">{report.baseUrl ?? "Unavailable"}</KeyValue>
              <KeyValue label="VPS ID">{report.vpsId ?? "Unavailable"}</KeyValue>
              <KeyValue label="Latency">
                {report.latencyMs !== undefined ? `${report.latencyMs} ms` : "Unavailable"}
              </KeyValue>
              <KeyValue label="Last checked">
                {formatDateTime(report.lastCheckedAt)} ({formatRelativeTime(new Date(report.lastCheckedAt))})
              </KeyValue>
            </KeyValueGrid>

            <ul className="divide-y divide-border rounded-card border border-border">
              {report.checks.map((check) => (
                <li key={check.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5">{CHECK_ICON[check.status]}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-content">{check.label}</p>
                      {check.detail ? <p className="mt-0.5 text-xs text-content-subtle">{check.detail}</p> : null}
                    </div>
                  </div>
                  <span className="tabular shrink-0 text-xs text-content-subtle">
                    {check.latencyMs !== undefined ? formatDuration(check.latencyMs / 1000) : ""}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}

interface CapabilityRow {
  act: string;
  supported: boolean;
}

function CapabilitiesSection() {
  const query = useCapabilities();
  const report = query.data;
  const rows: CapabilityRow[] = Object.entries(report?.supported ?? {}).map(([act, supported]) => ({ act, supported }));
  const enabled = rows.filter((row) => row.supported).length;

  const columns: DataTableColumn<CapabilityRow>[] = [
    {
      key: "act",
      header: "Endpoint",
      render: (row) => <code className="font-mono text-xs text-content">{row.act}</code>,
      sortValue: (row) => row.act,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <Badge tone={row.supported ? "success" : "neutral"}>{row.supported ? "Supported" : "Unavailable"}</Badge>,
      sortValue: (row) => (row.supported ? 1 : 0),
    },
  ];

  return (
    <Panel>
      <PanelHeader
        title="Panel capabilities"
        description="Features detected on this Virtualizor installation"
        icon={<ServerCog className="h-4 w-4" />}
        action={report ? <Badge tone="info">{enabled} available</Badge> : null}
      />
      <PanelBody>
        {query.isError ? (
          <ErrorState
            title="Capabilities unavailable"
            description={isApiError(query.error) ? query.error.message : undefined}
            onRetry={() => query.refetch()}
          />
        ) : rows.length === 0 && !query.isLoading ? (
          <EmptyState
            icon={<Cpu className="h-5 w-5" />}
            title="No capabilities detected"
            description="The panel did not return a capability probe result."
          />
        ) : (
          <DataTable
            data={rows}
            columns={columns}
            getRowId={(row) => row.act}
            loading={query.isLoading}
            searchPlaceholder="Search endpoints…"
            pageSize={12}
            minWidthClassName="min-w-[420px]"
            emptyTitle="No capabilities detected"
          />
        )}
      </PanelBody>
    </Panel>
  );
}

export default function SystemPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="System"
        description="Diagnostics and capability detection for the connected Virtualizor panel."
      />
      <Tabs defaultValue="diagnostics">
        <TabsList className="flex-wrap">
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
        </TabsList>
        <TabsContent value="diagnostics">
          <div className="grid gap-6 xl:grid-cols-2">
            <HealthSection />
            <CapabilitiesSection />
          </div>
        </TabsContent>
        <TabsContent value="capabilities">
          <CapabilitiesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
