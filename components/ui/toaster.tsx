"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "orbit-panel border border-border bg-surface-overlay text-content shadow-e3 rounded-card px-4 py-3 text-sm",
          description: "text-content-muted",
          actionButton: "bg-primary text-primary-foreground rounded-control",
          cancelButton: "bg-surface-muted text-content-muted rounded-control",
        },
      }}
    />
  );
}
