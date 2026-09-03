import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
}

export function Breadcrumbs({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${index}-${String(item.label)}`} className="inline-flex items-center gap-2">
            {index > 0 ? (
              <span className="text-scouts-muted" aria-hidden>
                /
              </span>
            ) : null}
            {item.href ? (
              <Link href={item.href} className="font-bold text-scouts-link underline decoration-2 underline-offset-2 hover:text-scouts-link-hover">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-bold text-scouts-text">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
