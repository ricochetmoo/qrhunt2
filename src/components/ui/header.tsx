import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

import { ScoutsLogo } from "./logo";

export function ScoutsHeader({
  title,
  subtitle,
  logo = true,
  className,
  ...props
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  logo?: boolean;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, "title">) {
  return (
    <header
      className={cn("flex items-center justify-between gap-8 bg-scouts-purple px-6 py-8 text-white", className)}
      {...props}
    >
      <div>
        <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-lg text-white/85 sm:text-xl">{subtitle}</p> : null}
      </div>
      {logo ? <ScoutsLogo inverse className="hidden shrink-0 sm:inline-flex" /> : null}
    </header>
  );
}

export function HeaderBar({
  level = 1,
  children,
  className,
  ...props
}: { level?: 1 | 2 | 3 } & HTMLAttributes<HTMLDivElement>) {
  const levelClasses = {
    1: "bg-scouts-purple text-white",
    2: "bg-scouts-grey-light text-black",
    3: "border-b-2 border-scouts-purple bg-white text-scouts-purple",
  };

  return (
    <div className={cn("px-6 py-3", levelClasses[level], className)} {...props}>
      {children}
    </div>
  );
}
