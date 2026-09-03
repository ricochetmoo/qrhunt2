import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export interface ScoutsLogoProps extends HTMLAttributes<HTMLDivElement> {
  inverse?: boolean;
  showWordmark?: boolean;
}

export function ScoutsLogo({ inverse = false, showWordmark = false, className, ...props }: ScoutsLogoProps) {
  return (
    <div
      aria-label="Scouts"
      className={cn(
        "inline-flex items-center gap-2 font-extrabold",
        inverse ? "text-white" : "text-scouts-purple",
        className,
      )}
      {...props}
    >
      <span aria-hidden className="text-5xl leading-none">
        ⚜
      </span>
      {showWordmark ? <span className="text-xl tracking-tight">Scouts</span> : null}
    </div>
  );
}
