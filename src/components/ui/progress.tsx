import { cn } from "@/lib/cn";

export type ProgressVariant =
  | "primary"
  | "secondary"
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "purple"
  | "teal"
  | "red"
  | "navy"
  | "blue"
  | "forest"
  | "green"
  | "orange"
  | "yellow"
  | "pink"
  | "grey"
  | "black"
  | "white"
  | "squirrels"
  | "beavers"
  | "cubs"
  | "scouts"
  | "explorers"
  | "network"
  | "adult"
  | "dev";

const VARIANT_CLASSES: Record<ProgressVariant, string> = {
  primary: "scouts-progress-bar--primary",
  secondary: "scouts-progress-bar--secondary",
  success: "scouts-progress-bar--success",
  info: "scouts-progress-bar--info",
  warning: "scouts-progress-bar--warning",
  danger: "scouts-progress-bar--danger",
  purple: "scouts-progress-bar--purple",
  teal: "scouts-progress-bar--teal",
  red: "scouts-progress-bar--red",
  navy: "scouts-progress-bar--navy",
  blue: "scouts-progress-bar--blue",
  forest: "scouts-progress-bar--forest",
  green: "scouts-progress-bar--green",
  orange: "scouts-progress-bar--orange",
  yellow: "scouts-progress-bar--yellow",
  pink: "scouts-progress-bar--pink",
  grey: "scouts-progress-bar--grey",
  black: "scouts-progress-bar--black",
  white: "scouts-progress-bar--white",
  squirrels: "scouts-progress-bar--squirrels",
  beavers: "scouts-progress-bar--beavers",
  cubs: "scouts-progress-bar--cubs",
  scouts: "scouts-progress-bar--scouts",
  explorers: "scouts-progress-bar--explorers",
  network: "scouts-progress-bar--network",
  adult: "scouts-progress-bar--adult",
  dev: "scouts-progress-bar--dev",
};

const SIZE_CLASSES = {
  xs: "scouts-progress-bar--xs",
  sm: "scouts-progress-bar--sm",
  md: "",
  normal: "",
  lg: "scouts-progress-bar--lg",
  xl: "scouts-progress-bar--xl",
} as const;

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
  size?: keyof typeof SIZE_CLASSES;
  labelPosition?: "above" | "inside" | "below";
  className?: string;
}) {
  const safeMax = Math.max(max, 1);
  const safeValue = Math.min(safeMax, Math.max(0, value));
  const percentage = (safeValue / safeMax) * 100;
  const visibleLabel = label ?? `${Math.round(percentage)}%`;

  return (
    <div
      className={cn(
        "scouts-progress-bar",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        labelPosition === "inside" && "scouts-progress-bar--label-inside",
        className,
      )}
    >
      {labelPosition === "above" ? (
        <p className="scouts-hint scouts-progress-bar__hint">{visibleLabel}</p>
      ) : null}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={visibleLabel}
        className="scouts-progress-bar__track"
      >
        <div className="scouts-progress-bar__fill" style={{ width: `${percentage}%` }}>
          {labelPosition === "inside" ? (
            <span className="scouts-progress-bar__value">{visibleLabel}</span>
          ) : null}
        </div>
      </div>
      {labelPosition === "below" ? (
        <p className="scouts-hint scouts-progress-bar__hint scouts-progress-bar__hint--below">
          {visibleLabel}
        </p>
      ) : null}
    </div>
  );
}
