"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";

export interface ButtonGroupItem {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface ButtonGroupProps {
  items: ButtonGroupItem[];
  ariaLabel: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ButtonGroup({
  items,
  ariaLabel,
  value: controlledValue,
  defaultValue,
  onChange,
  size = "md",
  className,
}: ButtonGroupProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? items[0]?.id);
  const value = controlledValue ?? uncontrolledValue;

  function select(nextValue: string) {
    if (controlledValue === undefined) setUncontrolledValue(nextValue);
    onChange?.(nextValue);
  }

  return (
    <div role="group" aria-label={ariaLabel} className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => {
        const selected = value === item.id;

        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={item.disabled}
            onClick={() => select(item.id)}
            className={cn(
              "inline-flex items-center gap-2 border-2 px-3 font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-scouts-purple focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
              size === "sm" && "py-1 text-sm",
              size === "md" && "py-2 text-base",
              size === "lg" && "px-5 py-3 text-xl",
              selected
                ? "border-scouts-purple bg-scouts-purple text-white"
                : "border-scouts-grey bg-white text-black hover:border-scouts-purple",
              item.count === 0 && !selected && "text-scouts-grey-dark",
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span
                className={cn(
                  "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs leading-5",
                  selected ? "bg-white text-scouts-purple" : "bg-scouts-grey-light text-black",
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
