import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export function Grid({ columns = 3, className, ...props }: HTMLAttributes<HTMLDivElement> & { columns?: 1 | 2 | 3 | 4 }) {
  const columnClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return <div className={cn("grid gap-5", columnClasses[columns], className)} {...props} />;
}

export function GridRow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-5", className)} {...props} />;
}
