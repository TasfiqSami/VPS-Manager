import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-control border border-border bg-surface-muted/50 px-3 py-2 text-sm text-content",
        "placeholder:text-content-disabled",
        "transition-colors focus-visible:border-primary/60 focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full rounded-control border border-border bg-surface-muted/50 px-3 py-2 text-sm text-content",
        "placeholder:text-content-disabled orbit-scroll",
        "transition-colors focus-visible:border-primary/60 focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-10 w-full appearance-none rounded-control border border-border bg-surface-muted/50 px-3 pr-9 text-sm text-content",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2394a3b8%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat",
        "transition-colors focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring/40",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="text-xs text-danger">{children}</p>;
}
