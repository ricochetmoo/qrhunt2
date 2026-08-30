import { GAME_STATUS_LABELS, isGameStatus, type GameStatus } from "@/lib/game-status";
import { cn } from "@/lib/cn";

const STATUS_CLASSES: Record<GameStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  published: "bg-blue-100 text-blue-800",
  started: "bg-green-100 text-green-800",
  paused: "bg-amber-100 text-amber-800",
  finished: "bg-purple-100 text-purple-800",
  archived: "bg-slate-200 text-slate-500",
};

export function StatusBadge({ status }: { status: string }) {
  const known = isGameStatus(status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        known ? STATUS_CLASSES[status] : "bg-slate-100 text-slate-700",
      )}
    >
      {known ? GAME_STATUS_LABELS[status] : status}
    </span>
  );
}
