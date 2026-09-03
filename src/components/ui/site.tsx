import type { CSSProperties, HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export const SCOUTS_COLOURS = [
  "purple",
  "teal",
  "red",
  "pink",
  "navy",
  "blue",
  "forest",
  "green",
  "orange",
  "yellow",
  "grey",
  "black",
  "white",
  "hotpink",
  "squirrels",
  "beavers",
  "cubs",
  "scouts",
  "explorers",
  "network",
  "adult",
  "dev",
] as const;

export type ScoutsColour = (typeof SCOUTS_COLOURS)[number];

type ScoutSiteStyle = CSSProperties & Record<`--${string}`, string>;

export interface ScoutSiteProps extends HTMLAttributes<HTMLDivElement> {
  /** The palette colour used by primary controls and accents. */
  primary?: ScoutsColour;
  /** The palette colour used by secondary controls and accents. */
  secondary?: ScoutsColour;
}

export function ScoutSite({
  primary = "purple",
  secondary = "teal",
  className,
  style,
  ...props
}: ScoutSiteProps) {
  const themeStyle: ScoutSiteStyle = {
    "--scouts-colour-primary": `var(--scouts-colour-${primary})`,
    "--scouts-colour-secondary": `var(--scouts-colour-${secondary})`,
    ...style,
  };

  return <div className={cn("scouts-site", className)} style={themeStyle} {...props} />;
}
