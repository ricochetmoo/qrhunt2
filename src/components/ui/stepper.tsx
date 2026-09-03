"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";

export interface StepperStep {
  id: string;
  label: string;
}

export function Stepper({
  steps,
  currentStep = 0,
  onStepChange,
  className,
}: {
  steps: StepperStep[];
  currentStep?: number;
  onStepChange?: (index: number) => void;
  className?: string;
}) {
  const [activeStep, setActiveStep] = useState(currentStep);
  const selectedStep = onStepChange ? currentStep : activeStep;

  function selectStep(index: number) {
    if (!onStepChange) setActiveStep(index);
    onStepChange?.(index);
  }

  return (
    <nav aria-label="Progress" className={cn("overflow-x-auto bg-scouts-grey-light px-6 py-4", className)}>
      <ol className="flex min-w-max items-center gap-4">
        {steps.map((step, index) => {
          const active = index === selectedStep;
          const complete = index < selectedStep;

          return (
            <li key={step.id} className="flex items-center gap-3">
              {index > 0 ? <span className="h-px w-8 bg-scouts-purple/40" aria-hidden /> : null}
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => selectStep(index)}
                className={cn(
                  "flex items-center gap-2 font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-scouts-purple focus-visible:ring-offset-2",
                  active || complete ? "text-black" : "text-scouts-grey-dark",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm",
                    active
                      ? "border-scouts-purple bg-scouts-purple text-white"
                      : complete
                        ? "border-scouts-purple bg-white text-scouts-purple"
                        : "border-scouts-grey-dark bg-transparent text-scouts-grey-dark",
                  )}
                >
                  {index + 1}
                </span>
                <span>{step.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
