import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface ScoutsNavigationItem {
  id?: string;
  label: ReactNode;
  href: string;
  current?: boolean;
}

type NavigationStyle = CSSProperties & {
  "--scouts-navigation-foreground"?: string;
  "--scouts-navigation-muted"?: string;
  "--scouts-navigation-highlight"?: string;
};

export function ScoutsNavigation({
  items,
  foreground,
  muted,
  highlight,
  highlightAll = false,
  label = "Navigation",
  className,
}: {
  items: readonly ScoutsNavigationItem[];
  foreground?: string;
  muted?: string;
  highlight?: string;
  highlightAll?: boolean;
  label?: string;
  className?: string;
}) {
  const style: NavigationStyle = {};

  if (foreground) style["--scouts-navigation-foreground"] = foreground;
  if (muted) style["--scouts-navigation-muted"] = muted;
  if (highlight) style["--scouts-navigation-highlight"] = highlight;

  return (
    <nav
      aria-label={label}
      className={cn("scouts-navigation", highlightAll && "scouts-navigation--highlight-all", className)}
      style={Object.keys(style).length > 0 ? style : undefined}
    >
      <ul className="scouts-navigation__list">
        {items.map((item) => (
          <li
            key={item.id ?? item.href}
            className={cn("scouts-navigation__item", item.current && "scouts-navigation__item--current")}
          >
            <Link
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className="scouts-navigation__link"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
