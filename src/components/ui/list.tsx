import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function ScoutsList({
  items,
  ordered = false,
  spaced = false,
  className,
}: {
  items: ReactNode[];
  ordered?: boolean;
  spaced?: boolean;
  className?: string;
}) {
  const List = ordered ? "ol" : "ul";
  return (
    <List
      className={cn(
        ordered ? "list-decimal" : "list-disc",
        "pl-6",
        spaced ? "space-y-3" : "space-y-1",
        className,
      )}
    >
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </List>
  );
}

export function UnstyledList({ className, ...props }: HTMLAttributes<HTMLUListElement>) {
  return <ul className={cn("list-none", className)} {...props} />;
}
