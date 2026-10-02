"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch, isApiError } from "@/lib/api-client";
import type {
  ApiKeyInfo,
  AuditResponse,
  BackupInfo,
  CapabilityReport,
  DnsRecord,
  DnsZone,
  FirewallPlan,
  HealthReport,
  IpInfo,
  IsoInfo,
  MonitorSnapshot,
  ProcessInfo,
  ReinstallOption,
  ReverseDnsRecord,
  ServiceInfo,
  SshKeyInfo,
  StatsBundle,
  TaskInfo,
  VncInfo,
  VolumeInfo,
  VpsInfo,
  VpsListItem,
} from "@/lib/virtualizor/types";

/* ------------------------------------------------------------------ */
/* Query helpers                                                       */
/* ------------------------------------------------------------------ */

type QueryOptions<T> = Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, "queryKey" | "queryFn" | "enabled">;

function useVpsQuery<T>(
  key: string,
  vpsId: string | null,
  path: string,
  options?: QueryOptions<T>,
  extra?: { refetchInterval?: number },
) {
  return useQuery<T, Error, T, readonly unknown[]>({
    queryKey: ["vps", vpsId, key],
    queryFn: () => apiFetch<T>(path),
    enabled: Boolean(vpsId),
    ...(extra?.refetchInterval ? { refetchInterval: extra.refetchInterval } : {}),
    ...options,
  });
}

export function useVpsList() {
  return useQuery({
    queryKey: ["vps-list"],
    queryFn: () => apiFetch<VpsListItem[]>("/api/vps"),
    staleTime: 30_000,
  });
}

export function useVpsInfo(vpsId: string | null) {
  return useVpsQuery<VpsInfo>("info", vpsId, `/api/vps/${vpsId}`, { refetchInterval: 15_000 }, { refetchInterval: 15_000 });
}

export function useStats(vpsId: string | null) {
  return useVpsQuery<StatsBundle>("stats", vpsId, `/api/vps/${vpsId}/stats`, undefined, { refetchInterval: 10_000 });
}

export function useMonitor(vpsId: string | null) {
  return useVpsQuery<MonitorSnapshot>("monitor", vpsId, `/api/vps/${vpsId}/monitor`, undefined, { refetchInterval: 5_000 });
}

export function useMonitorHistory(vpsId: string | null) {
  return useVpsQuery<MonitorSnapshot[]>("monitor-history", vpsId, `/api/vps/${vpsId}/monitor/history`);
}

export function useVnc(vpsId: string | null) {
  return useVpsQuery<VncInfo>("vnc", vpsId, `/api/vps/${vpsId}/vnc`, { retry: false });
}

export function useReinstallOptions(vpsId: string | null) {
  return useVpsQuery<ReinstallOption[]>("reinstall-options", vpsId, `/api/vps/${vpsId}/reinstall`);
}

export function useFirewallPlans(vpsId: string | null) {
  return useVpsQuery<FirewallPlan[]>("firewall", vpsId, `/api/vps/${vpsId}/firewall`);
}

export function useBackups(vpsId: string | null) {
  return useVpsQuery<BackupInfo[]>("backups", vpsId, `/api/vps/${vpsId}/backups`);
}

export function useIsos(vpsId: string | null) {
  return useVpsQuery<IsoInfo[]>("isos", vpsId, `/api/vps/${vpsId}/isos`);
}

export function useServices(vpsId: string | null) {
  return useVpsQuery<ServiceInfo[]>("services", vpsId, `/api/vps/${vpsId}/services`, undefined, { refetchInterval: 15_000 });
}

export function useProcesses(vpsId: string | null) {
  return useVpsQuery<ProcessInfo[]>("processes", vpsId, `/api/vps/${vpsId}/processes`, undefined, { refetchInterval: 15_000 });
}

export function useTasks(vpsId: string | null) {
  return useVpsQuery<TaskInfo[]>("tasks", vpsId, `/api/vps/${vpsId}/tasks`, undefined, { refetchInterval: 10_000 });
}

export function useSshKeys() {
  return useQuery({ queryKey: ["ssh-keys"], queryFn: () => apiFetch<SshKeyInfo[]>("/api/ssh-keys") });
}

export function useVolumes() {
  return useQuery({ queryKey: ["volumes"], queryFn: () => apiFetch<VolumeInfo[]>("/api/volumes") });
}

export function useReverseDns() {
  return useQuery({ queryKey: ["reverse-dns"], queryFn: () => apiFetch<ReverseDnsRecord[]>("/api/reverse-dns") });
}

export function useDnsZones() {
  return useQuery({ queryKey: ["dns-zones"], queryFn: () => apiFetch<DnsZone[]>("/api/dns") });
}

export function useZoneRecords(zoneId: string | null) {
  return useQuery({
    queryKey: ["dns-records", zoneId],
    queryFn: () => apiFetch<DnsRecord[]>(`/api/dns/${zoneId}/records`),
    enabled: Boolean(zoneId),
  });
}

export function useApiKeys() {
  return useQuery({ queryKey: ["api-keys"], queryFn: () => apiFetch<ApiKeyInfo[]>("/api/api-keys") });
}

export function useCapabilities() {
  return useQuery({
    queryKey: ["capabilities"],
    queryFn: () => apiFetch<CapabilityReport>("/api/capabilities"),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<HealthReport>("/api/health"),
    refetchInterval: 60_000,
  });
}

export function useVpsIps(vpsId: string | null) {
  return useVpsQuery<IpInfo[]>("ips", vpsId, `/api/vps/${vpsId}/ips`);
}

export function useAuditLog() {
  return useQuery({
    queryKey: ["audit"],
    queryFn: () => apiFetch<AuditResponse>("/api/audit"),
    refetchInterval: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/* Mutation helper                                                     */
/* ------------------------------------------------------------------ */

export interface ApiMutationOptions<TInput, TResult> {
  mutationFn: (input: TInput) => Promise<TResult>;
  successMessage?: string | ((result: TResult, input: TInput) => string);
  invalidateKeys?: readonly unknown[][];
}

export function useApiMutation<TInput, TResult>(options: ApiMutationOptions<TInput, TResult>) {
  const queryClient = useQueryClient();
  return useMutation<TResult, Error, TInput>({
    mutationFn: options.mutationFn,
    onSuccess: (result, input) => {
      const message =
        typeof options.successMessage === "function"
          ? options.successMessage(result, input)
          : options.successMessage;
      if (message) toast.success(message);
      for (const key of options.invalidateKeys ?? []) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : "The operation could not be completed.");
    },
  });
}

/** Invalidate every cached resource for a VPS after a mutating action. */
export function invalidateVps(queryClient: QueryClient, vpsId: string | null): void {
  if (!vpsId) return;
  void queryClient.invalidateQueries({ queryKey: ["vps", vpsId] });
  void queryClient.invalidateQueries({ queryKey: ["vps-list"] });
}
