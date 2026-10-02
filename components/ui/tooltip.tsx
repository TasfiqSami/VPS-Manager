"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentProps, ReactNode } from "react";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={[
          "z-50 max-w-xs rounded-control border border-border bg-surface-overlay px-2.5 py-1.5",
          "text-xs text-content shadow-e3 data-[state=delayed-open]:animate-scale-in",
          className ?? "",
        ].join(" ")}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

export function InfoTip({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help items-center text-content-disabled hover:text-content-subtle">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
