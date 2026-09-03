import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type TaskStatus = "complete" | "in-progress" | "not-started" | "assigned";

const STATUS_CLASSES: Record<TaskStatus, string> = {
  complete: "bg-scouts-green text-black",
  "in-progress": "bg-scouts-blue text-white",
  "not-started": "border-2 border-scouts-border bg-scouts-surface text-scouts-text",
  assigned: "bg-scouts-green text-black",
};

export interface TaskItem {
  id: string;
  name: string;
  href?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  status: TaskStatus;
  statusLabel?: string;
  actions?: ReactNode;
}

export function TaskList({ items, className }: { items: TaskItem[]; className?: string }) {
  return (
    <ul className={cn("divide-y divide-scouts-border-muted border-y border-scouts-border-muted", className)}>
      {items.map((item) => (
        <li key={item.id} className="grid gap-4 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {item.icon ? <span aria-hidden>{item.icon}</span> : null}
              {item.href ? (
                <Link href={item.href} className="font-bold text-scouts-link underline decoration-2 underline-offset-2 hover:text-scouts-link-hover">
                  {item.name}
                </Link>
              ) : (
                <span className="font-bold text-scouts-text">{item.name}</span>
              )}
            </div>
            {item.hint ? <p className="mt-1 text-sm text-scouts-muted">{item.hint}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            {item.actions}
            <span className={cn("inline-flex px-3 py-1 text-sm font-bold", STATUS_CLASSES[item.status])}>
              {item.statusLabel ?? item.status.replace("-", " ")}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
