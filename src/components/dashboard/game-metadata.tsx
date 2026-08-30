"use client";

import type { Dashboard } from "@/server/admin/dashboard/types";
import { GAME_STATUS_LABELS, isGameStatus } from "@/lib/game-status";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";

type MetadataItemProps = {
  name: string;
  value: string;
  icon: IconName;
  show?: boolean;
};

function MetadataItem({ name, value, icon, show = true }: MetadataItemProps) {
  if (!show) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <DynamicIcon name={icon} className="h-3 w-3 text-slate-400" />
      <span className="text-xs uppercase tracking-wide text-slate-500">{name}</span>
      <span className="text-sm text-slate-900">{value}</span>
    </div>
  );
}

export function GameMetadata({ game }: { game: Dashboard["game"] }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
      <MetadataItem
        name="Status"
        value={isGameStatus(game.status) ? GAME_STATUS_LABELS[game.status] : game.status}
        icon="rocket"
      />
      <MetadataItem
        name="Pause reason"
        value={game.pauseReason ?? ""}
        icon="pause"
        show={!!game.pauseReason}
      />
      <MetadataItem name="Created" value={new Date(game.createdAt).toLocaleString()} icon="clock" />
      <MetadataItem name="Updated" value={new Date(game.updatedAt).toLocaleString()} icon="clock" />
    </div>
  );
}
