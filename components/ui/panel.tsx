import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("orbit-panel orbit-hairline overflow-hidden", className)} {...props} />;
}

export function PanelHeader({
  title,
  description,
  action,
  className,
  icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <header className={cn("flex items-start justify-between gap-4 border-b border-border px-5 py-4", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <span className="mt-0.5 text-primary">{icon}</span> : null}
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold tracking-tight text-content">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-content-subtle">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function PanelBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function PanelFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("border-t border-border px-5 py-3", className)} {...props} />;
}
