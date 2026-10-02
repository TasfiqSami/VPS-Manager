"use client";

import { X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="relative flex min-h-dvh">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="absolute inset-x-0 top-[-220px] h-[520px] opacity-70 blur-3xl">
          <div className="absolute left-[8%] h-[420px] w-[520px] rounded-full bg-primary/20" />
          <div className="absolute right-[4%] top-10 h-[380px] w-[460px] rounded-full bg-accent/15" />
        </div>
        <div className="orbit-grid absolute inset-0 opacity-40" />
      </div>

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-border bg-surface/60 backdrop-blur-xl lg:block">
        <Sidebar />
      </aside>

      {navOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-canvas/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-border bg-surface shadow-e4 animate-slide-up">
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              className="absolute right-3 top-3 rounded-control p-1.5 text-content-subtle hover:bg-surface-muted hover:text-content"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            <Sidebar onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Topbar onOpenNav={() => setNavOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:py-8">{children}</main>
        <footer className="border-t border-border px-4 py-4 text-center text-2xs text-content-disabled sm:px-6">
          Vantage · Orbit console · Virtualizor end-user API
        </footer>
      </div>
    </div>
  );
}
