"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch, isApiError } from "@/lib/api-client";

export interface SessionInfo {
  authenticated: boolean;
  mode: "enabled" | "dev-open" | "blocked";
  reason?: string;
  sessionSeconds: number;
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => apiFetch<SessionInfo>("/api/auth/session"),
    staleTime: 30_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (password: string) => apiFetch<{ authenticated: boolean }>("/api/auth/login", { method: "POST", body: { password } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success("Signed in.");
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : "Unable to sign in.");
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ authenticated: boolean }>("/api/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      toast.success("Signed out.");
    },
    onError: () => toast.error("Unable to sign out."),
  });
}
