import type { ElementType, HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export type HeadingSize = "xl" | "l" | "m" | "s";

const HEADING_CLASSES: Record<HeadingSize, string> = {
  xl: "text-5xl leading-none",
  l: "text-4xl leading-tight",
  m: "text-3xl leading-tight",
  s: "text-2xl leading-tight",
};

const DEFAULT_TAGS: Record<HeadingSize, ElementType> = {
  xl: "h1",
  l: "h2",
  m: "h3",
  s: "h4",
};

export interface ScoutsHeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  size?: HeadingSize;
  as?: ElementType;
}

export function ScoutsHeading({
  size = "l",
  as,
  className,
  ...props
}: ScoutsHeadingProps) {
  const Heading = as ?? DEFAULT_TAGS[size];

  return (
    <Heading
      className={cn("font-extrabold tracking-tight text-scouts-text", HEADING_CLASSES[size], className)}
      {...props}
    />
  );
}
