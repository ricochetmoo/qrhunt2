import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type BoxVariant = "default" | "success" | "warning" | "navy" | "yellow" | "cubs";
export type BoxSize = "xs" | "sm" | "md" | "lg" | "xl";

const VARIANT_CLASSES: Record<BoxVariant, string> = {
  default: "bg-scouts-grey-light text-black",
  success: "bg-scouts-green text-black",
  warning: "bg-scouts-orange text-black",
  navy: "bg-scouts-navy text-white",
  yellow: "bg-scouts-yellow text-black",
  cubs: "bg-scouts-green text-black",
};

const SIZE_CLASSES: Record<BoxSize, string> = {
  xs: "p-2 text-sm",
  sm: "p-3 text-sm",
  md: "p-5 text-base",
  lg: "p-7 text-xl",
  xl: "p-8 text-2xl",
};

export interface BoxProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BoxVariant;
  size?: BoxSize;
}

export function Box({ variant = "default", size = "md", className, ...props }: BoxProps) {
  return <div className={cn(VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)} {...props} />;
}
