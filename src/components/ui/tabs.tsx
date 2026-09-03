"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export function Tabs({
  items,
  defaultValue,
  value: controlledValue,
  onChange,
  className,
}: {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  const baseId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? items[0]?.id);
  const value = controlledValue ?? uncontrolledValue;
  const active = items.find((item) => item.id === value) ?? items[0];

  function select(nextValue: string) {
    if (controlledValue === undefined) setUncontrolledValue(nextValue);
    onChange?.(nextValue);
  }

  if (!active) return null;

  return (
    <div className={cn("w-full", className)}>
      <div role="tablist" aria-label="Sections" className="flex flex-wrap border-b-2 border-scouts-purple">
        {items.map((item) => {
          const selected = item.id === active.id;
          return (
            <button
              key={item.id}
              id={`${baseId}-${item.id}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-${item.id}-panel`}
              disabled={item.disabled}
              onClick={() => select(item.id)}
              className={cn(
                "border-b-4 px-4 py-2 font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-scouts-purple focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50",
                selected
                  ? "border-scouts-purple bg-scouts-purple-light text-scouts-purple-dark"
                  : "border-transparent text-scouts-grey-dark hover:border-scouts-purple-light hover:text-scouts-purple",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        id={`${baseId}-${active.id}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-${active.id}-tab`}
        className="py-5"
      >
        {active.content}
      </div>
    </div>
  );
}
