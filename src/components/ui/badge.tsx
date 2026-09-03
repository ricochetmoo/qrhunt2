import type { ReactNode } from "react";

import { GAME_STATUS_LABELS, isGameStatus, type GameStatus } from "@/lib/game-status";
import { cn } from "@/lib/cn";

const STATUS_CLASSES: Record<GameStatus, string> = {
  draft: "bg-scouts-grey-light text-scouts-grey-dark",
  published: "bg-scouts-blue-light text-scouts-blue-dark",
  started: "bg-scouts-green-light text-scouts-green-dark",
  paused: "bg-scouts-orange-light text-scouts-orange-dark",
  finished: "bg-scouts-primary-light text-scouts-primary-dark",
  archived: "bg-scouts-grey text-scouts-grey-dark",
};

export type TagVariant =
  | "primary"
  | "secondary"
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "purple"
  | "teal"
  | "red"
  | "navy"
  | "blue"
  | "forest"
  | "green"
  | "orange"
  | "yellow"
  | "pink"
  | "grey"
  | "black"
  | "white"
  | "squirrels"
  | "beavers"
  | "cubs"
  | "scouts"
  | "explorers"
  | "network"
  | "adult";

const TAG_CLASSES: Record<TagVariant, string> = {
  primary: "bg-scouts-primary text-scouts-primary-foreground",
  secondary: "bg-scouts-secondary text-scouts-secondary-foreground",
  success: "bg-scouts-green text-black",
  info: "bg-scouts-blue text-white",
  warning: "bg-scouts-orange text-black",
  danger: "bg-scouts-red text-white",
  purple: "bg-scouts-purple text-white",
  teal: "bg-scouts-teal text-white",
  red: "bg-scouts-red text-white",
  navy: "bg-scouts-navy text-white",
  blue: "bg-scouts-blue text-white",
  forest: "bg-scouts-forest text-white",
  green: "bg-scouts-green text-black",
  orange: "bg-scouts-orange text-black",
  yellow: "bg-scouts-yellow text-black",
  pink: "bg-scouts-pink text-black",
  grey: "bg-scouts-grey text-black",
  black: "bg-black text-white",
  white: "bg-white text-black ring-1 ring-black/15",
  squirrels: "bg-scouts-red text-white",
  beavers: "bg-scouts-blue text-white",
  cubs: "bg-scouts-green text-black",
  scouts: "bg-scouts-scouts text-scouts-scouts-foreground",
  explorers: "bg-scouts-orange text-black",
  network: "bg-scouts-network text-white",
  adult: "bg-scouts-adult text-white",
};

export interface TagProps {
  children: ReactNode;
  variant?: TagVariant;
  className?: string;
}

export function Tag({ children, variant = "primary", className }: TagProps) {
  return (
    <strong
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-sm font-bold leading-none",
        TAG_CLASSES[variant],
        className,
      )}
    >
      {children}
    </strong>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const known = isGameStatus(status);

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-xs font-bold leading-none",
        known ? STATUS_CLASSES[status] : "bg-scouts-grey-light text-scouts-grey-dark",
      )}
    >
      {known ? GAME_STATUS_LABELS[status] : status}
    </span>
  );
}
