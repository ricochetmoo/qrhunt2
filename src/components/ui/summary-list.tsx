import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface SummaryListItem {
  label: ReactNode;
  value: ReactNode;
  action?: ReactNode;
}

export function SummaryList({ items, className }: { items: SummaryListItem[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-scouts-grey border-y border-scouts-grey", className)}>
      {items.map((item, index) => (
        <div key={index} className="grid gap-1 py-3 sm:grid-cols-[minmax(8rem,0.6fr)_1fr_auto] sm:items-center sm:gap-4">
          <dt className="font-bold text-black">{item.label}</dt>
          <dd className="text-black">{item.value}</dd>
          {item.action ? <dd className="sm:text-right">{item.action}</dd> : null}
        </div>
      ))}
    </dl>
  );
}
