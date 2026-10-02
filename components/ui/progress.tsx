import { cn } from "@/lib/utils";

export type MeterTone = "primary" | "success" | "warning" | "danger" | "info";

const TONE_FILL: Record<MeterTone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

export function Meter({
  value,
  tone = "primary",
  className,
  indeterminate,
}: {
  value: number | undefined;
  tone?: MeterTone;
  className?: string;
  indeterminate?: boolean;
}) {
  const safe = value === undefined ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-surface-muted", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {indeterminate ? (
        <div className={cn("absolute inset-y-0 w-1/3 animate-indeterminate rounded-full", TONE_FILL[tone])} />
      ) : (
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", TONE_FILL[tone])}
          style={{ width: `${safe}%` }}
        />
      )}
    </div>
  );
}

export function RadialGauge({
  value,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  tone = "primary",
}: {
  value: number | undefined;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  tone?: MeterTone;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safe = value === undefined ? 0 : Math.min(100, Math.max(0, value));
  const dash = (safe / 100) * circumference;

  const strokeColor: Record<MeterTone, string> = {
    primary: "hsl(var(--primary))",
    success: "hsl(var(--success))",
    warning: "hsl(var(--warning))",
    danger: "hsl(var(--danger))",
    info: "hsl(var(--info))",
  };

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--surface-muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor[tone]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="tabular text-xl font-semibold text-content">
          {value === undefined ? "Unavailable" : label ?? `${value.toFixed(0)}%`}
        </span>
        {sublabel ? <span className="text-2xs uppercase tracking-wide text-content-subtle">{sublabel}</span> : null}
      </div>
    </div>
  );
}
