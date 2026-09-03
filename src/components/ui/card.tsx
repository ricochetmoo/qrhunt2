import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border border-black bg-white p-5", className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-xl font-extrabold leading-tight text-black">{title}</h2>
        {description ? <p className="mt-1 text-sm text-scouts-grey-dark">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(className)} {...props} />;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-black pb-5">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-black">{title}</h1>
        {description ? <p className="mt-1 text-base text-scouts-grey-dark">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4", className)}>
      <h2 className="text-3xl font-extrabold tracking-tight text-black">{title}</h2>
      {description ? <p className="mt-1 text-base text-scouts-grey-dark">{description}</p> : null}
    </div>
  );
}
