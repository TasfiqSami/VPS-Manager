import { cn } from "@/lib/utils";

export interface ChartPoint {
  label: string;
  value: number;
}

function buildPath(points: ChartPoint[], width: number, height: number, padding: number): { line: string; area: string } {
  if (points.length === 0) return { line: "", area: "" };
  const values = points.map((point) => point.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;

  const coords = points.map((point, index) => {
    const x = padding + index * step;
    const y = padding + innerHeight - ((point.value - min) / span) * innerHeight;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const line = `M ${coords.join(" L ")}`;
  const first = coords[0] ?? `${padding},${height - padding}`;
  const last = coords[coords.length - 1] ?? `${width - padding},${height - padding}`;
  const baseline = height - padding;
  const area = `M ${first} L ${coords.join(" L ")} L ${last} L ${width - padding},${baseline} L ${padding},${baseline} Z`;
  return { line, area };
}

export function AreaSparkline({
  points,
  className,
  tone = "primary",
  height = 56,
  width = 220,
  showGrid = false,
}: {
  points: ChartPoint[];
  className?: string;
  tone?: "primary" | "success" | "warning" | "danger" | "info";
  height?: number;
  width?: number;
  showGrid?: boolean;
}) {
  const padding = 4;
  const { line, area } = buildPath(points, width, height, padding);
  const gradientId = `spark-${tone}-${points.length}-${Math.round(width)}`;
  const stroke =
    tone === "primary"
      ? "hsl(var(--primary))"
      : tone === "success"
        ? "hsl(var(--success))"
        : tone === "warning"
          ? "hsl(var(--warning))"
          : tone === "danger"
            ? "hsl(var(--danger))"
            : "hsl(var(--info))";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-14 w-full", className)}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showGrid
        ? [0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={ratio}
              x1={padding}
              x2={width - padding}
              y1={height * ratio}
              y2={height * ratio}
              stroke="hsl(var(--border))"
              strokeWidth="1"
              strokeDasharray="3 5"
            />
          ))
        : null}
      {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
      {line ? <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /> : null}
    </svg>
  );
}

export function BarSeries({
  points,
  className,
  height = 64,
}: {
  points: ChartPoint[];
  className?: string;
  height?: number;
}) {
  const max = Math.max(...points.map((point) => point.value), 1);
  return (
    <div className={cn("flex items-end gap-1", className)} style={{ height }}>
      {points.map((point, index) => {
        const percent = Math.max(2, Math.round((point.value / max) * 100));
        return (
          <div key={`${point.label}-${index}`} className="group relative flex-1">
            <div
              className="w-full rounded-t-[3px] bg-primary/70 transition-all duration-500 group-hover:bg-primary"
              style={{ height: `${percent}%` }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-control border border-border bg-surface-overlay px-1.5 py-0.5 text-2xs text-content group-hover:block">
              {point.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
