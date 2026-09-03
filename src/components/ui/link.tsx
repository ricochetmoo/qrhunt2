import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export type ScoutsLinkVariant = "primary" | "secondary" | "success" | "info" | "warning" | "danger" | "muted" | "text";

const VARIANT_CLASSES: Record<ScoutsLinkVariant, string> = {
  primary: "text-scouts-link",
  secondary: "text-scouts-secondary",
  success: "text-scouts-green-dark",
  info: "text-scouts-blue-dark",
  warning: "text-scouts-orange-dark",
  danger: "text-scouts-red-dark",
  muted: "text-scouts-muted",
  text: "text-scouts-text",
};

export function ScoutsLink({
  variant = "primary",
  underline = true,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: ScoutsLinkVariant; underline?: boolean }) {
  return (
    <Link
      className={cn(
        "font-bold hover:text-scouts-link-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-scouts-focus",
        VARIANT_CLASSES[variant],
        underline && "underline decoration-2 underline-offset-2",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
