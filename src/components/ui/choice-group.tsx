"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/cn";

export interface ChoiceOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

export function RadioGroup({
  name,
  options,
  value: controlledValue,
  defaultValue,
  onChange,
  legend,
  className,
}: {
  name: string;
  options: ChoiceOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  legend: string;
  className?: string;
}) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
  const value = controlledValue ?? uncontrolledValue;
  const id = useId();

  return (
    <fieldset className={cn("space-y-3", className)}>
      <legend className="mb-2 text-base font-bold text-scouts-text">{legend}</legend>
      {options.map((option) => (
        <label key={option.value} htmlFor={`${id}-${option.value}`} className="flex cursor-pointer items-start gap-3">
          <input
            id={`${id}-${option.value}`}
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={option.disabled}
            onChange={() => {
              if (controlledValue === undefined) setUncontrolledValue(option.value);
              onChange?.(option.value);
            }}
            className="mt-1 h-5 w-5 accent-scouts-primary"
          />
          <span>
            <span className="block font-bold text-scouts-text">{option.label}</span>
            {option.hint ? <span className="block text-sm text-scouts-muted">{option.hint}</span> : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function CheckboxGroup({
  name,
  options,
  value: controlledValue,
  defaultValue = [],
  onChange,
  legend,
  className,
}: {
  name: string;
  options: ChoiceOption[];
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  legend: string;
  className?: string;
}) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = controlledValue ?? uncontrolledValue;
  const id = useId();

  function toggle(optionValue: string) {
    const next = value.includes(optionValue) ? value.filter((item) => item !== optionValue) : [...value, optionValue];
    if (controlledValue === undefined) setUncontrolledValue(next);
    onChange?.(next);
  }

  return (
    <fieldset className={cn("space-y-3", className)}>
      <legend className="mb-2 text-base font-bold text-scouts-text">{legend}</legend>
      {options.map((option) => (
        <label key={option.value} htmlFor={`${id}-${option.value}`} className="flex cursor-pointer items-start gap-3">
          <input
            id={`${id}-${option.value}`}
            type="checkbox"
            name={name}
            value={option.value}
            checked={value.includes(option.value)}
            disabled={option.disabled}
            onChange={() => toggle(option.value)}
            className="mt-1 h-5 w-5 accent-scouts-primary"
          />
          <span>
            <span className="block font-bold text-scouts-text">{option.label}</span>
            {option.hint ? <span className="block text-sm text-scouts-muted">{option.hint}</span> : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
