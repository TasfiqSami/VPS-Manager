import { Slot } from "@radix-ui/react-slot";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-e1 hover:brightness-110 active:brightness-95 border border-primary/40",
  secondary:
    "bg-surface-raised text-content border border-border hover:border-border-strong hover:bg-surface-muted shadow-e1",
  outline: "border border-border-strong text-content hover:bg-surface-muted",
  ghost: "text-content-muted hover:text-content hover:bg-surface-muted",
  danger: "bg-danger text-danger-foreground border border-danger/40 hover:brightness-110 shadow-e1",
  subtle: "bg-primary-soft text-primary border border-primary/20 hover:border-primary/40",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-control",
  md: "h-10 px-4 text-sm gap-2 rounded-control",
  lg: "h-11 px-5 text-sm gap-2 rounded-control",
  icon: "h-9 w-9 rounded-control justify-center",
};

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export function Button({ className, variant = "secondary", size = "md", asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        "disabled:pointer-events-none disabled:opacity-45",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
