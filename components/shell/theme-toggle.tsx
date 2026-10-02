"use client";

import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-control border border-border bg-surface-muted/60 p-0.5"
      role="group"
      aria-label="Color theme"
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = mounted && theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={`${option.label} theme`}
            aria-pressed={active}
            onClick={() => setTheme(option.value)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-[0.45rem] text-content-subtle transition-colors",
              active ? "bg-surface text-content shadow-e1" : "hover:text-content",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="sr-only">{`${option.label} theme`}</span>
          </button>
        );
      })}
      <span className="sr-only">{mounted ? `Current theme: ${resolvedTheme ?? theme}` : ""}</span>
    </div>
  );
}
