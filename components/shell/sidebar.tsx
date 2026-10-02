"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_GROUP_ORDER, NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-6 p-4" aria-label="Primary">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-3 px-2 py-1">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-card bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-e2">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M4 15.5 12 4l8 11.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7.5 15.5h9" strokeLinecap="round" />
            <circle cx="12" cy="19.5" r="1.4" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold tracking-tight text-content">Vantage</span>
          <span className="block text-2xs uppercase tracking-[0.18em] text-content-subtle">Orbit console</span>
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto orbit-scroll">
        {NAV_GROUP_ORDER.map((group) => {
          const items = NAV_ITEMS.filter((item) => item.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="space-y-1">
              <p className="px-3 text-2xs font-semibold uppercase tracking-[0.16em] text-content-disabled">
                {group}
              </p>
              {items.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-control px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-surface-muted text-content shadow-e1"
                        : "text-content-muted hover:bg-surface-muted/60 hover:text-content",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-primary" : "text-content-subtle group-hover:text-content",
                      )}
                    />
                    <span className="truncate font-medium">{item.label}</span>
                    {active ? <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="rounded-card border border-border bg-surface-muted/40 p-3">
        <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-content-subtle">Security</p>
        <p className="mt-1 text-xs leading-relaxed text-content-muted">
          Credentials stay on the server. Vantage never exposes them to the browser.
        </p>
      </div>
    </nav>
  );
}
