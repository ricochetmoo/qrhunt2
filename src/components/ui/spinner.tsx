import { cn } from "@/lib/cn";

export function Spinner({
  label = "Loading",
  size = "md",
  inline = false,
  className,
}: {
  label?: string;
  size?: "sm" | "md" | "lg";
  inline?: boolean;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center gap-2", !inline && "flex-col", className)}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block animate-spin rounded-full border-4 border-scouts-grey border-t-scouts-primary",
          size === "sm" && "h-5 w-5 border-2",
          size === "md" && "h-8 w-8",
          size === "lg" && "h-12 w-12",
        )}
      />
      {label ? <span className="text-sm font-bold text-scouts-text">{label}</span> : null}
    </span>
  );
}
