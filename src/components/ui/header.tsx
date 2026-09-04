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
      className={cn(
        "scouts-header",
        logo && "scouts-header--with-logo",
        className,
      )}
      {...props}
    >
      <div className="scouts-header__content">
        <h1 className="scouts-header__title">{title}</h1>
        {subtitle ? <p className="scouts-header__subtitle">{subtitle}</p> : null}
      </div>
      {logo ? (
        <div className="scouts-header__logo">
          <ScoutsLogo inverse />
        </div>
      ) : null}
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
    1: "bg-scouts-primary-header text-scouts-primary-header-foreground",
    2: "border-b-2 border-scouts-grey bg-scouts-grey-light text-black",
    3: "border-b-2 border-scouts-primary bg-scouts-surface text-scouts-primary",
  };

  return (
    <div
      className={cn("scouts-header-bar", `scouts-header-bar--level-${level}`, levelClasses[level], className)}
      {...props}
    >
      {children}
    </div>
  );
}
