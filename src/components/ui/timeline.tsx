import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface TimelineItem {
  id: string;
  title: string;
  date: ReactNode;
  byline?: ReactNode;
  description?: ReactNode;
  variant?: "info" | "success" | "warning" | "danger";
}

const DOT_CLASSES = {
  info: "bg-scouts-blue",
  success: "bg-scouts-green",
  warning: "bg-scouts-orange",
  danger: "bg-scouts-red",
};

export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("relative", className)}>
      {items.map((item, index) => {
        const variant = item.variant ?? "info";
        return (
          <li key={item.id} className="relative pb-8 pl-8 last:pb-0">
            {index < items.length - 1 ? <span className="absolute left-[0.4rem] top-3 h-full w-0.5 bg-scouts-border-muted" aria-hidden /> : null}
            <span className={cn("absolute left-0 top-1 h-3 w-3 rounded-full ring-4 ring-scouts-surface", DOT_CLASSES[variant])} aria-hidden />
            <h3 className="text-xl font-extrabold text-scouts-text">{item.title}</h3>
            <p className="mt-1 text-sm text-scouts-muted">
              <time>{item.date}</time>
              {item.byline ? <> <span aria-hidden>by</span> {item.byline}</> : null}
            </p>
            {item.description ? <p className="mt-2 text-base text-scouts-text">{item.description}</p> : null}
          </li>
        );
      })}
    </ol>
  );
}
