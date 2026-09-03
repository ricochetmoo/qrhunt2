import Link from "next/link";

import { cn } from "@/lib/cn";
import type { TagVariant } from "./badge";

export interface SideNavItem {
  id: string;
  label: string;
  href: string;
  description?: string;
  count?: number;
  variant?: TagVariant;
  muted?: boolean;
}

const ACCENT_CLASSES: Partial<Record<TagVariant, string>> = {
  primary: "border-scouts-purple",
  purple: "border-scouts-purple",
  secondary: "border-scouts-teal",
  teal: "border-scouts-teal",
  info: "border-scouts-blue",
  blue: "border-scouts-blue",
  success: "border-scouts-green",
  green: "border-scouts-green",
  warning: "border-scouts-orange",
  orange: "border-scouts-orange",
  danger: "border-scouts-red",
  red: "border-scouts-red",
  navy: "border-scouts-navy",
  forest: "border-scouts-forest",
};

export function SideNav({ items, activeId, className }: { items: SideNavItem[]; activeId?: string; className?: string }) {
  return (
    <nav aria-label="Sections" className={className}>
      <ul className="space-y-1">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center justify-between gap-3 border-l-4 px-4 py-3 text-black transition-colors hover:bg-scouts-grey-light",
                  ACCENT_CLASSES[item.variant ?? "primary"] ?? "border-scouts-purple",
                  active && "bg-scouts-grey-light font-extrabold",
                  item.muted && "text-scouts-grey-dark",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate">{item.label}</span>
                  {item.description ? <span className="block text-sm font-normal text-scouts-grey-dark">{item.description}</span> : null}
                </span>
                {item.count !== undefined ? (
                  <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-scouts-grey-light px-1.5 text-sm font-bold">
                    {item.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
