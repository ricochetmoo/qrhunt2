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
  primary: "border-scouts-primary",
  purple: "border-scouts-purple",
  secondary: "border-scouts-secondary",
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
  scouts: "border-scouts-scouts",
  explorers: "border-scouts-explorers",
  network: "border-scouts-network",
  adult: "border-scouts-adult",
};

const COUNT_CLASSES: Partial<Record<TagVariant, string>> = {
  primary: "bg-scouts-primary text-scouts-primary-foreground",
  secondary: "bg-scouts-secondary text-scouts-secondary-foreground",
  purple: "bg-scouts-purple text-white",
  teal: "bg-scouts-teal text-white",
  info: "bg-scouts-blue text-white",
  blue: "bg-scouts-blue text-white",
  success: "bg-scouts-green text-black",
  green: "bg-scouts-green text-black",
  warning: "bg-scouts-orange text-black",
  orange: "bg-scouts-orange text-black",
  danger: "bg-scouts-red text-white",
  red: "bg-scouts-red text-white",
  navy: "bg-scouts-navy text-white",
  forest: "bg-scouts-forest text-white",
  scouts: "bg-scouts-scouts text-scouts-scouts-foreground",
  explorers: "bg-scouts-explorers text-white",
  network: "bg-scouts-network text-white",
  adult: "bg-scouts-adult text-white",
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
                  "flex items-center justify-between gap-3 border-l-4 px-4 py-3 text-scouts-text transition-colors hover:bg-scouts-grey-light",
                  ACCENT_CLASSES[item.variant ?? "primary"] ?? "border-scouts-primary",
                  active && "bg-scouts-grey-light font-extrabold",
                  item.muted && "text-scouts-muted",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate">{item.label}</span>
                  {item.description ? <span className="block text-sm font-normal text-scouts-muted">{item.description}</span> : null}
                </span>
                {item.count !== undefined ? (
                  <span className={cn(
                    "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 text-sm font-bold",
                    COUNT_CLASSES[item.variant ?? "primary"] ?? "bg-scouts-grey-light text-scouts-text",
                  )}>
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
