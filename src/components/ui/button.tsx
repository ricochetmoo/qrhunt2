import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "grey"
  | "ghost";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-scouts-primary text-scouts-primary-foreground hover:bg-scouts-primary-hover",
  secondary: "bg-scouts-secondary text-scouts-secondary-foreground hover:bg-scouts-secondary-hover",
  success: "bg-scouts-green text-black hover:bg-scouts-green-dark hover:text-white",
  info: "bg-scouts-blue text-white hover:bg-scouts-blue-dark",
  warning: "bg-scouts-orange text-black hover:bg-scouts-orange-dark hover:text-white",
  danger: "bg-scouts-red text-white hover:bg-scouts-red-dark",
  grey: "bg-scouts-grey text-black hover:bg-scouts-grey-dark hover:text-white",
  ghost: "border-transparent bg-transparent text-scouts-text hover:bg-scouts-grey-light",
};

const OUTLINE_CLASSES: Partial<Record<ButtonVariant, string>> = {
  primary: "border-scouts-primary bg-scouts-surface text-scouts-primary hover:bg-scouts-primary-pastel",
  secondary: "border-scouts-secondary bg-scouts-surface text-scouts-secondary hover:bg-scouts-secondary-pastel",
  success: "border-scouts-green bg-scouts-surface text-scouts-green-dark hover:bg-scouts-green-light",
  info: "border-scouts-blue bg-scouts-surface text-scouts-blue-dark hover:bg-scouts-blue-light",
  warning: "border-scouts-orange bg-scouts-surface text-scouts-orange-dark hover:bg-scouts-orange-light",
  danger: "border-scouts-red bg-scouts-surface text-scouts-red-dark hover:bg-scouts-red-light",
  grey: "border-scouts-grey-dark bg-scouts-surface text-scouts-grey-dark hover:bg-scouts-grey-light",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "px-2 py-1 text-sm",
  sm: "px-3 py-1.5 text-sm",
  md: "px-3 py-2 text-base",
  lg: "px-6 py-3 text-xl",
  xl: "px-7 py-4 text-2xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  outline?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  outline = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 border-2 border-transparent font-bold transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-scouts-focus focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        outline ? OUTLINE_CLASSES[variant] ?? VARIANT_CLASSES[variant] : VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}
