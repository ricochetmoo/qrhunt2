import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type BoxVariant =
  | "default"
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
export type BoxSize = "xs" | "sm" | "md" | "normal" | "lg" | "xl";

const VARIANT_CLASSES: Record<BoxVariant, string> = {
  default: "",
  primary: "scouts-box--primary",
  secondary: "scouts-box--secondary",
  success: "scouts-box--success",
  info: "scouts-box--info",
  warning: "scouts-box--warning",
  danger: "scouts-box--danger",
  purple: "scouts-box--purple",
  teal: "scouts-box--teal",
  red: "scouts-box--red",
  navy: "scouts-box--navy",
  blue: "scouts-box--blue",
  forest: "scouts-box--forest",
  green: "scouts-box--green",
  orange: "scouts-box--orange",
  yellow: "scouts-box--yellow",
  pink: "scouts-box--pink",
  grey: "scouts-box--grey",
  black: "scouts-box--black",
  white: "scouts-box--white",
  squirrels: "scouts-box--squirrels",
  beavers: "scouts-box--beavers",
  cubs: "scouts-box--cubs",
  scouts: "scouts-box--scouts",
  explorers: "scouts-box--explorers",
  network: "scouts-box--network",
  adult: "scouts-box--adult",
  dev: "scouts-box--dev",
};

const SIZE_CLASSES: Record<BoxSize, string> = {
  xs: "scouts-box--xs",
  sm: "scouts-box--sm",
  md: "",
  normal: "",
  lg: "scouts-box--lg",
  xl: "scouts-box--xl",
};

export interface BoxProps extends HTMLAttributes<HTMLDivElement> {
  variant?: BoxVariant;
  size?: BoxSize;
}

export function Box({ variant = "default", size = "md", className, ...props }: BoxProps) {
  return <div className={cn("scouts-box", VARIANT_CLASSES[variant], SIZE_CLASSES[size], className)} {...props} />;
}
