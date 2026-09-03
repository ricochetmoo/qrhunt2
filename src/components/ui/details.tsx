import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Details({
  summary,
  children,
  className,
  ...props
}: { summary: ReactNode } & Omit<HTMLAttributes<HTMLDetailsElement>, "children"> & { children: ReactNode }) {
  return (
    <details className={cn("border-y border-scouts-grey py-3", className)} {...props}>
      <summary className="cursor-pointer font-bold text-scouts-purple underline decoration-2 underline-offset-2 marker:text-scouts-purple focus:outline-none focus-visible:ring-2 focus-visible:ring-scouts-purple">
        {summary}
      </summary>
      <div className="pt-3 text-base">{children}</div>
    </details>
  );
}

export function InsetText({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("my-5 border-l-4 border-scouts-purple bg-scouts-purple-light px-5 py-4 text-black", className)}
      {...props}
    >
      {children}
    </div>
  );
}
