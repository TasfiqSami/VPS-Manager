"use client";

import { LogOut, Menu, Search, Settings2, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout, useSession } from "@/hooks/use-session";
import { OPEN_COMMAND_PALETTE_EVENT } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";
import { VpsSwitcher } from "./vps-switcher";

export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const router = useRouter();
  const session = useSession();
  const logout = useLogout();

  const mode = session.data?.mode;
  const authLabel = session.isLoading
    ? "Checking session…"
    : mode === "enabled"
      ? "Secured session"
      : mode === "dev-open"
        ? "Auth disabled (dev)"
        : "Auth not configured";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-canvas/80 px-4 backdrop-blur-xl sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenNav}
        aria-label="Open navigation"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE_EVENT))}
        className="group hidden h-9 flex-1 items-center gap-2 rounded-control border border-border bg-surface-muted/50 px-3 text-sm text-content-subtle transition-colors hover:border-border-strong hover:text-content sm:flex sm:max-w-sm"
      >
        <Search className="h-4 w-4" />
        <span>Search or jump to…</span>
        <kbd className="ml-auto rounded-control border border-border bg-surface px-1.5 py-0.5 text-2xs text-content-subtle">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <VpsSwitcher />
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account menu">
              <UserRound className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{authLabel}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings2 className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                logout.mutate(undefined, { onSuccess: () => router.push("/login") });
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
