"use client";

import { LayoutGrid, RotateCcw, ArrowUp, ArrowDown, Maximize2, Minimize2, Eye, EyeOff } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocalPreference } from "@/hooks/use-local-preference";
import { cn } from "@/lib/utils";

export interface DashboardWidget {
  id: string;
  label: string;
  node: ReactNode;
  defaultWide?: boolean;
}

interface LayoutState {
  order: string[];
  hidden: string[];
  wide: string[];
}

export function WidgetBoard({ widgets }: { widgets: DashboardWidget[] }) {
  const defaults = useMemo<LayoutState>(
    () => ({
      order: widgets.map((widget) => widget.id),
      hidden: [],
      wide: widgets.filter((widget) => widget.defaultWide).map((widget) => widget.id),
    }),
    [widgets],
  );

  const [stored, setStored] = useLocalPreference<LayoutState>("vantage.dashboard.layout", defaults);

  // Reconcile a stored layout against the current widget set so newly added
  // widgets always appear and removed ones do not linger.
  const layout = useMemo<LayoutState>(() => {
    const known = new Set(widgets.map((widget) => widget.id));
    const order = [
      ...stored.order.filter((id) => known.has(id)),
      ...widgets.map((widget) => widget.id).filter((id) => !stored.order.includes(id)),
    ];
    return {
      order,
      hidden: stored.hidden.filter((id) => known.has(id)),
      wide: stored.wide.filter((id) => known.has(id)),
    };
  }, [stored, widgets]);

  function move(id: string, direction: -1 | 1) {
    const order = [...layout.order];
    const index = order.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target] as string, order[index] as string];
    setStored({ ...layout, order });
  }

  function toggleHidden(id: string) {
    const hidden = layout.hidden.includes(id)
      ? layout.hidden.filter((entry) => entry !== id)
      : [...layout.hidden, id];
    setStored({ ...layout, hidden });
  }

  function toggleWide(id: string) {
    const wide = layout.wide.includes(id) ? layout.wide.filter((entry) => entry !== id) : [...layout.wide, id];
    setStored({ ...layout, wide });
  }

  const byId = new Map(widgets.map((widget) => [widget.id, widget]));
  const visible = layout.order
    .map((id) => byId.get(id))
    .filter((widget): widget is DashboardWidget => Boolean(widget) && !layout.hidden.includes(widget?.id ?? ""));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-content-disabled">Dashboard</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <LayoutGrid className="h-3.5 w-3.5" />
              Customize
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Arrange, resize &amp; hide widgets</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {layout.order.map((id, index) => {
              const widget = byId.get(id);
              if (!widget) return null;
              const isHidden = layout.hidden.includes(id);
              const isWide = layout.wide.includes(id);
              return (
                <div key={id} className="flex items-center gap-1 px-1.5 py-1">
                  <span className={cn("flex-1 truncate text-sm", isHidden ? "text-content-disabled" : "text-content")}>
                    {widget.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${widget.label} up`}
                    disabled={index === 0}
                    onClick={() => move(id, -1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${widget.label} down`}
                    disabled={index === layout.order.length - 1}
                    onClick={() => move(id, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={isWide ? `Make ${widget.label} smaller` : `Make ${widget.label} wider`}
                    onClick={() => toggleWide(id)}
                  >
                    {isWide ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={isHidden ? `Show ${widget.label}` : `Hide ${widget.label}`}
                    onClick={() => toggleHidden(id)}
                  >
                    {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setStored(defaults)}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset layout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {visible.map((widget) => (
          <div key={widget.id} className={cn(layout.wide.includes(widget.id) && "xl:col-span-2")}>
            {widget.node}
          </div>
        ))}
      </div>
    </div>
  );
}
