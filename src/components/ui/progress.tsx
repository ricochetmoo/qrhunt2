import { cn } from "@/lib/cn";

export type ProgressVariant = "primary" | "success" | "info" | "warning" | "danger" | "navy";

const FILL_CLASSES: Record<ProgressVariant, string> = {
  primary: "bg-scouts-primary",
  success: "bg-scouts-green",
  info: "bg-scouts-blue",
  warning: "bg-scouts-orange",
  danger: "bg-scouts-red",
  navy: "bg-scouts-navy",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  variant = "primary",
  size = "md",
  labelPosition = "above",
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  variant?: ProgressVariant;
  size?: "sm" | "md" | "lg";
  labelPosition?: "above" | "inside" | "below";
  className?: string;
}) {
  const safeMax = Math.max(max, 1);
  const percentage = Math.min(100, Math.max(0, (value / safeMax) * 100));
  const visibleLabel = label ?? `${Math.round(percentage)}%`;

  return (
    <div className={cn("w-full", className)}>
      {labelPosition === "above" ? <p className="mb-1 text-sm font-bold text-scouts-text">{visibleLabel}</p> : null}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.min(value, safeMax)}
        aria-label={label ?? "Progress"}
        className={cn(
          "relative w-full overflow-hidden bg-scouts-grey-light",
          size === "sm" && "h-2",
          size === "md" && "h-5",
          size === "lg" && "h-8",
        )}
      >
        <div
          className={cn("h-full transition-[width] duration-500", FILL_CLASSES[variant])}
          style={{ width: `${percentage}%` }}
        />
        {labelPosition === "inside" ? (
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-scouts-text mix-blend-multiply">
            {visibleLabel}
          </span>
        ) : null}
      </div>
      {labelPosition === "below" ? <p className="mt-1 text-sm text-scouts-muted">{visibleLabel}</p> : null}
    </div>
  );
}
