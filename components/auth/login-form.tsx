"use client";

import { ArrowRight, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLogin, useSession } from "@/hooks/use-session";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const login = useLogin();
  const [password, setPassword] = useState("");

  const nextPath = searchParams.get("next");
  const redirectTo = nextPath && nextPath.startsWith("/") ? nextPath : "/";
  const mode = session.data?.mode;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) return;
    login.mutate(password, {
      onSuccess: () => router.replace(redirectTo),
    });
  }

  if (mode === "blocked") {
    return (
      <div className="flex items-start gap-3 rounded-card border border-warning/30 bg-warning-soft px-4 py-3 text-warning">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold">Authentication is not configured</p>
          <p className="text-xs text-content-muted">
            {session.data?.reason ??
              "Set DASHBOARD_PASSWORD and AUTH_SECRET in the server environment, then reload."}
          </p>
        </div>
      </div>
    );
  }

  if (mode === "dev-open") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-content-muted">
          Dashboard authentication is disabled for local development. You can continue directly.
        </p>
        <Button variant="primary" className="w-full" onClick={() => router.replace(redirectTo)}>
          Continue
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <Label htmlFor="password">Dashboard password</Label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-disabled" />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your dashboard password"
            className="pl-9"
          />
        </div>
      </div>
      <Button type="submit" variant="primary" className="w-full" disabled={login.isPending || !password}>
        {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {login.isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
