"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex items-center gap-1 rounded-control border border-border bg-surface-muted/60 p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[0.5rem] px-3 py-1.5 text-xs font-medium text-content-muted transition-all",
        "hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring",
        "data-[state=active]:bg-surface data-[state=active]:text-content data-[state=active]:shadow-e1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("mt-5 focus-visible:outline-none data-[state=active]:animate-fade-in", className)}
      {...props}
    />
  );
}
