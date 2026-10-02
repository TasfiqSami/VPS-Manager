"use client";

import { Command } from "cmdk";
import { ArrowRight, LogOut, Moon, Search, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";

import { useLogout } from "@/hooks/use-session";
import { NAV_ITEMS } from "@/lib/navigation";

export const OPEN_COMMAND_PALETTE_EVENT = "vantage:open-command-palette";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const logout = useLogout();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    function onOpenRequest() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenRequest);
    };
  }, []);

  const run = useCallback((action: () => void) => {
    setOpen(false);
    action();
  }, []);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className="fixed left-1/2 top-[12%] z-[60] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-surface border border-border bg-surface-overlay shadow-e4"
      shouldFilter
    >
      <div className="flex items-center gap-2 border-b border-border px-4">
        <Search className="h-4 w-4 text-content-subtle" />
        <Command.Input
          autoFocus
          placeholder="Search pages and actions…"
          className="h-12 w-full bg-transparent text-sm text-content outline-none placeholder:text-content-disabled"
        />
        <kbd className="rounded-control border border-border bg-surface-muted px-1.5 py-0.5 text-2xs text-content-subtle">
          Esc
        </kbd>
      </div>
      <Command.List className="max-h-[22rem] overflow-y-auto orbit-scroll p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-content-subtle">
          No matching results.
        </Command.Empty>
        <Command.Group
          heading="Navigate"
          className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-content-disabled"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Command.Item
                key={item.href}
                value={`${item.label} ${item.description}`}
                onSelect={() => run(() => router.push(item.href))}
                className="flex cursor-pointer items-center gap-3 rounded-control px-2.5 py-2 text-sm text-content-muted data-[selected=true]:bg-surface-muted data-[selected=true]:text-content"
              >
                <Icon className="h-4 w-4 text-content-subtle" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{item.label}</span>
                  <span className="truncate text-2xs text-content-subtle">{item.description}</span>
                </span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 text-content-disabled" />
              </Command.Item>
            );
          })}
        </Command.Group>
        <Command.Group
          heading="Appearance"
          className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-content-disabled"
        >
          <Command.Item
            value="switch to dark theme"
            onSelect={() => run(() => setTheme("dark"))}
            className="flex cursor-pointer items-center gap-3 rounded-control px-2.5 py-2 text-sm text-content-muted data-[selected=true]:bg-surface-muted data-[selected=true]:text-content"
          >
            <Moon className="h-4 w-4 text-content-subtle" />
            Switch to dark theme
            {resolvedTheme === "dark" ? <span className="ml-auto text-2xs text-primary">Active</span> : null}
          </Command.Item>
          <Command.Item
            value="switch to light theme"
            onSelect={() => run(() => setTheme("light"))}
            className="flex cursor-pointer items-center gap-3 rounded-control px-2.5 py-2 text-sm text-content-muted data-[selected=true]:bg-surface-muted data-[selected=true]:text-content"
          >
            <Sun className="h-4 w-4 text-content-subtle" />
            Switch to light theme
            {resolvedTheme === "light" ? <span className="ml-auto text-2xs text-primary">Active</span> : null}
          </Command.Item>
        </Command.Group>
        <Command.Group
          heading="Session"
          className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-content-disabled"
        >
          <Command.Item
            value="sign out"
            onSelect={() =>
              run(() => {
                logout.mutate(undefined, { onSuccess: () => router.push("/login") });
              })
            }
            className="flex cursor-pointer items-center gap-3 rounded-control px-2.5 py-2 text-sm text-content-muted data-[selected=true]:bg-surface-muted data-[selected=true]:text-content"
          >
            <LogOut className="h-4 w-4 text-content-subtle" />
            Sign out
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
