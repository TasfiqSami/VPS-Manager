import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-30%] h-[560px] w-[720px] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-[6%] bottom-[-20%] h-[420px] w-[520px] rounded-full bg-accent/15 blur-3xl" />
        <div className="orbit-grid absolute inset-0 opacity-40" />
      </div>

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-surface bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-e3">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 15.5 12 4l8 11.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7.5 15.5h9" strokeLinecap="round" />
              <circle cx="12" cy="19.5" r="1.4" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-content">Welcome back to Vantage</h1>
            <p className="text-sm text-content-muted">Sign in to operate your Virtualizor server.</p>
          </div>
        </div>

        <div className="orbit-panel p-6 shadow-e3">
          <Suspense fallback={<Skeleton className="h-24 w-full" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-2xs text-content-disabled">
          Virtualizor credentials remain server-side and are never sent to this browser.
        </p>
      </div>
    </main>
  );
}
